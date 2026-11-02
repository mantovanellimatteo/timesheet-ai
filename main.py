from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3
import pandas as pd
import requests
import io
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, date

# Inizializza il database SQLite
DB_NAME = "timesheet_rules.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Creazione della nuova tabella per le regole avanzate
    c.execute('''
        CREATE TABLE IF NOT EXISTS advanced_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_name TEXT,
            expression TEXT,
            error_message TEXT,
            is_active INTEGER DEFAULT 1
        )
    ''')
    
    # Migrazione sicura: aggiunge la colonna se la tabella esisteva già prima della V6
    c.execute("PRAGMA table_info(advanced_rules)")
    columns = [col[1] for col in c.fetchall()]
    if 'is_active' not in columns:
        c.execute("ALTER TABLE advanced_rules ADD COLUMN is_active INTEGER DEFAULT 1")
        
    conn.commit()
    conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

# Pydantic models per l'API
class RuleInput(BaseModel):
    rule_name: str
    expression: str
    error_message: str
    is_active: bool = True

class RuleUpdate(BaseModel):
    rule_name: str
    expression: str
    error_message: str
    is_active: bool

class GenerateRuleInput(BaseModel):
    natural_language: str
    ollama_ip: str

@app.get("/api/rules")
def get_rules():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM advanced_rules")
        rules = [dict(row) for row in c.fetchall()]
    except:
        rules = []
    conn.close()
    return {"rules": rules}

@app.post("/api/rules")
def add_rule(rule: RuleInput):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        INSERT INTO advanced_rules (rule_name, expression, error_message, is_active)
        VALUES (?, ?, ?, ?)
    ''', (rule.rule_name, rule.expression, rule.error_message, 1 if rule.is_active else 0))
    conn.commit()
    rule_id = c.lastrowid
    conn.close()
    return {"status": "success", "id": rule_id}

@app.put("/api/rules/{rule_id}")
def update_rule(rule_id: int, rule: RuleUpdate):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        UPDATE advanced_rules 
        SET rule_name=?, expression=?, error_message=?, is_active=? 
        WHERE id=?
    ''', (rule.rule_name, rule.expression, rule.error_message, 1 if rule.is_active else 0, rule_id))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: int):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM advanced_rules WHERE id=?", (rule_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

def safe_float(val):
    try:
        if isinstance(val, str):
            val = val.replace(',', '.').strip()
            if not val:
                return 0.0
        return float(val)
    except:
        return 0.0

def evaluate_rules(row, rules, all_rows):
    errors = []
    # Eval context: usiamo globals perché le list comprehension non risolvono variabili dai locals in eval()
    allowed_globals = {
        "__builtins__": {},
        "row": row, 
        "rows": all_rows, 
        "str": str, "int": int, "float": safe_float, "len": len, "abs": abs, "sum": sum, "any": any, "all": all, "pd": pd,
        "safe_float": safe_float
    }
    allowed_locals = {}
    
    for r in rules:
        expr = r['expression']
        msg = r['error_message']
        try:
            # Evaluate expression to see if it's an error (True = Error)
            result = eval(expr, allowed_globals, allowed_locals)
            if result is True:
                errors.append(msg)
        except Exception as e:
            errors.append(f"Regola '{r['rule_name']}' non valida: {str(e)}")
            
    return errors

