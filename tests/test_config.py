import importlib

import pytest

import config


@pytest.mark.parametrize("host", ["127.0.0.1", "192.168.1.245", "10.0.0.5", ""])
def test_private_hosts_allowed(host):
    assert config.resolve_ollama_url(host).endswith(":11434/api/generate")


@pytest.mark.parametrize("host", ["8.8.8.8", "169.254.169.254", "example.com", "1.2.3.4/x", "127.0.0.1:80/evil#", "0.0.0.0"])
def test_bad_hosts_rejected(host):
    with pytest.raises(config.InvalidOllamaHost):
        config.resolve_ollama_url(host)


def test_allowlist(monkeypatch):
    monkeypatch.setenv("OLLAMA_ALLOWED_HOSTS", "ollama.intranet, 192.168.1.245")
    cfg = importlib.reload(config)
    try:
        assert cfg.resolve_ollama_url("ollama.intranet") == "http://ollama.intranet:11434/api/generate"
        with pytest.raises(cfg.InvalidOllamaHost):
            cfg.resolve_ollama_url("10.0.0.1")
    finally:
        monkeypatch.delenv("OLLAMA_ALLOWED_HOSTS")
        importlib.reload(config)
