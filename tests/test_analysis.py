import analysis
from analysis import analyze_timesheet, compute_context_switching, daily_context_switching

HEADER = "Data;Tecnico;Account;Gruppo Timesheet;Ore;Descrizione\n"


def csv(*lines):
    return (HEADER + "\n".join(lines) + "\n").encode("utf-8")


def run(data, rules=()):
    return analyze_timesheet("t.csv", data, list(rules), ollama_url=None)


def test_daily_context_switching_formula():
    assert daily_context_switching({"A": 8}) == 0
    assert daily_context_switching({"A": 6, "B": 2}) == 0.25
    assert daily_context_switching({"A": 2, "B": 2, "C": 2, "D": 2}) == 0.75
    assert daily_context_switching({"A": 0}) is None


def test_context_switching_excludes_ics_generali():
    rows = [
        {"Data": "05/01/2026", "Tecnico": "Mario", "Account": "Cliente A", "Ore": "6"},
        {"Data": "05/01/2026", "Tecnico": "Mario", "Account": "Cliente B", "Ore": "2"},
        {"Data": "05/01/2026", "Tecnico": "Mario", "Account": "X", "Gruppo Timesheet": "IC-GENERALI", "Ore": "4"},
        {"Data": "06/01/2026", "Tecnico": "Mario", "Account": "Cliente A", "Ore": "8"},
    ]
    cs = compute_context_switching(rows, "Data", "Tecnico")
    # giorno 1: 25%, giorno 2: 0% -> media 12.5%
    assert cs["per_user"]["Mario"]["percent"] == 12.5
    assert cs["per_user"]["Mario"]["level"] == "low"
    assert cs["global"] == 12.5


def test_presence_missing_partial_and_sorting():
    # Lun 05/01/2026 completo, Mar 06 parziale, Mer 07 mancante, Gio 08 completo
    data = csv(
        "08/01/2026;Mario;Cliente A;CLI;8;Sviluppo modulo fatturazione",
        "05/01/2026;Mario;Cliente A;CLI;8;Sviluppo modulo fatturazione",
        "06/01/2026;Mario;Cliente A;CLI;5;Sviluppo modulo fatturazione",
    )
    results, presence = run(data)
    gm = presence["global_metrics"]
    assert gm["working_days_count"] == 4
    assert (gm["total_ok_days"], gm["total_partial_days"], gm["total_missing_days"]) == (2, 1, 1)
    assert gm["total_missing_hours"] == 11.0
    assert [r["Data"] for r in results] == ["05/01/2026", "06/01/2026", "07/01/2026", "08/01/2026"]
    assert "Giornata incompleta" in results[1]["_Errore_Logico"]
    assert "Mancano le ore" in results[2]["_Errore_Logico"]
    assert all("_Virtuale" not in r for r in results)
    assert presence["users"][0]["context_switching"]["percent"] == 0.0


def test_separator_rows_removed_and_native_rules():
    data = csv(
        "Responsabile Attività - Mario;;;;;",
        "05/01/2026;Mario;Cliente A;CLI GETTONI;1,1;Intervento presso cliente",
        "05/01/2026;Mario;Cliente A;CLI;6,9;varie",
    )
    results, _ = run(data)
    assert len(results) == 2
    assert "multipli di 0,25h" in results[0]["_Errore_Logico"]
    assert "generica" in results[1]["_Avviso_IA"]


def test_single_user_file_gets_default_user():
    data = b"Data;Account;Ore;Descrizione\n05/01/2026;Cliente A;8;Sviluppo modulo fatturazione\n"
    results, presence = run(data)
    assert results[0]["Collaboratore"] == "Dipendente"
    assert presence["users"][0]["user"] == "Dipendente"


def test_non_billable_hours_and_ai_failure_is_ignored(monkeypatch):
    def boom(*a, **k):
        raise analysis.requests.ConnectionError("down")
    monkeypatch.setattr(analysis.requests, "post", boom)
    data = csv(
        "05/01/2026;Mario;Cliente A;CLI;6;Fix bug login",
        "05/01/2026;Mario;Interno;Formazione;2;Corso sicurezza",
    )
    results, presence = analyze_timesheet("t.csv", data, [], ollama_url="http://127.0.0.1:11434/api/generate")
    assert presence["global_metrics"]["total_non_billable_hours"] == 2.0
    assert all(r["_Avviso_IA"] == "" for r in results)