def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d', '%d/%m/%y', '%y-%m-%d', '%y/%m/%d'):
        try:
            return datetime.strptime(str(date_str).strip(), fmt).date()
        except ValueError:
            continue
    return None

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), ollama_ip: str = "127.0.0.1"):
    try:
        contents = await file.read()
        filename_lower = file.filename.lower()
        if filename_lower.endswith('.csv'):
            # Prova vari separatori e vari encoding tipici dei CSV italiani (Windows)
            encodings = ['utf-8', 'iso-8859-1', 'cp1252']
            df = None
            for enc in encodings:
                try:
                    df = pd.read_csv(io.BytesIO(contents), sep=';', encoding=enc)
                    if len(df.columns) < 2:
                        df = pd.read_csv(io.BytesIO(contents), sep=',', encoding=enc)
                    break
                except Exception:
                    continue
            
            if df is None:
                # Fallback disperato
                df = pd.read_csv(io.BytesIO(contents), sep=';', encoding='utf-8', errors='replace')
                
        elif filename_lower.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Formato non supportato. Carica un CSV o Excel.")

        # Riempi NaN
        df = df.fillna('')
        
        # Normalizzazione drastica dei nomi delle colonne
        # Molti gestionali inseriscono "\n" (a capo) nei titoli delle colonne, rendendo impossibile fare row.get("Nome Colonna")
        # 1. Sostituiamo gli "a capo" con uno spazio
        df.columns = df.columns.str.replace(r'[\r\n]+', ' ', regex=True)
        # 2. Rimuoviamo spazi doppi accidentali e spazi all'inizio/fine
        df.columns = df.columns.str.replace(r'\s+', ' ', regex=True).str.strip()

        # Identifica colonna Data
        date_col = None
        for col in ['Data', 'Giorno', 'Data Evasione']:
            if col in df.columns:
                date_col = col
                break
        if not date_col:
            date_cols = [c for c in df.columns if 'data' in c.lower()]
            if date_cols:
                date_col = date_cols[0]

        # Filtra righe di separatore / intestazione gruppo (es. "Responsabile Attività - ...", "Data Evasione - ...")
        # Tipiche delle esportazioni Smeup / ERP dove una riga non contiene registrazioni effettive
        if date_col:
            def is_separator_row(row):
                val = str(row[date_col]).strip()
                if val.startswith(('Responsabile Attività -', 'Data Evasione -', 'Responsabile -', 'Data -')):
                    return True
                ore_val = str(row.get('Consuntivo Ore', row.get('Ore', ''))).strip()
                commessa_val = str(row.get('Commessa', '')).strip()
                ts_val = str(row.get('Numero TimeSheet', row.get('Numero Timesheet', ''))).strip()
                # Se mancano contemporaneamente Ore, Commessa e Numero TimeSheet, non è una registrazione valida
                if not ore_val and not commessa_val and not ts_val:
                    return True
                return False
            df = df[~df.apply(is_separator_row, axis=1)].reset_index(drop=True)

        # Gestione doppia colonna Account (es. Account codice e Account.1 ragione sociale)
        if 'Account.1' in df.columns:
            df['Account_Codice'] = df['Account']
            df['Account'] = df.apply(lambda r: str(r['Account.1']).strip() if str(r['Account.1']).strip() else str(r['Account']).strip(), axis=1)

        # Se esiste la colonna 'Nota' ma non 'Descrizione', copiamo in 'Descrizione' per garantire compatibilità con regole e IA
        if 'Nota' in df.columns and 'Descrizione' not in df.columns:
            df['Descrizione'] = df['Nota']
        
        # Carica regole
        conn = sqlite3.connect(DB_NAME)
        conn.row_factory = sqlite3.Row
        try:
            rules = [dict(r) for r in conn.cursor().execute("SELECT * FROM advanced_rules WHERE is_active=1").fetchall()]
        except:
            rules = []
        conn.close()

        results = []
        ollama_url = f"http://{ollama_ip}:11434/api/generate"
        
        # Prepariamo l'intero set di righe per il cross-row validation
        all_rows_for_eval = df.to_dict('records')
        
        for index, row in df.iterrows():
            row_dict = row.to_dict()
            
            # Controllo Matematico (Cross-Row supportato)
            errors = evaluate_rules(row_dict, rules, all_rows_for_eval)
            
            ai_warning = ""
            if len(errors) == 0:
                # Eseguiamo il controllo IA se la descrizione esiste
                descrizione = row_dict.get("Descrizione", "")
                commessa = row_dict.get("Commessa", "")
                
                if descrizione:
                    prompt = f"""Analizza questo inserimento di timesheet (Commessa: {commessa}). Descrizione: "{descrizione}". 
È professionale e non vaga? Rispondi SOLO 'OK' se va bene, altrimenti scrivi un avviso di max 10 parole."""
                    try:
                        res = requests.post(ollama_url, json={
                            "model": "gemma4:e2b",
                            "prompt": prompt,
                            "stream": False,
                            "options": {"temperature": 0.1}
                        }, timeout=60)
                        if res.status_code == 200:
                            ai_resp = res.json().get("response", "").strip()
                            if ai_resp.upper() != "OK" and not ai_resp.upper().startswith("OK."):
                                ai_warning = ai_resp
                    except Exception as e:
                        ai_warning = f"Errore connessione IA"

            row_dict['_Errore_Logico'] = " | ".join(errors) if errors else ""
            row_dict['_Avviso_IA'] = ai_warning
            results.append(row_dict)

        # Rilevamento giorni lavorativi mancanti
        date_col = None
        for col in ['Data', 'Giorno', 'Data Evasione']:
            if col in df.columns:
                date_col = col
                break
        if not date_col:
            date_cols = [c for c in df.columns if 'data' in c.lower()]
            if date_cols:
                date_col = date_cols[0]

        user_col = None
        for col in ['Responsabile Attività', 'Tecnico', 'Collaboratore', 'Utente', 'Risorsa', 'Nome']:
            if col in df.columns:
                user_col = col
                break
        if not user_col:
            user_cols = [c for c in df.columns if any(x in c.lower() for x in ['responsabile attivit', 'tecnico', 'collaboratore', 'utente', 'risorsa', 'nome'])]
            if user_cols:
                user_col = user_cols[0]

        if date_col and not user_col:
            # Fallback per file monoutente privi di colonna Collaboratore
            user_col = 'Collaboratore'
            df[user_col] = 'Dipendente'
            for r in results:
                r[user_col] = 'Dipendente'

        if date_col and user_col:
            parsed_dates = {}
            unique_users = set()
            user_dates = {}
            
            for r in results:
                d_str = str(r.get(date_col, '')).strip()
                u_str = str(r.get(user_col, '')).strip()
                if u_str:
                    unique_users.add(u_str)
                    if u_str not in user_dates:
                        user_dates[u_str] = set()
                
                d_obj = parse_date(d_str)
                if d_obj:
                    parsed_dates[d_str] = d_obj
                    if u_str:
                        user_dates[u_str].add(d_obj)
            
            if parsed_dates and unique_users:
                min_date = min(parsed_dates.values())
                max_date = max(parsed_dates.values())
                
                # Genera tutti i giorni lavorativi nel range
                all_working_days = []
                curr = min_date
                while curr <= max_date:
                    if curr.weekday() < 5:  # Lun-Ven
                        all_working_days.append(curr)
                    curr += timedelta(days=1)
                
                # Indovina il formato dal primo elemento di parsed_dates
                sample_format = "%d/%m/%Y"
                if parsed_dates:
                    first_k = list(parsed_dates.keys())[0]
                    if "/" in first_k:
                        parts = first_k.split("/")
                        if len(parts[0]) == 4:
                            sample_format = "%Y/%m/%d"
                        else:
                            sample_format = "%d/%m/%Y"
                    elif "-" in first_k:
                        parts = first_k.split("-")
                        if len(parts[0]) == 4:
                            sample_format = "%Y-%m-%d"
                        else:
                            sample_format = "%d-%m-%Y"
                
                virtual_rows = []
                for user in unique_users:
                    logged_days = user_dates.get(user, set())
                    for w_day in all_working_days:
                        if w_day not in logged_days:
                            # Crea riga virtuale
                            v_row = {col: "" for col in df.columns}
                            date_str = w_day.strftime(sample_format)
                            v_row[date_col] = date_str
                            v_row[user_col] = user
                            v_row['_Errore_Logico'] = "Mancano le ore per questo giorno lavorativo!"
                            v_row['_Avviso_IA'] = ""
                            virtual_rows.append(v_row)
                
                results.extend(virtual_rows)
                
                # Ordina cronologicamente
                def get_sort_key(r):
                    d_str = r.get(date_col, '')
                    d_obj = parse_date(d_str)
                    d_key = d_obj if d_obj else date.min
                    u_key = r.get(user_col, '')
                    return (d_key, u_key)
                
                results.sort(key=get_sort_key)

        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate_rule")
