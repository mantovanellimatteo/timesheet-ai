import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("TIMESHEET_DB", str(tmp_path / "rules.db"))
    import config
    import main
    importlib.reload(config)
    importlib.reload(main)
    with TestClient(main.app) as c:
        yield c


def test_rule_crud_and_validation(client):
    bad = {"rule_name": "x", "expression": "__import__('os')", "error_message": "e"}
    assert client.post("/api/rules", json=bad).status_code == 400

    good = {"rule_name": "Ore > 10", "expression": "safe_float(row.get('Ore')) > 10", "error_message": "Troppe ore"}
    rid = client.post("/api/rules", json=good).json()["id"]
    rules = client.get("/api/rules").json()["rules"]
    assert rules[0]["id"] == rid and rules[0]["validation_error"] is None

    assert client.put(f"/api/rules/{rid}", json={**good, "is_active": False}).status_code == 200
    assert client.put("/api/rules/999", json=good).status_code == 404
    assert client.delete(f"/api/rules/{rid}").status_code == 200
    assert client.get("/api/rules").json()["rules"] == []


def test_upload_applies_custom_rules(client):
    client.post("/api/rules", json={"rule_name": "r", "expression": "safe_float(row.get('Ore')) > 7",
                                    "error_message": "Più di 7 ore"})
    data = b"Data;Tecnico;Account;Ore;Descrizione\n05/01/2026;Mario;Cliente A;8;Sviluppo modulo fatturazione\n"
    res = client.post("/api/upload", files={"file": ("t.csv", data, "text/csv")}, data={"ollama_ip": "127.0.0.1"})
    assert res.status_code == 200
    assert res.json()["data"][0]["_Errore_Logico"] == "Più di 7 ore"


def test_upload_rejects_public_ollama_host(client):
    data = b"Data;Ore\n05/01/2026;8\n"
    res = client.post("/api/upload", files={"file": ("t.csv", data)}, data={"ollama_ip": "8.8.8.8"})
    assert res.status_code == 400


def test_upload_bad_format(client):
    res = client.post("/api/upload", files={"file": ("t.txt", b"x")})
    assert res.status_code == 400
