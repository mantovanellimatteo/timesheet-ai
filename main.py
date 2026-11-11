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

def evaluate_native_rules(row):
    """Regole di business aziendali preconfigurate e ottimizzate nativamente."""
    errors = []
    
    # 1. Controllo Gettoni: il consuntivo ore per attività a gettone deve essere multiplo di 0,25h (15 min)
    gruppo = str(row.get('Gruppo TimeSheet') or row.get('Gruppo Timesheet') or '').strip().upper()
    if 'GETTONI' in gruppo or 'GETTONE' in gruppo:
        ore = safe_float(row.get('Consuntivo Ore') or row.get('Ore') or 0)
        if ore > 0 and abs((ore * 4) - round(ore * 4)) > 0.01:
            errors.append("Ore gettone non conformi: devono essere multipli di 0,25h (15 min)")
            
    # 2. Controllo Fuori Orario Lavorativo
    tipo_orario = str(row.get('Tipo Orario') or '').strip().lower()
    if 'fuori orario' in tipo_orario:
        errors.append("Attività registrata come Fuori orario lavorativo")
        
    return errors

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
                # Considera separatore solo se quasi tutti i campi della riga sono vuoti
                non_empty = [str(v).strip() for v in row.values if str(v).strip()]
                if len(non_empty) <= 1:
                    return True
                return False
            df = df[~df.apply(is_separator_row, axis=1)].reset_index(drop=True)

        if len(df) == 0:
            raise HTTPException(status_code=400, detail="Nessun dato valido trovato nel file caricato.")

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
        
        vague_terms = {
            'varie', 'test', 'supporto', 'assistenza', 'meeting', 'call', 'chiamata',
            'allineamento', 'task', 'cose varie', 'sviluppo', 'attività', 'attivita',
            'help', 'help desk', 'helpdesk', 'ticket', 'chiusura ticket', 'lavori vari'
        }

        # Prima passata: Regole native, matematiche e Analisi Euristica Immediata delle descrizioni
        ambiguous_candidates = {}  # desc_str -> [list of indices in results]
        for index, row in df.iterrows():
            row_dict = row.to_dict()
            
            # Controllo Matematico (Regole Native + eventuali regole custom attive)
            errors = evaluate_native_rules(row_dict)
            if rules:
                errors.extend(evaluate_rules(row_dict, rules, all_rows_for_eval))
            row_dict['_Errore_Logico'] = " | ".join(errors) if errors else ""
            row_dict['_Avviso_IA'] = ""
            
            if len(errors) == 0:
                descrizione = str(row_dict.get("Descrizione", "")).strip()
                if descrizione:
                    d_lower = descrizione.lower()
                    if len(descrizione) < 4:
                        row_dict['_Avviso_IA'] = "Descrizione troppo sintetica"
                    elif d_lower in vague_terms:
                        row_dict['_Avviso_IA'] = f"Descrizione generica ('{descrizione}'): specificare il dettaglio"
                    elif len(descrizione) <= 35:
                        # Candidata per verifica mirata batch con IA
                        if descrizione not in ambiguous_candidates:
                            ambiguous_candidates[descrizione] = []
                        ambiguous_candidates[descrizione].append(len(results))

            results.append(row_dict)

        # Seconda passata: Singola chiamata batch AI (max 5 descrizioni uniche con timeout rapido)
        # Sostituisce il vecchio loop sequenziale riga-per-riga che bloccava l'app per decine di minuti
        if ambiguous_candidates:
            unique_to_check = list(ambiguous_candidates.keys())[:5]
            prompt_items = "\n".join([f"{i+1}: {d}" for i, d in enumerate(unique_to_check)])
            batch_prompt = f"""Valuta queste descrizioni di timesheet. Per ciascuna rispondi "OK" se descrive adeguatamente un'attività professionale, oppure un avviso di max 5 parole se troppo vaga o priva di contesto:
{prompt_items}

Rispondi ESCLUSIVAMENTE in formato JSON con chiavi numeriche:
{{"1": "...", "2": "..."}}"""

            try:
                res = requests.post(ollama_url, json={
                    "model": "gemma4:e2b",
                    "prompt": batch_prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.1, "num_predict": 100}
                }, timeout=8)
                if res.status_code == 200:
                    import json
                    raw_resp = res.json().get("response", "").strip()
                    parsed_eval = json.loads(raw_resp)
                    for i, d in enumerate(unique_to_check):
                        val = str(parsed_eval.get(str(i+1), "")).strip()
                        if val and val.upper() != "OK" and not val.upper().startswith("OK."):
                            for r_idx in ambiguous_candidates[d]:
                                results[r_idx]['_Avviso_IA'] = val
            except Exception:
                # Se Ollama non è raggiungibile o va in timeout, l'upload prosegue istantaneamente senza bloccarsi
                pass

        # Rilevamento presenza, conformità 8h/giorno e context switching
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

        presence_summary = {
            "working_days": [],
            "users": [],
            "global_metrics": {
                "total_users": 0,
                "total_hours": 0.0,
                "working_days_count": 0,
                "total_ok_days": 0,
                "total_partial_days": 0,
                "total_missing_days": 0,
                "total_missing_hours": 0.0,
                "total_non_billable_hours": 0.0,
                "avg_context_switching": 0.0
            }
        }

        if date_col and user_col:
            parsed_dates = {}
            unique_users = []
            user_day_rows = {}      # (user, date_obj) -> [list of indices in results]
            user_day_hours = {}     # (user, date_obj) -> float
            user_day_accounts = {}  # (user, date_obj) -> set of account names
            
            for idx, r in enumerate(results):
                d_str = str(r.get(date_col, '')).strip()
                u_str = str(r.get(user_col, '')).strip()
                if u_str and u_str not in unique_users:
                    unique_users.append(u_str)
                
                d_obj = parse_date(d_str)
                if d_obj:
                    parsed_dates[d_str] = d_obj
                    if u_str:
                        key = (u_str, d_obj)
                        if key not in user_day_rows:
                            user_day_rows[key] = []
                            user_day_hours[key] = 0.0
                            user_day_accounts[key] = set()
                        user_day_rows[key].append(idx)
                        
                        ore = safe_float(r.get('Consuntivo Ore') or r.get('Ore') or 0)
                        user_day_hours[key] += ore
                        acc = str(r.get('Account') or r.get('Commessa') or '').strip()
                        if acc:
                            user_day_accounts[key].add(acc)
            
            if parsed_dates and unique_users:
                min_date = min(parsed_dates.values())
                max_date = max(parsed_dates.values())
                
                # Protezione: intervallo <= 90 giorni
                if 0 <= (max_date - min_date).days <= 90:
                    all_working_days = []
                    curr = min_date
                    while curr <= max_date:
                        if curr.weekday() < 5:  # Lun-Ven
                            all_working_days.append(curr)
                        curr += timedelta(days=1)
                    
                    sample_format = "%d/%m/%Y"
                    first_k = list(parsed_dates.keys())[0]
                    if "/" in first_k and len(first_k.split("/")[0]) == 4:
                        sample_format = "%Y/%m/%d"
                    elif "-" in first_k:
                        sample_format = "%Y-%m-%d" if len(first_k.split("-")[0]) == 4 else "%d-%m-%Y"
                    
                    presence_summary["working_days"] = [w.strftime(sample_format) for w in all_working_days]
                    presence_summary["global_metrics"]["working_days_count"] = len(all_working_days)
                    presence_summary["global_metrics"]["total_users"] = len(unique_users)
                    
                    virtual_rows = []
                    users_summary_list = []
                    
                    total_all_hours = 0.0
                    total_missing_hours = 0.0
                    total_ok_days = 0
                    total_partial_days = 0
                    total_missing_days = 0
                    all_technician_switches = []
                    
                    for user in unique_users:
                        user_days_dict = {}
                        user_total_hours = 0.0
                        user_ok = 0
                        user_partial = 0
                        user_missing = 0
                        user_unique_accounts = set()
                        user_switches_list = []
                        
                        for w_day in all_working_days:
                            d_str = w_day.strftime(sample_format)
                            key = (user, w_day)
                            hrs = round(user_day_hours.get(key, 0.0), 2)
                            user_total_hours += hrs
                            
                            accounts_set = user_day_accounts.get(key, set())
                            for acc in accounts_set:
                                user_unique_accounts.add(acc)
                            if accounts_set:
                                user_switches_list.append(len(accounts_set))
                            
                            if hrs == 0:
                                # Giornata lavorativa completamente assente (0h su 8h)
                                user_missing += 1
                                total_missing_days += 1
                                total_missing_hours += 8.0
                                user_days_dict[d_str] = {
                                    "hours": 0.0,
                                    "status": "missing",
                                    "missing_hours": 8.0,
                                    "accounts_count": 0,
                                    "entries_count": 0
                                }
                                # Crea riga virtuale
                                v_row = {col: "" for col in df.columns}
                                v_row[date_col] = d_str
                                v_row[user_col] = user
                                v_row['_Errore_Logico'] = "Mancano le ore per questo giorno lavorativo! (0h su 8h)"
                                v_row['_Avviso_IA'] = ""
                                virtual_rows.append(v_row)
                            elif hrs < 8.0:
                                # Giornata parziale/incompleta (< 8h)
                                user_partial += 1
                                total_partial_days += 1
                                miss = round(8.0 - hrs, 2)
                                total_missing_hours += miss
                                user_days_dict[d_str] = {
                                    "hours": hrs,
                                    "status": "partial",
                                    "missing_hours": miss,
                                    "accounts_count": len(accounts_set),
                                    "entries_count": len(user_day_rows.get(key, []))
                                }
                                # Aggiunge segnalazione sulle righe effettive di quel giorno
                                partial_msg = f"Giornata incompleta: registrate {hrs:g}h su 8h previste (mancano {miss:g}h)"
                                for r_idx in user_day_rows.get(key, []):
                                    existing = results[r_idx]['_Errore_Logico']
                                    results[r_idx]['_Errore_Logico'] = (existing + " | " + partial_msg) if existing else partial_msg
                            else:
                                # Giornata completa (>= 8h)
                                user_ok += 1
                                total_ok_days += 1
                                user_days_dict[d_str] = {
                                    "hours": hrs,
                                    "status": "ok",
                                    "missing_hours": 0.0,
                                    "accounts_count": len(accounts_set),
                                    "entries_count": len(user_day_rows.get(key, []))
                                }
                        
                        total_all_hours += user_total_hours
                        avg_sw = round(sum(user_switches_list) / len(user_switches_list), 1) if user_switches_list else 0.0
                        if user_switches_list:
                            all_technician_switches.extend(user_switches_list)
                            
                        users_summary_list.append({
                            "user": user,
                            "total_hours": round(user_total_hours, 2),
                            "days": user_days_dict,
                            "status_counts": {
                                "ok": user_ok,
                                "partial": user_partial,
                                "missing": user_missing
                            },
                            "context_switching": {
                                "avg_accounts_per_day": avg_sw,
                                "total_unique_accounts": len(user_unique_accounts),
                                "level": "high" if avg_sw >= 5.0 else ("medium" if avg_sw >= 3.0 else "low")
                            }
                        })
                    
                    results.extend(virtual_rows)
                    
                    # Ordina utenti: prima chi ha più giorni mancanti o incompleti
                    presence_summary["users"] = sorted(users_summary_list, key=lambda x: (x["status_counts"]["missing"], x["status_counts"]["partial"]), reverse=True)
                    presence_summary["global_metrics"]["total_hours"] = round(total_all_hours, 2)
                    presence_summary["global_metrics"]["total_ok_days"] = total_ok_days
                    presence_summary["global_metrics"]["total_partial_days"] = total_partial_days
                    presence_summary["global_metrics"]["total_missing_days"] = total_missing_days
                    presence_summary["global_metrics"]["total_missing_hours"] = round(total_missing_hours, 2)
                    presence_summary["global_metrics"]["avg_context_switching"] = round(sum(all_technician_switches) / len(all_technician_switches), 1) if all_technician_switches else 0.0
                
                # Ordina cronologicamente
                def get_sort_key(r):
                    d_str = r.get(date_col, '')
                    d_obj = parse_date(d_str)
                    d_key = d_obj if d_obj else date.min
                    u_key = r.get(user_col, '')
                    return (d_key, u_key)
                
                results.sort(key=get_sort_key)

        return {"status": "success", "data": results, "presence_summary": presence_summary}
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

