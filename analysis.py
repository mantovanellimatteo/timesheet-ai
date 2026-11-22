"""Analisi dei timesheet: lettura file, controlli, presenze e context switching."""
import io
import json
import re
import unicodedata
from datetime import date, datetime, timedelta

import pandas as pd
import requests

from rules_engine import evaluate_rules, safe_float
from workcalendar import WorkCalendar

MAX_PERIOD_DAYS = 90
AI_MAX_DESCRIPTIONS = 5
AI_TIMEOUT_SECONDS = 8
CONFIRMED_STATUS = '80'  # Stato TimeSheet confermato (10 = bozza / non confermato)

DATE_COLUMNS = ['Data', 'Giorno', 'Data Evasione']
USER_COLUMNS = ['Responsabile Attività', 'Tecnico', 'Collaboratore', 'Utente', 'Risorsa', 'Nome']
USER_COLUMN_HINTS = ['responsabile attivit', 'tecnico', 'collaboratore', 'utente', 'risorsa', 'nome']
SEPARATOR_PREFIXES = ('Responsabile Attività -', 'Data Evasione -', 'Responsabile -', 'Data -')

# Categorie di attività
CLIENTE = 'Cliente'
INTERNO = 'Interno'
ASSENZA = 'Assenza'
ABSENCE_CODES = {'AFE', 'AMA'}            # Commesse di assenza (ferie, malattia, ...)
INTERNAL_COMMESSA_PREFIXES = ('IC-', 'FOR-')
OTHER_INTERNAL = 'Altre attività interne'

VAGUE_TERMS = {
    'varie', 'test', 'supporto', 'assistenza', 'meeting', 'call', 'chiamata',
    'allineamento', 'task', 'cose varie', 'sviluppo', 'attività', 'attivita',
    'help', 'help desk', 'helpdesk', 'ticket', 'chiusura ticket', 'lavori vari'
}

SHARED_NOTE_SIMILARITY = 0.6  # soglia similarità note per riconoscere interventi condivisi
BILLABLE_FLAG = 'DA ADDEBITARE'

# Soglie Context Switching (percentuale): <=50 verde, <=70 ambra, >70 rosso
CS_MEDIUM_THRESHOLD = 50.0
CS_HIGH_THRESHOLD = 70.0


class TimesheetError(ValueError):
    """Errore di contenuto del file (restituito al client come 400)."""


# ---------------------------------------------------------------------------
# Lettura e normalizzazione
# ---------------------------------------------------------------------------

def read_dataframe(filename, contents):
    """Legge CSV/Excel mantenendo tutti i valori come testo, così i codici
    (es. Agenda '0004308911', Account '032583') non perdono gli zeri iniziali."""
    name = (filename or '').lower()
    if name.endswith('.csv'):
        for enc in ('utf-8', 'iso-8859-1', 'cp1252'):
            try:
                df = pd.read_csv(io.BytesIO(contents), sep=';', encoding=enc, dtype=str)
                if len(df.columns) < 2:
                    df = pd.read_csv(io.BytesIO(contents), sep=',', encoding=enc, dtype=str)
                return df
            except Exception:
                continue
        return pd.read_csv(io.BytesIO(contents), sep=';', encoding='utf-8',
                           encoding_errors='replace', dtype=str)
    if name.endswith(('.xls', '.xlsx')):
        return pd.read_excel(io.BytesIO(contents), dtype=str)
    raise TimesheetError("Formato non supportato. Carica un CSV o Excel.")


def find_date_column(columns):
    for col in DATE_COLUMNS:
        if col in columns:
            return col
    return next((c for c in columns if 'data' in c.lower()), None)


def find_user_column(columns):
    for col in USER_COLUMNS:
        if col in columns:
            return col
    return next((c for c in columns if any(h in c.lower() for h in USER_COLUMN_HINTS)), None)


