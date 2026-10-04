"""Flexible CSV parsing with intelligent column detection.

Accepts the messy column names real bank/UPI exports use and normalizes
everything into: date, description, amount (+ transaction metadata).
"""

from __future__ import annotations

import io
import re

import pandas as pd
from dateutil import parser as date_parser

MAX_FILE_BYTES = 10 * 1024 * 1024


class CSVParseError(ValueError):
    """Raised when an uploaded file cannot be turned into transactions."""


# All matching is done on normalized names: lowercase, underscores -> spaces.
DATE_COLUMNS = [
    "date",
    "transaction date",
    "transactiondate",
    "txn date",
    "value date",
    "posted date",
    "booking date",
    "timestamp",
]

DESCRIPTION_COLUMNS = [
    "description",
    "merchant",
    "narration",
    "details",
    "name",
    "particulars",
    "transaction details",
    "transactiondetails",
    "remarks",
    "label",
]

AMOUNT_COLUMNS = [
    "amount",
    "transaction amount",
    "transactionamount",
    "txn amount",
    "net amount",
    "value",
]

DEBIT_COLUMNS = [
    "debit",
    "withdrawal",
    "withdrawals",
    "dr",
    "paid out",
    "money out",
    "debits",
]

CREDIT_COLUMNS = [
    "credit",
    "deposit",
    "deposits",
    "cr",
    "paid in",
    "money in",
    "credits",
]


def _normalize(name: object) -> str:
    return re.sub(r"[\s_]+", " ", str(name).strip().lower())


def _parse_dates(series: pd.Series) -> pd.Series:
    """Two-pass parsing: strict ISO-8601 first (unambiguous), then dateutil
    with dayfirst for regional formats like DD-MM-YYYY.

    (dateutil applies dayfirst even to ISO strings, so it must not see them.
    pandas' mixed-format fast path ignores dayfirst entirely — hence this.)
    """
    s = series.astype(str).str.strip()
    dates = pd.to_datetime(s, format="ISO8601", errors="coerce")
    missing = dates.isna()
    if missing.any():
        fallback = []
        for value in s[missing]:
            try:
                fallback.append(date_parser.parse(value, dayfirst=True))
            except (ValueError, OverflowError, TypeError):
                fallback.append(pd.NaT)
        dates.loc[missing] = pd.to_datetime(pd.Series(fallback), errors="coerce").to_numpy()
    try:
        dates = dates.dt.tz_localize(None)
    except (TypeError, AttributeError, ValueError):
        pass
    return dates


def _find(columns: list[str], candidates: list[str]) -> str | None:
    """Exact match first, then substring match (either direction)."""
    normed = {_normalize(c): c for c in columns}
    for cand in candidates:
        if cand in normed:
            return normed[cand]
    for cand in candidates:
        for key, original in normed.items():
            if cand in key or key in cand:
                return original
    return None


def _to_number(series: pd.Series) -> pd.Series:
    """Parse human-written money: '₹1,240', '(500)', '250 Dr', ..."""
    s = series.astype(str).str.strip()
    paren_negative = s.str.startswith("(") & s.str.endswith(")")
    dr_suffix = s.str.lower().str.endswith("dr")
    s = s.str.replace(r"[₹$,\s]", "", regex=True)
    s = s.str.replace(r"[()]", "", regex=True)
    s = s.str.replace(r"(?i)(dr|cr)$", "", regex=True)
    num = pd.to_numeric(s, errors="coerce")
    num = num.mask(paren_negative, -num.abs())
    num = num.mask(dr_suffix, -num.abs())
    return num


def detect_columns(columns: list[str]) -> dict:
    """Map raw CSV headers to canonical roles. Raises CSVParseError."""
    date_col = _find(columns, DATE_COLUMNS)
    desc_col = _find(columns, DESCRIPTION_COLUMNS)
    amount_col = _find(columns, AMOUNT_COLUMNS)
    debit_col = _find(columns, DEBIT_COLUMNS)
    credit_col = _find(columns, CREDIT_COLUMNS)

    if date_col is None:
        raise CSVParseError(
            f"Could not find a date column. Looked for names like "
            f"{DATE_COLUMNS[:4]}; found columns: {columns}."
        )
    if desc_col is None:
        raise CSVParseError(
            f"Could not find a description column. Looked for names like "
            f"{DESCRIPTION_COLUMNS[:4]}; found columns: {columns}."
        )
    if amount_col is None and (debit_col is None or credit_col is None):
        # A lone debit/withdrawal column also works (all spends).
        lone_debit = debit_col is not None and credit_col is None
        lone_credit = credit_col is not None and debit_col is None
        if not (lone_debit or lone_credit):
            raise CSVParseError(
                f"Could not find an amount column. Looked for names like "
                f"{AMOUNT_COLUMNS[:3]} or a debit/credit pair; "
                f"found columns: {columns}."
            )
    return {
        "date": date_col,
        "description": desc_col,
        "amount": amount_col,
        "debit": debit_col,
        "credit": credit_col,
    }


def parse_csv(content: bytes) -> pd.DataFrame:
    """Parse raw CSV bytes into a normalized transactions DataFrame.

    Returns columns: date (datetime64), description (str), amount (float).
    Amounts are signed: positive = money in, negative = money out.
    Sets df.attrs["has_time"] True when any timestamp carries a time.
    """
    if not content or not content.strip():
        raise CSVParseError("The uploaded file is empty.")
    if len(content) > MAX_FILE_BYTES:
        raise CSVParseError("File is larger than 10 MB. Please upload a smaller export.")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("cp1252")
        except UnicodeDecodeError as exc:
            raise CSVParseError("Could not read the file encoding. Please upload a UTF-8 CSV.") from exc

    try:
        raw = pd.read_csv(io.StringIO(text))
    except Exception as exc:
        raise CSVParseError(f"Could not parse the CSV: {exc}") from exc

    if raw.shape[1] < 2:
        raise CSVParseError("The CSV needs at least a date and an amount column.")

    columns = [str(c) for c in raw.columns]
    roles = detect_columns(columns)

    dates = _parse_dates(raw[roles["date"]])

    descriptions = raw[roles["description"]].fillna("").astype(str).str.strip()

    if roles["amount"] is not None:
        amounts = _to_number(raw[roles["amount"]])
    elif roles["debit"] is not None and roles["credit"] is not None:
        amounts = _to_number(raw[roles["credit"]].fillna(0)) - _to_number(
            raw[roles["debit"]].fillna(0)
        )
    elif roles["debit"] is not None:
        amounts = -_to_number(raw[roles["debit"]]).abs()
    else:  # lone credit column
        amounts = _to_number(raw[roles["credit"]]).abs()

    df = pd.DataFrame(
        {"date": dates, "description": descriptions, "amount": amounts}
    )
    df = df.dropna(subset=["date", "amount"])
    df = df[df["description"] != ""]
    df = df.sort_values("date").reset_index(drop=True)

    if df.empty:
        raise CSVParseError("No usable transactions found (need a valid date and amount per row).")

    df.attrs["has_time"] = bool(
        ((df["date"].dt.hour != 0) | (df["date"].dt.minute != 0)).any()
    )
    return df
