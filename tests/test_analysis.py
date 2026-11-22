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
    # Lun 12/01/2026 completo, Mar 06 parziale, Mer 07 mancante, Gio 08 completo
    data = csv(
        "15/01/2026;Mario;Cliente A;CLI;8;Sviluppo modulo fatturazione",
        "12/01/2026;Mario;Cliente A;CLI;8;Sviluppo modulo fatturazione",
        "13/01/2026;Mario;Cliente A;CLI;5;Sviluppo modulo fatturazione",
    )
    results, presence = run(data)
    gm = presence["global_metrics"]
    assert gm["working_days_count"] == 4
    assert (gm["total_ok_days"], gm["total_partial_days"], gm["total_missing_days"]) == (2, 1, 1)
    assert gm["total_missing_hours"] == 11.0
    assert [r["Data"] for r in results] == ["12/01/2026", "13/01/2026", "14/01/2026", "15/01/2026"]
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


# --- Formato export ERP reale (Smeup) -------------------------------------

ERP_HEADER = ('"Data\nEvasione";Commessa;Agenda;"Stato\nTimeSheet";Account;Account;"Responsabile\nAttività";'
              '"Consuntivo\nOre";"Gruppo\nTimeSheet";"Tipo\nOrario";Nota\n')


def erp_csv(*lines):
    return (ERP_HEADER + "Responsabile Attività - ROSSI MARIO;;;;;;;;;;\n"
            + "\n".join(lines) + "\n").encode("utf-8")


def test_erp_codes_keep_leading_zeros_and_categories():
    data = erp_csv(
        "02/11/2026;37-1;0004308911;80;032583;CLIENTE SPA;ROSSI MARIO;4;CLI Gettoni;Lavorativo;Intervento su server di posta",
        "02/11/2026;IC-GESTMON;0004308912;80;;;ROSSI MARIO;2;Gestione (solo autorizzati);Lavorativo;Monitoraggio zabbix e alert",
        "02/11/2026;IC-GENERAL;0004308913;80;;;ROSSI MARIO;2;ICS - Generali;Lavorativo;Riunione interna pianificazione",
    )
    results, presence = run(data)
    r0 = results[0]
    assert r0["Agenda"] == "0004308911" and r0["Account_Codice"] == "032583" and r0["Account"] == "CLIENTE SPA"
    assert [r["_Categoria"] for r in results] == ["Cliente", "Interno", "Interno"]
    gm = presence["global_metrics"]
    assert gm["total_client_hours"] == 4 and gm["total_non_billable_hours"] == 4


def test_absence_justifies_day_but_is_not_worked():
    data = erp_csv(
        "02/11/2026;AFE;1;80;;;ROSSI MARIO;8;Assenze;Lavorativo;",
        "03/11/2026;AFE;2;80;;;ROSSI MARIO;1,5;Assenze;Lavorativo;terapia",
        "03/11/2026;37-1;3;80;032583;CLIENTE SPA;ROSSI MARIO;6,5;CLI Gettoni;Lavorativo;Intervento su server di posta",
    )
    results, presence = run(data)
    u = presence["users"][0]
    assert u["days"]["02/11/2026"]["status"] == "absent"
    assert u["days"]["03/11/2026"]["status"] == "ok"
    assert u["total_hours"] == 6.5 and u["absence_hours"] == 9.5
    assert not any(r["_Errore_Logico"] for r in results)
    # l'assenza senza nota non genera "Nota mancante"
    assert "Nota mancante" not in results[0]["_Avviso"]


def test_out_of_hours_not_counted_and_overtime_warning():
    data = erp_csv(
        "02/11/2026;37-1;1;80;032583;CLIENTE SPA;ROSSI MARIO;6;CLI Gettoni;Lavorativo;Aggiornamento cluster Nutanix",
        "02/11/2026;37-1;2;80;032583;CLIENTE SPA;ROSSI MARIO;3;CLI Gettoni;Fuori orario lavorativo;Aggiornamento cluster Nutanix",
        "03/11/2026;37-1;3;80;032583;CLIENTE SPA;ROSSI MARIO;6;CLI Gettoni;Lavorativo;Analisi problema backup Cohesity",
        "03/11/2026;40-2;4;80;012243;ALTRO SRL;ROSSI MARIO;4;CLI Attivita' a corpo;Lavorativo;Creazione VM SQL Server",
    )
    results, presence = run(data)
    d1, d2 = presence["users"][0]["days"]["02/11/2026"], presence["users"][0]["days"]["03/11/2026"]
    # giorno 1: solo 6h in orario -> incompleto, le 3h fuori orario non contano
    assert d1["status"] == "partial" and d1["out_of_hours"] == 3 and d1["missing_hours"] == 2
    # giorno 2: 10h in orario -> valido ma in esubero (avviso, non errore)
    assert d2["status"] == "ok" and d2["extra_hours"] == 2
    day2 = [r for r in results if r["Data Evasione"] == "03/11/2026"]
    assert all("Esubero" in r["_Avviso"] and not r["_Errore_Logico"] for r in day2)
    fo = [r for r in results if r["Tipo Orario"] == "Fuori orario lavorativo"][0]
    assert "fuori orario" in fo["_Avviso"] and "Possibile duplicato" not in fo["_Avviso"]
    assert presence["users"][0]["total_hours"] == 19