def normalize_dataframe(df):
    df = df.fillna('')
    # Molti gestionali inseriscono "a capo" e spazi multipli nei titoli delle colonne
    df.columns = (
        df.columns.astype(str)
        .str.replace(r'[\r\n]+', ' ', regex=True)
        .str.replace(r'\s+', ' ', regex=True)
        .str.strip()
    )
    df = df.apply(lambda col: col.astype(str).str.strip())

    date_col = find_date_column(df.columns)
    if date_col:
        def is_separator_row(row):
            val = str(row[date_col]).strip()
            if val.startswith(SEPARATOR_PREFIXES):
                return True
            non_empty = [v for v in row.values if str(v).strip()]
            return len(non_empty) <= 1
        df = df[~df.apply(is_separator_row, axis=1)].reset_index(drop=True)

    if len(df) == 0:
        raise TimesheetError("Nessun dato valido trovato nel file caricato.")

    # Doppia colonna Account (codice + ragione sociale)
    if 'Account.1' in df.columns:
        df['Account_Codice'] = df['Account']
        df['Account'] = df.apply(
            lambda r: str(r['Account.1']).strip() or str(r['Account']).strip(), axis=1
        )

    if 'Nota' in df.columns and 'Descrizione' not in df.columns:
        df['Descrizione'] = df['Nota']

    return df


def parse_date(date_str):
    if not date_str:
        return None
    if isinstance(date_str, datetime):
        return date_str.date()
    if isinstance(date_str, date):
        return date_str
    s = str(date_str).strip()
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d', '%d/%m/%y', '%y-%m-%d', '%y/%m/%d',
                '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Accesso ai campi e classificazione
# ---------------------------------------------------------------------------

def get_hours(row):
    return safe_float(row.get('Consuntivo Ore') or row.get('Ore') or 0)


def get_account(row):
    return str(row.get('Account') or row.get('Cliente') or row.get('Commessa') or '').strip()


def get_group(row):
    return str(row.get('Gruppo TimeSheet') or row.get('Gruppo Timesheet') or row.get('Gruppo') or '').strip()


def get_note(row):
    return str(row.get('Descrizione') or row.get('Nota') or '').strip()


def _normalize_text(s):
    s = unicodedata.normalize('NFD', str(s).strip().upper())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def get_non_billable_category(row):
    """Sottocategorie interne note (stessa logica storica del frontend)."""
    for key in ('Gruppo Timesheet', 'Gruppo TimeSheet', 'Gruppo', 'Tipo', 'Tipo Orario',
                'Commessa', 'Account', 'Cliente', 'Sottogruppo'):
        raw = row.get(key)
        if not raw:
            continue
        s = _normalize_text(raw)
        if any(k in s for k in ('ICS GENERAL', 'IC-GENERAL', 'IC GENERAL', 'ICS-GENERAL', 'ICS - GENERAL')):
            return 'ICS Generali'
        if 'ATTIVITA COMMERCIAL' in s or "ATTIVITA' COMMERCIAL" in s or ('CLI' in s and 'COMMERCIAL' in s):
            return 'CLI Attività Commerciali'
        if 'FORMAZIONE' in s:
            return 'Formazione'
    return None


def classify_row(row):
    """Ritorna (categoria, sottocategoria): categoria è Cliente / Interno / Assenza."""
    group = _normalize_text(get_group(row))
    commessa = _normalize_text(row.get('Commessa') or '')

    if 'ASSENZ' in group or commessa in ABSENCE_CODES:
        return ASSENZA, ''
    sub = get_non_billable_category(row)
    if sub:
        return INTERNO, sub
    if group:
        return (CLIENTE, '') if group.startswith('CLI') else (INTERNO, OTHER_INTERNAL)
    # File senza colonna Gruppo: si decide da Commessa / Account
    if commessa.startswith(INTERNAL_COMMESSA_PREFIXES):
        return INTERNO, OTHER_INTERNAL
    return (CLIENTE, '') if get_account(row) else (INTERNO, OTHER_INTERNAL)


def is_working_hours(row):
    """True se la riga è in orario lavorativo (Tipo Orario vuoto o 'Lavorativo')."""
    tipo = str(row.get('Tipo Orario') or '').strip().lower()
    return tipo == '' or tipo.startswith('lavorativ')


def add_message(row, field, msg):
    existing = row.get(field, '')
    row[field] = f"{existing} | {msg}" if existing else msg


# ---------------------------------------------------------------------------
# Controlli sulle righe
# ---------------------------------------------------------------------------

