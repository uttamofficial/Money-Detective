"""Money Detective API — CSV in, structured spending analysis out."""

from __future__ import annotations

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from services import ai_investigator
from services.ai_investigator import (
    InvestigationFailed,
    OllamaTimeout,
    OllamaUnavailable,
)
from services.analytics import analyze
from services.categorizer import categorize
from services.csv_parser import MAX_FILE_BYTES, CSVParseError, parse_csv

app = FastAPI(title="Money Detective API", version="0.1.0")

# Local Next.js dev server. Tighten for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "money-detective"}


@app.post("/api/analyze")
async def analyze_csv(file: UploadFile = File(...)) -> dict:
    """Receive a transaction CSV, parse, categorize, analyze, return JSON."""
    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a .csv file.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File is larger than 10 MB.")

    try:
        df = parse_csv(content)
    except CSVParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    df = categorize(df)
    return analyze(df)


@app.get("/api/ai-status")
def ai_status() -> dict:
    """Is Ollama reachable and is the configured model installed?"""
    return ai_investigator.check_status()


@app.post("/api/investigate")
def investigate(analytics: dict = Body(...)) -> dict:
    """Run the local-AI investigation over a prior /api/analyze result."""
    summary = analytics.get("summary") if isinstance(analytics, dict) else None
    if not isinstance(summary, dict) or "total_spending" not in summary:
        raise HTTPException(
            status_code=400,
            detail="Expected the JSON produced by /api/analyze "
            "(object with summary, categories, merchants, timeline, patterns).",
        )
    try:
        return ai_investigator.investigate(analytics)
    except OllamaTimeout as exc:
        raise HTTPException(
            status_code=504,
            detail=f"The local AI model took longer than {exc.timeout:g}s to respond "
            "(this often happens on the first run while the model loads into memory). "
            "Please try again in a moment.",
        ) from exc
    except OllamaUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except InvestigationFailed as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
