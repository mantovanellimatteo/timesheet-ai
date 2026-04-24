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

def evaluate_rules(row, rules):
    errors = []
    # Eval context
    allowed_globals = {"__builtins__": {}}
    allowed_locals = {"row": row, "str": str, "int": int, "float": float, "len": len, "abs": abs, "pd": pd}
    
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
        
        for index, row in df.iterrows():
            row_dict = row.to_dict()
            
            # Controllo Matematico
            errors = evaluate_rules(row_dict, rules)
            
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
                            "model": "gemma2:2b",
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

        return {"status": "success", "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate_rule")
async def generate_rule(payload: GenerateRuleInput):
    prompt = f"""Sei un programmatore Python. Il tuo unico compito è convertire la richiesta aziendale in una espressione booleana in Python.
La riga di un file excel è in un dizionario 'row'. Usa sempre 'str(row.get("NomeColonna", ""))' o 'float(row.get("NomeColonna", 0))'.

Richiesta: "{payload.natural_language}"

Regole ASSOLUTE:
1. Rispondi ESCLUSIVAMENTE con il codice Python, senza spiegazioni, senza markdown (niente ```), solo testo grezzo.
2. L'espressione deve restituire True se c'è un ERRORE (la regola è violata), False se la riga è corretta.

Esempio: Se 'Tipo' è 'Gettoni', 'Ore' deve essere multiplo di 0.25.
Risposta: str(row.get('Tipo')).upper() == 'GETTONI' and float(row.get('Ore', 0)) % 0.25 != 0

Ora converti questa richiesta: {payload.natural_language}
Risposta: """

    try:
        res = requests.post(f"http://{payload.ollama_ip}:11434/api/generate", json={
            "model": "gemma2:2b",
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