def test_unconfirmed_missing_commessa_missing_note_and_duplicates():
    data = erp_csv(
        "02/11/2026;;1;10;012408;CEREDA SRL;ROSSI MARIO;1;CLI servizio gestito/contratto;Lavorativo;attivazione bucket",
        "02/11/2026;IC-GENERAL;2;80;;;ROSSI MARIO;3;ICS - Generali;Lavorativo;",
        "02/11/2026;IC-GENERAL;3;80;;;ROSSI MARIO;2;ICS - Generali;Lavorativo;Confronto con colleghi su IA",
        "02/11/2026;IC-GENERAL;4;80;;;ROSSI MARIO;2;ICS - Generali;Lavorativo;Confronto con colleghi su IA",
    )
    results, _ = run(data)
    assert "Commessa mancante" in results[0]["_Errore_Logico"]
    assert "non confermato (stato 10)" in results[0]["_Avviso"]
    assert "Nota mancante" in results[1]["_Avviso"]
    assert all("Possibile duplicato" in r["_Avviso"] for r in results[2:])


def test_context_switching_only_on_client_activities():
    data = erp_csv(
        "02/11/2026;37-1;1;80;1;CLIENTE A;ROSSI MARIO;3;CLI Gettoni;Lavorativo;Intervento su server di posta",
        "02/11/2026;37-2;2;80;2;CLIENTE B;ROSSI MARIO;1;CLI Gettoni;Lavorativo;Rinnovo certificati broker",
        "02/11/2026;IC-GENERAL;3;80;;;ROSSI MARIO;2;ICS - Generali;Lavorativo;Riunione interna pianificazione",
        "02/11/2026;IC-FORMAZ;4;80;;;ROSSI MARIO;2;Formazione;Lavorativo;Corso interno sicurezza",
    )
    _, presence = run(data)
    # solo clienti: 3h A + 1h B -> 1 - 3/4 = 25%
    assert presence["users"][0]["context_switching"]["percent"] == 25.0


# --- Calendario, orari per tecnico, saturazione, lavoro di squadra ---------

from workcalendar import WorkCalendar, easter_sunday, national_holidays
from datetime import date


def test_italian_holidays():
    assert easter_sunday(2026) == date(2026, 4, 5)
    hol = national_holidays(2026)
    assert hol[date(2026, 4, 6)] == "Lunedì dell'Angelo"
    assert date(2026, 12, 8) in hol and date(2026, 6, 2) in hol