def evaluate_native_rules(row):
    """Regole di business aziendali preconfigurate. Ritorna (errori, avvisi)."""
    errors, warnings = [], []
    category = row.get('_Categoria')

    gruppo = get_group(row).upper()
    if 'GETTONI' in gruppo or 'GETTONE' in gruppo:
        ore = get_hours(row)
        if ore > 0 and abs((ore * 4) - round(ore * 4)) > 0.01:
            errors.append("Ore gettone non conformi: devono essere multipli di 0,25h (15 min)")

    if category == CLIENTE and 'Commessa' in row and not str(row.get('Commessa', '')).strip():
        errors.append("Commessa mancante su attività cliente")

    stato = str(row.get('Stato TimeSheet', '')).strip()
    if stato and stato != CONFIRMED_STATUS:
        warnings.append(f"Timesheet non confermato (stato {stato})")

    if category != ASSENZA and ('Descrizione' in row or 'Nota' in row) and not get_note(row):
        warnings.append("Nota mancante")

    if not is_working_hours(row):
        warnings.append(
            f"Attività fuori orario ({row.get('Tipo Orario')}): non conteggiata nelle "
            "ore previste della giornata"
        )
    return errors, warnings


def heuristic_description_check(descrizione):
    """Ritorna (avviso, candidato_ia)."""
    d = descrizione.strip()
    if not d:
        return "", False
    if len(d) < 4:
        return "Descrizione troppo sintetica", False
    if d.lower() in VAGUE_TERMS:
        return f"Descrizione generica ('{d}'): specificare il dettaglio", False
    return "", len(d) <= 35


def flag_duplicates(results, date_col, user_col):
    """Segnala righe con stesso tecnico, giorno, commessa, fascia oraria e nota."""
    seen = {}
    for idx, r in enumerate(results):
        note = get_note(r)
        if not note or r.get('_Categoria') == ASSENZA:
            continue
        key = (str(r.get(user_col, '')), str(r.get(date_col, '')), str(r.get('Commessa', '')),
               str(r.get('Tipo Orario', '')).lower(), note.lower())
        seen.setdefault(key, []).append(idx)
    for idxs in seen.values():
        if len(idxs) > 1:
            for i in idxs:
                add_message(results[i], '_Avviso',
                            f"Possibile duplicato: {len(idxs)} registrazioni con stessa commessa e nota nel giorno")


def check_rows(df, compiled_rules):
    """Prima passata: classificazione, regole native, regole custom ed euristica descrizioni.

    Ritorna (results, ambiguous_candidates) dove ambiguous_candidates mappa
    descrizione -> indici delle righe da far verificare all'IA (righe cliente per prime).
    """
    all_rows = df.to_dict('records')
    results = []
    candidates = {}
    for row in all_rows:
        row = dict(row)
        row['_Categoria'], row['_Sottocategoria'] = classify_row(row)
        errors, warnings = evaluate_native_rules(row)
        if compiled_rules:
            errors.extend(evaluate_rules(row, compiled_rules, all_rows))
        row['_Errore_Logico'] = " | ".join(errors)
        row['_Avviso'] = " | ".join(warnings)
        row['_Avviso_IA'] = ""
        if not errors and row['_Categoria'] != ASSENZA:
            desc = get_note(row)
            warning, candidate = heuristic_description_check(desc)
            row['_Avviso_IA'] = warning
            if candidate:
                candidates.setdefault(desc, []).append(len(results))
        results.append(row)

    # Priorità all'IA: prima le descrizioni usate su attività cliente (finiscono in fattura)
    def priority(item):
        _, idxs = item
        return 0 if any(results[i]['_Categoria'] == CLIENTE for i in idxs) else 1
    ambiguous = dict(sorted(candidates.items(), key=priority))
    return results, ambiguous


def ai_check_descriptions(results, ambiguous, ollama_url, model):
    """Seconda passata: un'unica chiamata batch all'IA (best effort, non blocca mai)."""
    if not ambiguous or not ollama_url:
        return
    unique = list(ambiguous.keys())[:AI_MAX_DESCRIPTIONS]
    items = "\n".join(f"{i + 1}: {d}" for i, d in enumerate(unique))
    prompt = f"""Valuta queste descrizioni di timesheet. Per ciascuna rispondi "OK" se descrive adeguatamente un'attività professionale, oppure un avviso di max 5 parole se troppo vaga o priva di contesto:
{items}

Rispondi ESCLUSIVAMENTE in formato JSON con chiavi numeriche:
{{"1": "...", "2": "..."}}"""
    try:
        res = requests.post(ollama_url, json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.1, "num_predict": 100},
        }, timeout=AI_TIMEOUT_SECONDS)
        if res.status_code != 200:
            return
        parsed = json.loads(res.json().get("response", "").strip())
        if not isinstance(parsed, dict):
            return
    except Exception:
        return  # Ollama non raggiungibile o risposta non valida: si prosegue senza avvisi IA

    for i, d in enumerate(unique):
        val = str(parsed.get(str(i + 1), "")).strip()
        if val and val.upper() != "OK" and not val.upper().startswith("OK."):
            for idx in ambiguous[d]:
                results[idx]['_Avviso_IA'] = val


