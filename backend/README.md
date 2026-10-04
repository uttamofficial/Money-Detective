# Money Detective — Backend

FastAPI + Pandas analytics engine. CSV in, structured spending analysis out.
Parsing, categorization, arithmetic, and pattern detection are deterministic
Python; only the natural-language investigation uses a local LLM (Ollama).

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Run

```bash
.venv/bin/python -m uvicorn main:app --port 8000
```

- Health: `GET http://localhost:8000/api/health`
- Analyze: `POST http://localhost:8000/api/analyze` (multipart `file`, `.csv`, ≤ 10 MB)
- AI status: `GET http://localhost:8000/api/ai-status`
- Investigate: `POST http://localhost:8000/api/investigate` (JSON from `/api/analyze`)

The frontend (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000`) posts
uploads here and renders the returned JSON on the dashboard.

## Local AI (Ollama)

```bash
ollama serve
ollama pull qwen2.5:3b
OLLAMA_MODEL=qwen2.5:3b .venv/bin/python -m uvicorn main:app --port 8000
```

| Variable        | Default                 | Meaning                              |
| --------------- | ----------------------- | ------------------------------------ |
| `OLLAMA_HOST`   | `http://localhost:11434` | Ollama server address               |
| `OLLAMA_MODEL`  | `qwen2.5:3b`            | Model used for investigations        |
| `OLLAMA_TIMEOUT`| `300`                   | Seconds to wait for a model reply    |

No model name is hardcoded — everything reads `OLLAMA_MODEL`. If Ollama is
down or the model is missing, `/api/investigate` returns a helpful setup
message and the rest of the app (upload, analytics, charts, patterns) keeps
working.

## Try it

```bash
.venv/bin/python generate_sample_csv.py   # writes data/sample_transactions.csv (247 txns)
curl -X POST http://localhost:8000/api/analyze \
  -F "file=@../data/sample_transactions.csv;type=text/csv"
```

## Layout

```text
main.py                  # FastAPI app, CORS, /api/analyze, /api/health
services/csv_parser.py   # flexible column detection + normalization
services/categorizer.py  # rule-based categories (edit CATEGORY_RULES)
services/analytics.py    # summary, categories, merchants, timeline,
                         # patterns, and rule-based next moves
generate_sample_csv.py   # realistic 6-month sample statement
```
