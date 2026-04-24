# Timesheet-AI 🔴

**Agent AI offline per il controllo automatico dei timesheet aziendali.**

Sviluppato per **Smeup** — Sistema basato su Google Gemma 2 (2B) tramite Ollama, completamente locale e senza invio di dati all'esterno.

---

## Funzionalità

- 📂 **Upload CSV/Excel** — Caricamento file con rilevamento automatico dell'encoding
- 🔴 **Bande di Errore** — Visualizzazione degli errori come bande rosse sopra le righe errate
- ✨ **Animazione Magica** — Animazione con stelle durante l'elaborazione AI
- 🤖 **Generatore Regole IA** — Descrivi la regola in italiano, l'AI genera il codice Python
- ⚡ **Toggle Regole** — Attiva/disattiva le regole senza eliminarle
- ✏️ **Editing Regole** — Modifica le regole esistenti al volo
- 🌗 **Dark/Light Mode** — Tema chiaro e scuro con memoria nel browser
- 📄 **Export PDF** — Genera un report PDF del controllo in un click
- 🌐 **IP Intelligente** — Ricorda l'ultimo IP dell'agente AI usato

---

## Stack Tecnologico

| Componente | Tecnologia |
|---|---|
| Backend | FastAPI (Python) |
| AI Engine | Google Gemma 2 (2B) via Ollama |
| Database | SQLite |
| Frontend | HTML, CSS (Vanilla), JavaScript |
| Font | Nunito (Google Fonts) |
| Particelle | tsParticles |
| Export PDF | html2pdf.js |

---

## Requisiti

- Python 3.10+
- [Ollama](https://ollama.com/) installato con il modello `gemma2:2b`
- 8–12 GB RAM consigliati (la VM ESXi non richiede GPU)

---

## Installazione

```bash
# Clona il repository
git clone https://github.com/mantovanellimatteo/timesheet-ai.git
cd timesheet-ai

# Crea e attiva l'ambiente virtuale
python3 -m venv venv
source venv/bin/activate  # Su Windows: venv\Scripts\activate

# Installa le dipendenze
pip install fastapi uvicorn pandas openpyxl requests python-multipart

# Avvia il server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Apri il browser su `http://localhost:8000`

---

## Configurazione Ollama

```bash
# Installa Ollama (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Scarica il modello Gemma 2
ollama pull gemma2:2b

# Avvia il server Ollama
ollama serve
```

---

## Struttura del Progetto

```
timesheet-ai/
├── main.py              # Backend FastAPI
├── static/
│   ├── index.html       # Interfaccia utente
│   ├── styles.css       # Stili (tema Smeup)
│   ├── script.js        # Logica frontend
│   └── logo.png         # Logo aziendale
└── README.md
```

---

## Come usare il Rule Engine

Le regole si basano su espressioni Python dove `row` è il dizionario della riga del file.

**Esempio — Gettoni non multipli di 15 minuti:**
```python
str(row.get('Gruppo Timesheet', '')).strip().upper() == 'CLI GETTONI' and float(row.get('Ore', 0)) % 0.25 != 0
```

**Esempio — Gettoni fuori orario:**
```python
str(row.get('Gruppo Timesheet', '')).strip().upper() == 'CLI GETTONI' and str(row.get('Tipo Orario', '')).strip().upper() == 'FUORI ORARIO LAVORATIVO'
```

Oppure usa il **Generatore IA** integrato: descrivi la regola in italiano e Gemma 2 scriverà il codice Python per te!

---

## Licenza

Uso interno aziendale — Smeup SpA
