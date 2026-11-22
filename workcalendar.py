"""Calendario lavorativo: festività italiane, chiusure aziendali, patroni per sede
e orario contrattuale per tecnico.

La configurazione è letta da un file JSON (default `workforce.json`, vedi
`workforce.example.json`) ad ogni analisi, così le modifiche valgono senza
riavviare il servizio. Il file contiene nominativi ed email: non va versionato.
"""
import json
import os
from collections import Counter
from datetime import date, timedelta

DEFAULT_DAILY_HOURS = 8.0
DEFAULT_SATURATION_TARGET = 70.0
WEEKDAY_KEYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"]

FIXED_HOLIDAYS = {
    (1, 1): "Capodanno",
    (1, 6): "Epifania",
    (4, 25): "Festa della Liberazione",
    (5, 1): "Festa del Lavoro",
    (6, 2): "Festa della Repubblica",
    (8, 15): "Ferragosto",
    (11, 1): "Ognissanti",
    (12, 8): "Immacolata Concezione",
    (12, 25): "Natale",
    (12, 26): "Santo Stefano",
}


def easter_sunday(year):
    """Domenica di Pasqua (algoritmo gregoriano anonimo / Meeus)."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month, day = divmod(h + l - 7 * m + 114, 31)
    return date(year, month, day + 1)


def national_holidays(year):
    hol = {date(year, m, d): name for (m, d), name in FIXED_HOLIDAYS.items()}
    hol[easter_sunday(year) + timedelta(days=1)] = "Lunedì dell'Angelo"
    return hol


def _parse_day(value, year=None):
    """Accetta 'YYYY-MM-DD' (data puntuale) o 'MM-DD' (ricorrente ogni anno)."""
    parts = str(value).strip().split("-")
    try:
        if len(parts) == 3:
            return date(int(parts[0]), int(parts[1]), int(parts[2]))
        if len(parts) == 2 and year is not None:
            return date(year, int(parts[0]), int(parts[1]))
    except ValueError:
        return None
    return None


def load_workforce_config(path=None):
    path = path or os.environ.get("WORKFORCE_FILE", "workforce.json")
    if not os.path.exists(path):
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


class WorkCalendar:
    def __init__(self, config=None):
        cfg = config or {}
        self.default_hours = self._hours_spec(cfg.get("default_daily_hours", DEFAULT_DAILY_HOURS))
        self.saturation_target = float(cfg.get("saturation_target", DEFAULT_SATURATION_TARGET))
        self.closures = cfg.get("company_closures", [])
        self.sede_holidays = {str(k).upper(): v for k, v in (cfg.get("sede_holidays") or {}).items()}
        self.technicians = {
            str(k).strip().upper(): v for k, v in (cfg.get("technicians") or {}).items() if isinstance(v, dict)
        }
        self.user_sede = {}

    # -- orario ------------------------------------------------------------
    @staticmethod
    def _hours_spec(spec):
        """Numero (uguale lun-ven) oppure dict per giorno, es. {"lun": 8, "ven": 4}."""
        if isinstance(spec, dict):
            out = [0.0] * 7
            for i, key in enumerate(WEEKDAY_KEYS):
                if key in spec:
                    out[i] = float(spec[key])
            return out
        h = float(spec)
        return [h, h, h, h, h, 0.0, 0.0]

    def tech(self, user):
        return self.technicians.get(str(user).strip().upper(), {})

    def email(self, user):
        return str(self.tech(user).get("email", "")).strip()

    def sede(self, user):
        return str(self.tech(user).get("sede") or self.user_sede.get(user, "")).strip().upper()

    def learn_sedi(self, results, user_col):
        """Sede più frequente per tecnico dalla colonna 'Sede' dell'export."""
        counts = {}
        for r in results:
            s = str(r.get("Sede", "")).strip().upper()
            u = str(r.get(user_col, "")).strip()
            if s and u:
                counts.setdefault(u, Counter())[s] += 1
        self.user_sede = {u: c.most_common(1)[0][0] for u, c in counts.items()}

    # -- festività -----------------------------------------------------------
    def company_holiday(self, day):
        """Festività nazionale o chiusura aziendale (valida per tutti)."""
        name = national_holidays(day.year).get(day)
        if name:
            return name
        for c in self.closures:
            if isinstance(c, dict):
                d, label = _parse_day(c.get("date"), day.year), c.get("name") or "Chiusura aziendale"
            else:
                d, label = _parse_day(c, day.year), "Chiusura aziendale"
            if d == day:
                return label
        return None

    def user_holiday(self, user, day):
        """Patrono della sede del tecnico."""
        for h in self.sede_holidays.get(self.sede(user), []):
            if isinstance(h, dict):
                d, label = _parse_day(h.get("date"), day.year), h.get("name") or "Patrono"
            else:
                d, label = _parse_day(h, day.year), "Patrono"
            if d == day:
                return label
        return None

    def expected_hours(self, user, day):
        """Ore previste per il tecnico in quel giorno (0 se festivo o non lavorativo)."""
        if self.company_holiday(day) or self.user_holiday(user, day):
            return 0.0
        spec = self.tech(user).get("daily_hours")
        hours = self._hours_spec(spec) if spec is not None else self.default_hours
        return hours[day.weekday()]

    def is_company_working_day(self, day):
        return day.weekday() < 5 and not self.company_holiday(day)