def test_holidays_excluded_and_part_time_and_patron():
    cal = WorkCalendar({
        "technicians": {"ROSSI MARIO": {"daily_hours": {"lun": 4, "mar": 4, "mer": 4, "gio": 4}}},
        "sede_holidays": {"TOR": [{"date": "12-09", "name": "Patrono test"}]},
        "company_closures": ["2026-12-07"],
    })
    header = "Data;Tecnico;Sede;Account;Gruppo Timesheet;Ore;Descrizione\n"
    lines = [
        "09/12/2026;ROSSI MARIO;FAE;Cliente A;CLI Gettoni;4;Intervento su server di posta",
        "10/12/2026;ROSSI MARIO;FAE;Cliente A;CLI Gettoni;4;Intervento su server di posta",
        "09/12/2026;BIANCHI LUCA;TOR;Cliente A;CLI Gettoni;8;Intervento su server di posta",
        "10/12/2026;BIANCHI LUCA;TOR;Cliente A;CLI Gettoni;8;Intervento su server di posta",
        "11/12/2026;BIANCHI LUCA;TOR;Cliente A;CLI Gettoni;8;Intervento su server di posta",
    ]
    # periodo lun 07/12 (chiusura aziendale) - ven 11/12; 08/12 Immacolata
    lines.append("07/12/2026;BIANCHI LUCA;TOR;Cliente A;CLI Gettoni;2;Intervento urgente su firewall")
    data = (header + "\n".join(lines) + "\n").encode()
    results, presence = analyze_timesheet("t.csv", data, [], calendar=cal)
    assert presence["working_days"] == ["09/12/2026", "10/12/2026", "11/12/2026"]
    assert presence["holidays"] == [{"date": "07/12/2026", "name": "Chiusura aziendale"},
                                    {"date": "08/12/2026", "name": "Immacolata Concezione"}]
    users = {u["user"]: u for u in presence["users"]}
    rossi, bianchi = users["ROSSI MARIO"], users["BIANCHI LUCA"]
    # part-time 4h lun-gio, venerdì non lavorativo
    assert rossi["days"]["09/12/2026"]["status"] == "ok"
    assert rossi["days"]["11/12/2026"]["status"] == "off"
    # patrono della sede TOR il 09/12: giornata non richiesta
    assert bianchi["days"]["09/12/2026"]["status"] == "off"
    assert bianchi["days"]["09/12/2026"]["label"] == "Patrono test"
    assert bianchi["sede"] == "TOR"
    # saturazione: Rossi 8h cliente su 8h disponibili; Bianchi 24h (nei giorni lavorativi) su 16h
    assert rossi["saturation"]["percent"] == 100.0
    assert bianchi["saturation"]["available_hours"] == 16.0
    assert not any("Mancano" in r["_Errore_Logico"] for r in results)


def test_holiday_listed_in_period():
    data = csv(
        "07/12/2026;Mario;Cliente A;CLI;8;Sviluppo modulo fatturazione",
        "09/12/2026;Mario;Cliente A;CLI;8;Sviluppo modulo fatturazione",
    )
    _, presence = run(data)
    assert presence["working_days"] == ["07/12/2026", "09/12/2026"]
    assert presence["holidays"] == [{"date": "08/12/2026", "name": "Immacolata Concezione"}]


def test_shared_work_and_double_billing():
    header = ('Data;Commessa;Stato TimeSheet;Account;Responsabile Attività;Consuntivo Ore;'
              'Gruppo TimeSheet;Tipo Orario;T.Registrazione Gettoni;Nota\n')
    lines = [
        "02/11/2026;37-1;80;CAAF SRL;CHIFARI SIMONE;1;CLI Gettoni;Lavorativo;Da addebitare;"
        "Rinnovo del certificato interno dei due Broker server con Efrem Spataro.",
        "02/11/2026;37-1;80;CAAF SRL;SPATARO EFREM;1,5;CLI Gettoni;Lavorativo;Da addebitare;"
        "Rinnovo del certificato interno dei due Broker server con Simone Chifari.",
        "02/11/2026;40-2;80;DIACHEM SPA;CHIFARI SIMONE;0,5;CLI Attivita' a corpo;Lavorativo;;SAL interno",
        "02/11/2026;40-2;80;DIACHEM SPA;SPATARO EFREM;2;CLI Attivita' a corpo;Lavorativo;;"
        "SAL con Giulia e Simone Chifari. Installazione FSLogix.",
        "02/11/2026;37-9;80;ALTRO SPA;CHIFARI SIMONE;1;CLI Gettoni;Lavorativo;Da addebitare;Aggiornamento firewall",
        "02/11/2026;37-9;80;ALTRO SPA;SPATARO EFREM;1;CLI Gettoni;Lavorativo;Da addebitare;Verifica licenze Citrix",
    ]
    data = (header + "\n".join(lines) + "\n").encode()
    results, presence = analyze_timesheet("t.csv", data, [])
    shared = presence["shared_work"]
    assert [s["account"] for s in shared] == ["CAAF SRL", "DIACHEM SPA"]
    assert shared[0]["billed_by"] == ["CHIFARI SIMONE", "SPATARO EFREM"]
    assert shared[0]["hours"] == {"CHIFARI SIMONE": 1.0, "SPATARO EFREM": 1.5}
    caaf = [r for r in results if r["Account"] == "CAAF SRL"]
    assert all("doppio addebito" in r["_Avviso"] for r in caaf)
    diachem = [r for r in results if r["Account"] == "DIACHEM SPA"]
    assert all(r["_Condiviso"].startswith("Intervento condiviso con") for r in diachem)
    assert not any("doppio addebito" in r["_Avviso"] for r in diachem)
    altro = [r for r in results if r["Account"] == "ALTRO SPA"]
    assert not any(r.get("_Condiviso") for r in altro)
