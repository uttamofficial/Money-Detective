# Money Detective

> Your spending has clues. We investigate them.

My friend kept reaching the end of the month wondering where their money went.
Instead of building another expense tracker, I built a **spending detective**
that investigates transaction data and explains the patterns hiding inside it.

Upload a transaction CSV → get analytics → get an AI-written investigation →
ask follow-up questions. All numbers are computed locally with Python; all
language is generated locally with an open-weight model.

## Problem

Bank statements tell you *what* you spent, never *why it matters*. End-of-month
confusion ("where did it all go?") comes from patterns — weekend drift,
late-night orders, forgotten subscriptions, one budget-eating category — that
are invisible in a raw transaction list.

## Solution

Money Detective treats your statement like a case file:

1. **Upload** — drop in any bank/UPI CSV export (flexible column detection).
2. **Analyze** — a Pandas engine categorizes every transaction and computes
   totals, trends, merchants, rhythms, and 8 explainable patterns.
3. **Investigate** — a local open-weight model (Ollama) reads the structured
   analysis and writes up its findings in plain, non-judgmental language.
4. **Ask** — interrogate your own numbers; every answer cites your data.

## Features

- CSV transaction analysis (flexible headers, debit/credit pairs, IST-friendly dates)
- Automatic rule-based categorization (easy to extend, no LLM needed)
- Spending pattern detection (late-night, weekend, subscriptions, spikes, …)
- AI investigation via local Ollama — findings with severity, amounts, percentages
- Conversational spending analysis grounded in your numbers
- Local open-source AI — no proprietary API, no data leaving your machine
- One-click demo on fictional data (`data/sample_transactions.csv`)

## Architecture

```text
Transaction CSV
      ↓
Pandas Analytics        (parse → categorize → totals/trends/merchants)
      ↓
Pattern Detection       (8 explainable, number-backed patterns)
      ↓
Structured Context      (compact JSON — the model never sees raw rows)
      ↓
Local Ollama            (localhost — nothing sent to any cloud)
      ↓
Open-weight LLM         (default qwen2.5:3b, swappable via OLLAMA_MODEL)
      ↓
Investigation           (validated JSON: headline, findings, recommendations)
```

Why this shape matters: the LLM does what it is good at (explaining) and never
what it is bad at (arithmetic). Every amount it reports is cross-checked
against the analytics before it reaches the screen.

## Tech Stack

- Next.js + TypeScript + Tailwind CSS
- Recharts (spending breakdown & trends)
- FastAPI + Pandas + NumPy (analytics engine)
- Ollama + open-weight LLM (local AI investigator)

## Running Locally

Three terminals (or one, in order). From the project root:

```bash
# 1. Frontend
npm install
cp .env.example .env.local   # points the app at localhost:8000
npm run dev                  # → http://localhost:3000
```

```bash
# 2. Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn main:app --port 8000
```

```bash
# 3. Local AI (optional — everything except the AI write-up works without it)
ollama serve
ollama pull qwen2.5:3b
```

Then open the app and click **Try Demo Data** — the full pipeline runs on the
fictional statement in `data/sample_transactions.csv`.

## Environment Variables

| Variable           | Default                   | Used by  | Meaning                                            |
| ------------------ | ------------------------- | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | _(same-origin)_          | frontend | Backend address. Leave unset on Vercel; set to `http://localhost:8000` in `.env.local` for plain local dev |
| `OLLAMA_HOST`      | `http://localhost:11434`  | backend  | Ollama server address                |
| `OLLAMA_MODEL`     | `qwen2.5:3b`              | backend  | Model used for investigations        |
| `OLLAMA_TIMEOUT`   | `300`                     | backend  | Seconds to wait for a model reply    |
| `RENDER_BACKEND_URL` | _(unset)_               | frontend (proxy routes) | External backend base URL (e.g. Render). Server-only; takes precedence over the `BACKEND_URL` binding when both are set |

Example: `OLLAMA_MODEL=qwen3:8b .venv/bin/python -m uvicorn main:app --port 8000`

## Deploying on Vercel

`vercel.json` deploys this repo as one project with two services: `app`
(Next.js) and `backend` (FastAPI, internal-only — it receives no public
traffic). All traffic goes to `app`, which serves the site plus same-origin
proxy routes (`/api/analyze`, `/api/investigate`, `/api/ai-status`,
`/api/health`, alongside its own `/api/demo-csv`). Each proxy forwards to
the backend through the `BACKEND_URL` **binding** declared on the `app`
service — Vercel injects the backend's internal URL at runtime, so the
browser needs no backend URL configured. Do **not** set
`NEXT_PUBLIC_API_URL` in the Vercel project settings.

If the backend is hosted externally instead (e.g. Render rather than a
Vercel service), set `RENDER_BACKEND_URL` to its base URL in the Vercel
project settings — the proxies prefer it over the binding, and the browser
still only ever talks same-origin, so the external URL is never exposed.

Two deployment realities to know:

- **Ollama doesn't run on Vercel.** The deployed backend can't reach a local
  model, so `/api/ai-status` reports unavailable and the dashboard shows the
  setup panel instead of AI findings. Upload, analytics, charts, patterns,
  and Q&A all work. Point `OLLAMA_HOST` at a reachable Ollama server if you
  have one.
- **Long AI calls vs. function limits.** `/api/investigate` can take minutes;
  the route sets `maxDuration = 300`, but the effective cap is your Vercel
  plan's (60s on Hobby). On time-constrained plans the investigation may
  time out while analytics stay instant — the UI surfaces this as a retryable
  error.

## Project Structure

```text
app/                     # Next.js routes: landing, upload, dashboard, demo-csv API
components/
  dashboard/             # KPI cards, charts, investigation, Q&A, recommendations
  upload/                # drag-and-drop uploader, one-click demo button
  layout/ / ui/          # navbar, footer, shadcn-style primitives
lib/                     # API client, analytics→dashboard adapter, grounded Q&A
data/
  sample_transactions.csv  # 247 fictional Indian transactions (demo + tests)
backend/
  main.py                # FastAPI: /api/analyze, /api/investigate, /api/ai-status
  services/
    csv_parser.py        # flexible column detection + normalization
    categorizer.py       # rule-based categories (edit CATEGORY_RULES)
    analytics.py         # summary, categories, merchants, timeline, patterns, moves
    ai_investigator.py   # prompt building, Ollama client, JSON repair, grounding checks
  generate_sample_csv.py # regenerates the fictional demo statement
  requirements.txt
```

## Privacy

Money Detective is designed for local processing: the CSV is analyzed by a
backend you run yourself, and the AI investigation is performed by a model
running on your own machine via Ollama. Transaction data is never sent to a
third-party cloud or a proprietary AI API, and the backend stores nothing —
close the tab and your data is gone from the browser. (Telemetry: none.
Accounts: none. What leaves your machine: nothing, unless you deploy it
somewhere yourself.)

## Why Open Innovation?

A closed AI API was the wrong tool for this particular application:

- **Financial information is sensitive.** Routing statements through someone
  else's servers — for every user, on every investigation — multiplies exposure
  with zero product benefit, since the analysis already happens locally.
- **The job needs explaining, not omniscience.** A small open-weight model,
  handed precise pre-computed numbers, writes excellent findings. No frontier
  model required.
- **Users stay in control.** They can inspect the prompt, swap the model with
  one environment variable, run fully offline after download, and pay nothing
  per investigation.
- **The project stays reproducible.** Any judge, friend, or contributor can run
  the exact same stack — no API keys, no gated access, no bill.

Open weights turn the AI from a service you rent into a component you own,
which is precisely what a tool handling people's money should be built on.