async def generate_rule(payload: GenerateRuleInput):
    prompt = f"""Sei un esperto programmatore Python. Il tuo unico compito è convertire la richiesta aziendale in un'espressione logica Python.
Il dizionario 'row' rappresenta la singola riga analizzata.
La lista di dizionari 'rows' rappresenta TUTTE le righe del documento. Usala se devi calcolare somme o aggregazioni (usando le list comprehension).
Hai a disposizione la funzione speciale 'safe_float(valore)' che converte in automatico stringhe vuote o formati con la virgola (es. "3,5") in numeri float validi senza mai andare in crash.
Usa sempre 'str(row.get("NomeColonna", ""))' e 'safe_float(row.get("NomeColonna", 0))'. Evita KeyError.

Richiesta dell'utente: "{payload.natural_language}"

Regole ASSOLUTE:
1. Rispondi ESCLUSIVAMENTE con il codice Python, senza spiegazioni, senza markdown (niente ```), solo testo grezzo.
2. L'espressione deve restituire True se c'è un ERRORE (la regola è violata), False se la riga è corretta.

Esempio 1 (Singola Riga): Se 'Tipo' è 'Gettoni', 'Ore' deve essere multiplo di 0.25.
Risposta: str(row.get('Tipo')).upper() == 'GETTONI' and safe_float(row.get('Ore')) % 0.25 != 0

Esempio 2 (Multi-Riga): Le ore totali in una giornata non possono superare 8 per uno stesso utente.
Risposta: sum(safe_float(r.get('Ore')) for r in rows if r.get('Data', '') == row.get('Data', '') and r.get('Utente', '') == row.get('Utente', '')) > 8

Ora converti la richiesta dell'utente: {payload.natural_language}
Risposta: """

    try:
        res = requests.post(f"http://{payload.ollama_ip}:11434/api/generate", json={
            "model": "gemma4:e2b",
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.0}
        }, timeout=90)
        
        if res.status_code == 200:
            ai_code = res.json().get("response", "").strip()
            ai_code = ai_code.replace("```python", "").replace("```", "").strip()
            return {"status": "success", "expression": ai_code}
        else:
            raise HTTPException(status_code=500, detail="Errore dal server Ollama")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files
app.mount("/", StaticFiles(directory="static", html=True), name="static")

