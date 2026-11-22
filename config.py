"""Configurazione dell'applicazione (sovrascrivibile tramite variabili d'ambiente)."""
import ipaddress
import os
import re

DB_NAME = os.environ.get("TIMESHEET_DB", "timesheet_rules.db")

OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma4:e2b")
OLLAMA_PORT = int(os.environ.get("OLLAMA_PORT", "11434"))
OLLAMA_DEFAULT_HOST = os.environ.get("OLLAMA_HOST_DEFAULT", "127.0.0.1")

# Elenco esplicito (separato da virgole) di host Ollama consentiti, es.
#   OLLAMA_ALLOWED_HOSTS="127.0.0.1,192.168.1.245,ollama.intranet"
# Se non impostato, sono accettati solo indirizzi IP di loopback o di rete privata
# (10.x, 172.16-31.x, 192.168.x, 127.x): il server non può quindi essere usato per
# effettuare richieste verso internet o verso indirizzi di metadata (169.254.x).
_allowed_env = os.environ.get("OLLAMA_ALLOWED_HOSTS", "").strip()
OLLAMA_ALLOWED_HOSTS = {h.strip().lower() for h in _allowed_env.split(",") if h.strip()}

_HOSTNAME_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$")


class InvalidOllamaHost(ValueError):
    pass


def resolve_ollama_url(host):
    """Valida l'host Ollama indicato dal client e restituisce l'URL di generate."""
    host = (host or OLLAMA_DEFAULT_HOST).strip().lower()

    if OLLAMA_ALLOWED_HOSTS:
        if host not in OLLAMA_ALLOWED_HOSTS:
            raise InvalidOllamaHost(f"Host Ollama '{host}' non presente in OLLAMA_ALLOWED_HOSTS")
    else:
        try:
            ip = ipaddress.ip_address(host)
        except ValueError:
            raise InvalidOllamaHost(
                f"Host Ollama '{host}' non valido: indicare un IP di rete privata "
                "oppure configurare OLLAMA_ALLOWED_HOSTS sul server"
            ) from None
        if ip.is_link_local or ip.is_multicast or ip.is_unspecified or not (ip.is_private or ip.is_loopback):
            raise InvalidOllamaHost(f"Indirizzo Ollama '{host}' non consentito (solo reti private/loopback)")

    if not _HOSTNAME_RE.match(host) and ":" not in host:
        raise InvalidOllamaHost(f"Host Ollama '{host}' non valido")

    hostpart = f"[{host}]" if ":" in host else host
    return f"http://{hostpart}:{OLLAMA_PORT}/api/generate"