# ---------------------------------------------------------------------------
# Lavoro di squadra
# ---------------------------------------------------------------------------

_WORD_RE = re.compile(r"[a-zàèéìòù0-9]+")


def _note_words(note):
    return {w for w in _WORD_RE.findall(note.lower()) if len(w) > 2}


def note_similarity(a, b):
    wa, wb = _note_words(a), _note_words(b)
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)


def _mentions(note, user):
    """True se la nota cita il cognome (o il nome) del collega."""
    words = _note_words(note)
    return any(len(part) > 3 and part.lower() in words for part in str(user).split())


def detect_shared_work(results, date_col, user_col):
    """Riconosce interventi cliente svolti insieme da più tecnici: stesso giorno e
    Account, tecnici diversi, note simili oppure nota che cita il collega.

    Aggiunge `_Condiviso` alle righe coinvolte e un avviso se l'intervento è
    'Da addebitare' per più tecnici (possibile doppio addebito). Ritorna l'elenco
    degli interventi condivisi.
    """
    by_key = {}
    for idx, r in enumerate(results):
        if r.get('_Categoria') != CLIENTE:
            continue
        acc = get_account(r)
        user = str(r.get(user_col, '')).strip()
        if acc and user:
            by_key.setdefault((str(r.get(date_col, '')), acc), []).append(idx)

    # Union-find sugli indici che risultano collegati
    parent = {}

    def find(i):
        parent.setdefault(i, i)
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for idxs in by_key.values():
        for a_pos, i in enumerate(idxs):
            for j in idxs[a_pos + 1:]:
                ri, rj = results[i], results[j]
                ui, uj = str(ri.get(user_col, '')).strip(), str(rj.get(user_col, '')).strip()
                if ui == uj:
                    continue
                ni, nj = get_note(ri), get_note(rj)
                if (note_similarity(ni, nj) >= SHARED_NOTE_SIMILARITY
                        or _mentions(ni, uj) or _mentions(nj, ui)):
                    parent[find(i)] = find(j)

    groups = {}
    for i in list(parent):
        groups.setdefault(find(i), []).append(i)

    shared = []
    for idxs in groups.values():
        if len(idxs) < 2:
            continue
        idxs.sort()
        rows = [results[i] for i in idxs]
        users = sorted({str(r.get(user_col, '')).strip() for r in rows})
        billed = sorted({str(r.get(user_col, '')).strip() for r in rows
                         if str(r.get('T.Registrazione Gettoni', '')).strip().upper() == BILLABLE_FLAG})
        for r in rows:
            me = str(r.get(user_col, '')).strip()
            others = [u for u in users if u != me]
            r['_Condiviso'] = "Intervento condiviso con " + ", ".join(others)
            if len(billed) > 1 and me in billed:
                add_message(r, '_Avviso',
                            f"Intervento condiviso addebitato da {len(billed)} tecnici "
                            f"({', '.join(billed)}): verificare doppio addebito")
        shared.append({
            "date": str(rows[0].get(date_col, '')),
            "account": get_account(rows[0]),
            "users": users,
            "hours": {u: round(sum(get_hours(r) for r in rows
                                   if str(r.get(user_col, '')).strip() == u), 2) for u in users},
            "billed_by": billed,
            "notes": [get_note(r) for r in rows],
        })
    shared.sort(key=lambda s: (parse_date(s["date"]) or date.min, s["account"]))
    return shared


# ---------------------------------------------------------------------------
# Context switching
# ---------------------------------------------------------------------------

def context_switching_level(cs_percent):
    if cs_percent > CS_HIGH_THRESHOLD:
        return "high"
    if cs_percent > CS_MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def daily_context_switching(account_hours):
    """CS giornaliero = 1 - ore_max_singolo_account / ore_totali (0..1), None se 0 ore."""
    total = sum(account_hours.values())
    if total <= 0:
        return None
    return 1 - max(account_hours.values()) / total


