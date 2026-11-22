import sqlite3
from contextlib import asynccontextmanager, closing

import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import config
from analysis import TimesheetError, analyze_timesheet
from rules_engine import RuleValidationError, compile_rules, validate_expression


def get_conn():
    conn = sqlite3.connect(config.DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with closing(get_conn()) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS advanced_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_name TEXT,
                expression TEXT,
                error_message TEXT,
                is_active INTEGER DEFAULT 1
            )
        ''')
        # Migrazione: aggiunge la colonna se la tabella esisteva già prima della V6
        columns = [col[1] for col in conn.execute("PRAGMA table_info(advanced_rules)")]
        if 'is_active' not in columns:
            conn.execute("ALTER TABLE advanced_rules ADD COLUMN is_active INTEGER DEFAULT 1")
        conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


class RuleInput(BaseModel):
    rule_name: str
    expression: str
    error_message: str
    is_active: bool = True


class GenerateRuleInput(BaseModel):
    natural_language: str
    ollama_ip: str = ""


def ollama_url_or_400(host):
    try:
        return config.resolve_ollama_url(host)
    except config.InvalidOllamaHost as e:
        raise HTTPException(status_code=400, detail=str(e))


def validate_rule_or_400(expression):
    try:
        validate_expression(expression)
    except RuleValidationError as e:
        raise HTTPException(status_code=400, detail=f"Espressione non valida: {e}")


# ---------------------------------------------------------------------------
# Regole
# ---------------------------------------------------------------------------

@app.get("/api/rules")
def get_rules():
    with closing(get_conn()) as conn:
        rules = [dict(r) for r in conn.execute("SELECT * FROM advanced_rules")]
    for r in rules:
        try:
            validate_expression(r["expression"])
            r["validation_error"] = None
        except RuleValidationError as e:
            r["validation_error"] = str(e)
    return {"rules": rules}


@app.post("/api/rules")
def add_rule(rule: RuleInput):
    validate_rule_or_400(rule.expression)
    with closing(get_conn()) as conn:
        cur = conn.execute(
            "INSERT INTO advanced_rules (rule_name, expression, error_message, is_active) VALUES (?, ?, ?, ?)",
            (rule.rule_name, rule.expression.strip(), rule.error_message, int(rule.is_active)),
        )
        conn.commit()
        return {"status": "success", "id": cur.lastrowid}


@app.put("/api/rules/{rule_id}")
def update_rule(rule_id: int, rule: RuleInput):
    # Una regola non valida può comunque essere disattivata (es. regole legacy con `pd`)
    if rule.is_active:
        validate_rule_or_400(rule.expression)
    with closing(get_conn()) as conn:
        cur = conn.execute(
            "UPDATE advanced_rules SET rule_name=?, expression=?, error_message=?, is_active=? WHERE id=?",
            (rule.rule_name, rule.expression.strip(), rule.error_message, int(rule.is_active), rule_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Regola non trovata")
    return {"status": "success"}


@app.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: int):
    with closing(get_conn()) as conn:
        conn.execute("DELETE FROM advanced_rules WHERE id=?", (rule_id,))
        conn.commit()
    return {"status": "success"}


# ---------------------------------------------------------------------------
# Upload e analisi
# ---------------------------------------------------------------------------

@app.post("/api/upload")
def upload_file(file: UploadFile = File(...), ollama_ip: str = Form("")):
    # Endpoint sincrono: FastAPI lo esegue in un thread pool, così pandas e la
    # chiamata a Ollama non bloccano l'event loop per gli altri utenti.
    ollama_url = ollama_url_or_400(ollama_ip)
    contents = file.file.read()

    with closing(get_conn()) as conn:
        rules = [dict(r) for r in conn.execute("SELECT * FROM advanced_rules WHERE is_active=1")]

    try:
        results, presence = analyze_timesheet(
            file.filename, contents, compile_rules(rules), ollama_url, config.OLLAMA_MODEL
        )
    except TimesheetError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante l'elaborazione: {e}")

    return {"status": "success", "data": results, "presence_summary": presence}


# ---------------------------------------------------------------------------
# Generatore regole IA
# ---------------------------------------------------------------------------

RULE_PROMPT = """Sei un esperto programmatore Python. Il tuo unico compito è convertire la richiesta aziendale in un'espressione logica Python.
Il dizionario 'row' rappresenta la singola riga analizzata.
La lista di dizionari 'rows' rappresenta TUTTE le righe del documento. Usala se devi calcolare somme o aggregazioni (usando le list comprehension).
Hai a disposizione la funzione speciale 'safe_float(valore)' che converte in automatico stringhe vuote o formati con la virgola (es. "3,5") in numeri float validi senza mai andare in crash.
Usa sempre 'str(row.get("NomeColonna", ""))' e 'safe_float(row.get("NomeColonna", 0))'. Evita KeyError.
Puoi usare SOLO: row, rows, safe_float, str, int, len, abs, sum, any, all, min, max, round e i metodi di stringa/dizionario (get, strip, upper, lower, startswith, endswith, replace, split). Niente import, niente lambda.

Richiesta dell'utente: "{request}"

Regole ASSOLUTE:
1. Rispondi ESCLUSIVAMENTE con il codice Python, senza spiegazioni, senza markdown (niente ```), solo testo grezzo.
2. L'espressione deve restituire True se c'è un ERRORE (la regola è violata), False se la riga è corretta.

Esempio 1 (Singola Riga): Se 'Tipo' è 'Gettoni', 'Ore' deve essere multiplo di 0.25.
Risposta: str(row.get('Tipo')).upper() == 'GETTONI' and safe_float(row.get('Ore')) % 0.25 != 0

Esempio 2 (Multi-Riga): Le ore totali in una giornata non possono superare 8 per uno stesso utente.
Risposta: sum(safe_float(r.get('Ore')) for r in rows if r.get('Data', '') == row.get('Data', '') and r.get('Utente', '') == row.get('Utente', '')) > 8

Ora converti la richiesta dell'utente: {request}
Risposta: """


@app.post("/api/generate_rule")
def generate_rule(payload: GenerateRuleInput):
    ollama_url = ollama_url_or_400(payload.ollama_ip)
    try:
        res = requests.post(ollama_url, json={
            "model": config.OLLAMA_MODEL,
            "prompt": RULE_PROMPT.format(request=payload.natural_language),
            "stream": False,
            "options": {"temperature": 0.0},
        }, timeout=90)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Ollama non raggiungibile: {e}")
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail="Errore dal server Ollama")

    ai_code = res.json().get("response", "").strip()
    ai_code = ai_code.replace("```python", "").replace("```", "").strip()
    try:
        validate_expression(ai_code)
        validation_error = None
    except RuleValidationError as e:
        validation_error = str(e)
    return {"status": "success", "expression": ai_code, "validation_error": validation_error}


app.mount("/", StaticFiles(directory="static", html=True), name="static")
