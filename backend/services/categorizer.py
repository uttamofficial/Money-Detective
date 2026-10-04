"""Rule-based transaction categorization.

Keyword rules live in CATEGORY_RULES below — edit that dict to change
behaviour. No LLM involved: categorization is deterministic and instant.
"""

from __future__ import annotations

import re

import pandas as pd

# Category -> keywords (matched as substrings, case-insensitive).
# Order matters: the first matching category wins, so keep "Income" first.
CATEGORY_RULES: dict[str, list[str]] = {
    "Income": [
        "salary",
        "stipend",
        "payroll",
        "freelance",
        "consulting fee",
        "interest payout",
        "dividend",
    ],
    "Rent": ["rent", "landlord", "housing society", "nestaway", "stanza", "maintenance"],
    "Groceries": [
        "dmart",
        "bigbasket",
        "blinkit",
        "zepto",
        "grofers",
        "reliance fresh",
        "more supermarket",
        "grocery",
        "groceries",
        "kirana",
        "spencer",
    ],
    "Food": [
        "swiggy",
        "zomato",
        "dominos",
        "pizza",
        "mcdonald",
        "kfc",
        "burger",
        "restaurant",
        "cafe",
        "coffee",
        "chai",
        "bakery",
        "biryani",
        "lunch",
        "dinner",
        "breakfast",
        "food",
    ],
    "Transport": [
        "uber",
        "ola",
        "rapido",
        "metro",
        "bmtc",
        "fastag",
        "petrol",
        "fuel",
        "parking",
        "redbus",
        "irctc",
        "indigo",
        "flight",
        "cab",
        "toll",
    ],
    "Shopping": [
        "amazon",
        "flipkart",
        "myntra",
        "ajio",
        "decathlon",
        "ikea",
        "nykaa",
        "croma",
        "shopping",
        "mall",
        "lifestyle",
        "apple store",
    ],
    "Bills": [
        "electricity",
        "bescom",
        "bses",
        "tata power",
        "water bill",
        "gas bill",
        "jio",
        "airtel",
        "vodafone",
        "broadband",
        "fibernet",
        "wifi",
        "recharge",
        "insurance",
        "emi",
        "bill",
    ],
    "Entertainment": [
        "netflix",
        "spotify",
        "prime video",
        "hotstar",
        "bookmyshow",
        "pvr",
        "inox",
        "movie",
        "concert",
        "gaming",
        "playstation",
        "xbox",
    ],
    "Healthcare": [
        "apollo",
        "pharmacy",
        "medical",
        "hospital",
        "clinic",
        "diagnostic",
        "1mg",
        "pharmeasy",
        "doctor",
        "dental",
    ],
    "Education": [
        "udemy",
        "coursera",
        "course",
        "tuition",
        "school",
        "college",
        "exam",
        "kindle",
        "books",
        "workshop",
    ],
}

PAYMENT_MODE_PREFIXES = {
    "UPI",
    "NEFT",
    "IMPS",
    "RTGS",
    "NACH",
    "ACH",
    "POS",
    "ATM",
    "WDL",
    "DEP",
    "TRF",
    "INB",
}


def categorize_description(description: str) -> str:
    """Return the category for a single description string."""
    lowered = description.lower()
    for category, keywords in CATEGORY_RULES.items():
        if any(kw in lowered for kw in keywords):
            return category
    return "Other"


def extract_merchant(description: str) -> str:
    """Best-effort merchant name from a narration like 'UPI-SWIGGY-DINNER'."""
    text = (description or "").strip()
    if not text:
        return "Unknown"
    parts = [p.strip() for p in re.split(r"\s*[-|/@:]\s*", text) if p.strip()]
    for part in parts:
        cleaned = re.sub(r"\d{4,}", "", part).strip()
        if not cleaned:
            continue
        if cleaned.upper() in PAYMENT_MODE_PREFIXES:
            continue
        if not re.search(r"[a-zA-Z]", cleaned):
            continue
        return cleaned.title()[:40]
    return parts[0].title()[:40] if parts else "Unknown"


def categorize(df: pd.DataFrame) -> pd.DataFrame:
    """Add category, transaction_type and merchant columns. Pure function."""
    out = df.copy()
    out["category"] = out["description"].map(categorize_description)
    out["transaction_type"] = out["amount"].map(lambda a: "income" if a > 0 else "expense")
    out["merchant"] = out["description"].map(extract_merchant)
    return out