def compute_context_switching(results, date_col, user_col):
    """Context Switching calcolato solo sulle attività cliente, raggruppate per Account.

    Ritorna {"per_user": {user: {...}}, "global": float}.
    """
    per_day = {}  # (user, date) -> {account: ore}
    for r in results:
        if r.get('_Virtuale'):
            continue
        category = r.get('_Categoria') or classify_row(r)[0]
        if category != CLIENTE:
            continue
        user = str(r.get(user_col, '')).strip()
        d = parse_date(r.get(date_col, ''))
        if not user or not d:
            continue
        acc = get_account(r) or 'Nessun Account'
        day = per_day.setdefault((user, d), {})
        day[acc] = day.get(acc, 0.0) + get_hours(r)

    user_values, user_accounts, user_accounts_per_day = {}, {}, {}
    all_values = []
    for (user, _), accounts in per_day.items():
        cs = daily_context_switching(accounts)
        if cs is None:
            continue
        user_values.setdefault(user, []).append(cs)
        user_accounts.setdefault(user, set()).update(accounts)
        user_accounts_per_day.setdefault(user, []).append(len(accounts))
        all_values.append(cs)

    per_user = {}
    for user, values in user_values.items():
        pct = round(sum(values) / len(values) * 100, 1)
        apd = user_accounts_per_day[user]
        per_user[user] = {
            "percent": pct,
            "level": context_switching_level(pct),
            "days_analyzed": len(values),
            "avg_accounts_per_day": round(sum(apd) / len(apd), 1),
            "total_unique_accounts": len(user_accounts[user]),
        }
    global_pct = round(sum(all_values) / len(all_values) * 100, 1) if all_values else 0.0
    return {"per_user": per_user, "global": global_pct}


def empty_cs():
    return {"percent": 0.0, "level": "low", "days_analyzed": 0,
            "avg_accounts_per_day": 0.0, "total_unique_accounts": 0}


# ---------------------------------------------------------------------------
# Presenze
# ---------------------------------------------------------------------------

def _detect_output_format(sample):
    if "/" in sample and len(sample.split("/")[0]) == 4:
        return "%Y/%m/%d"
    if "-" in sample:
        return "%Y-%m-%d" if len(sample.split("-")[0]) == 4 else "%d-%m-%Y"
    return "%d/%m/%Y"


def _new_day():
    return {"in_hours": 0.0, "out_hours": 0.0, "absence_hours": 0.0, "client_hours": 0.0,
            "rows": [], "in_rows": [], "accounts": set()}


def saturation_level(pct, target):
    if pct >= target:
        return "high"
    if pct >= target - 20:
        return "medium"
    return "low"


def compute_presence(results, columns, date_col, user_col, calendar=None):
    """Matrice presenze sul periodo.

    Regole:
    - copertura giornata = ore in orario lavorativo + ore di assenza;
    - le ore fuori orario non contano per le 8h (sono riportate a parte);
    - copertura < 8h -> giornata incompleta (errore), 0h -> giornata mancante (riga virtuale);
    - copertura > 8h -> esubero (avviso, la giornata resta valida);
    - giornata coperta solo da assenze -> "assente giustificato";
    - festività nazionali e chiusure aziendali escluse dal periodo; patroni per sede
      e giorni non lavorativi del tecnico (part-time) -> stato "off" (0h previste).
    Modifica `results` in place.
    """
    cal = calendar or WorkCalendar()
    summary = {
        "working_days": [],
        "holidays": [],
        "users": [],
        "global_metrics": {
            "total_users": 0, "total_hours": 0.0, "working_days_count": 0,
            "total_ok_days": 0, "total_partial_days": 0, "total_missing_days": 0,
            "total_absent_days": 0, "total_over_days": 0,
            "total_missing_hours": 0.0, "total_extra_hours": 0.0,
            "total_out_of_hours": 0.0, "total_absence_hours": 0.0,
            "total_client_hours": 0.0, "total_non_billable_hours": 0.0,
            "avg_context_switching": 0.0, "total_off_days": 0,
            "total_available_hours": 0.0, "saturation": 0.0,
            "saturation_target": cal.saturation_target, "saturation_level": "low",
        },
    }
    gm = summary["global_metrics"]

    unique_users = []
    parsed_dates = {}
    days = {}  # (user, date) -> aggregati
    for idx, r in enumerate(results):
        u_str = str(r.get(user_col, '')).strip()
        if u_str and u_str not in unique_users:
            unique_users.append(u_str)

        hrs = get_hours(r)
        category = r.get('_Categoria')
        if category == CLIENTE:
            gm["total_client_hours"] += hrs
        elif category == INTERNO:
            gm["total_non_billable_hours"] += hrs
        elif category == ASSENZA:
            gm["total_absence_hours"] += hrs

        d_str = str(r.get(date_col, '')).strip()
        d_obj = parse_date(d_str)
        if not d_obj:
            continue
        parsed_dates[d_str] = d_obj
        if not u_str:
            continue
        day = days.setdefault((u_str, d_obj), _new_day())
        day["rows"].append(idx)
        if category == ASSENZA:
            day["absence_hours"] += hrs
        elif is_working_hours(r):
            day["in_hours"] += hrs
            day["in_rows"].append(idx)
        else:
            day["out_hours"] += hrs
        if category == CLIENTE:
            day["client_hours"] += hrs
            if get_account(r):
                day["accounts"].add(get_account(r))

    for k in ("total_client_hours", "total_non_billable_hours", "total_absence_hours"):
        gm[k] = round(gm[k], 2)

    if not parsed_dates or not unique_users:
        return summary

    cs = compute_context_switching(results, date_col, user_col)
    gm["avg_context_switching"] = cs["global"]
    gm["total_users"] = len(unique_users)

    min_date, max_date = min(parsed_dates.values()), max(parsed_dates.values())
    if not 0 <= (max_date - min_date).days <= MAX_PERIOD_DAYS:
        # Periodo troppo ampio: niente matrice presenze, solo ordinamento cronologico
        _sort_results(results, date_col, user_col)
        return summary

    fmt = _detect_output_format(next(iter(parsed_dates)))
    cal.learn_sedi(results, user_col)
    working_days = []
    curr = min_date
    while curr <= max_date:
        if cal.is_company_working_day(curr):
            working_days.append(curr)
        elif curr.weekday() < 5:
            summary["holidays"].append({"date": curr.strftime(fmt), "name": cal.company_holiday(curr)})
        curr += timedelta(days=1)

    summary["working_days"] = [w.strftime(fmt) for w in working_days]
    gm["working_days_count"] = len(working_days)

    virtual_rows = []
    users_summary = []
    for user in unique_users:
        user_days = {}
        counts = {"ok": 0, "partial": 0, "missing": 0, "absent": 0, "over": 0, "off": 0}
        totals = {"worked": 0.0, "absence": 0.0, "out": 0.0, "extra": 0.0, "missing": 0.0,
                  "client": 0.0, "available": 0.0}
        for w in working_days:
            d_str = w.strftime(fmt)
            day = days.get((user, w), _new_day())
            expected = cal.expected_hours(user, w)
            in_h = round(day["in_hours"], 2)
            out_h = round(day["out_hours"], 2)
            abs_h = round(day["absence_hours"], 2)
            covered = round(in_h + abs_h, 2)
            totals["worked"] += in_h + out_h
            totals["absence"] += abs_h
            totals["out"] += out_h
            totals["client"] += day["client_hours"]
            totals["available"] += max(expected - abs_h, 0.0)

            info = {
                "expected_hours": expected,
                "hours": covered,
                "worked_hours": in_h,
                "absence_hours": abs_h,
                "out_of_hours": out_h,
                "extra_hours": 0.0,
                "missing_hours": 0.0,
                "accounts_count": len(day["accounts"]),
                "entries_count": len(day["rows"]),
            }
            if expected == 0:
                counts["off"] += 1
                info["status"] = "off"
                info["label"] = cal.user_holiday(user, w) or "Giorno non lavorativo"
            elif covered == 0:
                counts["missing"] += 1
                info.update(status="missing", missing_hours=expected)
                totals["missing"] += expected
                msg = f"Mancano le ore per questo giorno lavorativo! (0h su {expected:g}h)"
                if out_h:
                    msg += f" Presenti solo {out_h:g}h fuori orario."
                if day["rows"]:
                    for r_idx in day["rows"]:
                        add_message(results[r_idx], '_Errore_Logico', msg)
                else:
                    v_row = {col: "" for col in columns}
                    v_row.update({date_col: d_str, user_col: user, '_Errore_Logico': msg,
                                  '_Avviso': "", '_Avviso_IA': "", '_Categoria': "",
                                  '_Sottocategoria': "", '_Virtuale': True})
                    virtual_rows.append(v_row)
            elif covered < expected:
                counts["partial"] += 1
                miss = round(expected - covered, 2)
                totals["missing"] += miss
                info.update(status="partial", missing_hours=miss)
                detail = f"{in_h:g}h in orario lavorativo" + (f" + {abs_h:g}h di assenza" if abs_h else "")
                msg = f"Giornata incompleta: registrate {detail} su {expected:g}h previste (mancano {miss:g}h)"
                for r_idx in day["rows"]:
                    add_message(results[r_idx], '_Errore_Logico', msg)
            else:
                if in_h == 0:
                    counts["absent"] += 1
                    info["status"] = "absent"
                else:
                    counts["ok"] += 1
                    info["status"] = "ok"
                extra = round(covered - expected, 2)
                if extra > 0 and in_h > 0:
                    counts["over"] += 1
                    totals["extra"] += extra
                    info["extra_hours"] = extra
                    msg = (f"Esubero: {covered:g}h registrate in orario lavorativo "
                           f"(+{extra:g}h oltre le {expected:g}h)")
                    for r_idx in day["in_rows"]:
                        add_message(results[r_idx], '_Avviso', msg)
            user_days[d_str] = info

        gm["total_ok_days"] += counts["ok"]
        gm["total_partial_days"] += counts["partial"]
        gm["total_missing_days"] += counts["missing"]
        gm["total_absent_days"] += counts["absent"]
        gm["total_over_days"] += counts["over"]
        gm["total_hours"] += totals["worked"]
        gm["total_missing_hours"] += totals["missing"]
        gm["total_extra_hours"] += totals["extra"]
        gm["total_out_of_hours"] += totals["out"]
        gm["total_off_days"] += counts["off"]
        gm["total_available_hours"] += totals["available"]
        sat = round(totals["client"] / totals["available"] * 100, 1) if totals["available"] else 0.0
        users_summary.append({
            "user": user,
            "total_hours": round(totals["worked"], 2),
            "absence_hours": round(totals["absence"], 2),
            "out_of_hours": round(totals["out"], 2),
            "extra_hours": round(totals["extra"], 2),
            "days": user_days,
            "status_counts": counts,
            "context_switching": cs["per_user"].get(user, empty_cs()),
            "saturation": {
                "percent": sat,
                "level": saturation_level(sat, cal.saturation_target),
                "client_hours": round(totals["client"], 2),
                "available_hours": round(totals["available"], 2),
            },
            "sede": cal.sede(user),
            "email": cal.email(user),
        })

    results.extend(virtual_rows)
    client_in_period = sum(u["saturation"]["client_hours"] for u in users_summary)
    if gm["total_available_hours"]:
        gm["saturation"] = round(client_in_period / gm["total_available_hours"] * 100, 1)
    gm["saturation_level"] = saturation_level(gm["saturation"], cal.saturation_target)
    for k in ("total_hours", "total_missing_hours", "total_extra_hours", "total_out_of_hours",
              "total_available_hours"):
        gm[k] = round(gm[k], 2)
    summary["users"] = sorted(
        users_summary,
        key=lambda x: (x["status_counts"]["missing"], x["status_counts"]["partial"]),
        reverse=True,
    )
    _sort_results(results, date_col, user_col)
    return summary


def _sort_results(results, date_col, user_col):
    results.sort(key=lambda r: (parse_date(r.get(date_col, '')) or date.min, str(r.get(user_col, ''))))


# ---------------------------------------------------------------------------
# Pipeline completa
# ---------------------------------------------------------------------------

def analyze_timesheet(filename, contents, compiled_rules, ollama_url=None, model=None, calendar=None):
    df = normalize_dataframe(read_dataframe(filename, contents))
    results, ambiguous = check_rows(df, compiled_rules)
    ai_check_descriptions(results, ambiguous, ollama_url, model)

    columns = list(df.columns)
    date_col = find_date_column(columns)
    user_col = find_user_column(columns)
    if date_col and not user_col:
        # File monoutente privo di colonna Collaboratore
        user_col = 'Collaboratore'
        columns.append(user_col)
        for r in results:
            r[user_col] = 'Dipendente'

    shared = []
    if date_col and user_col:
        flag_duplicates(results, date_col, user_col)
        shared = detect_shared_work(results, date_col, user_col)
        presence = compute_presence(results, columns, date_col, user_col, calendar)
    else:
        presence = compute_presence([], columns, date_col, user_col, calendar)
    presence["shared_work"] = shared

    for r in results:
        r.pop('_Virtuale', None)
    return results, presence
