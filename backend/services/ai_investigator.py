"""AI Investigator — natural-language spending investigation via Ollama.

Pipeline: analytics JSON (from the Pandas engine) -> compact numeric context
-> strict prompt -> local open-weight model -> validated structured JSON.

The model NEVER sees raw transactions, only aggregated numbers. All amounts
it reports are cross-checked against those numbers before being returned.
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request

SEVERITIES = ("high", "medium", "low")


def get_config() -> dict:
    """Read config from the environment on every call (test-friendly)."""
    return {
        "host": os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/"),
        "model": os.environ.get("OLLAMA_MODEL", "qwen2.5:3b"),
        "timeout": float(os.environ.get("OLLAMA_TIMEOUT", "300")),
    }


class OllamaUnavailable(Exception):
    """Ollama is down or the model is missing. Message is user-facing."""


class OllamaTimeout(OllamaUnavailable):
    """The model was reachable but took too long (often cold-start loading)."""

    def __init__(self, timeout: float):
        super().__init__(f"timed out after {timeout:g}s")
        self.timeout = timeout


class InvestigationFailed(Exception):
    """The model could not produce a valid investigation. User-facing."""


SYSTEM_PROMPT = """You are Money Detective — a careful personal spending investigator.
You read aggregated spending analytics (all amounts in INR) and explain what
you find in simple, non-judgmental language.

STRICT RULES:
1. Only use numbers provided in the analytics context. Never invent transactions.
2. Never invent amounts. Every amount and percentage you report must appear in,
   or be directly computable from, the context.
3. Never claim guaranteed savings. Use words like "could" or "roughly".
4. Clearly distinguish facts (what the data shows) from recommendations (what
   the user could try).
5. Explain findings in simple language a non-expert understands.
6. Prioritize the most useful discoveries; skip trivial observations.
7. Avoid generic financial advice. Ground every point in THIS user's numbers.
8. Do not provide investment advice of any kind.
9. Do not shame the user for spending. Be investigative, not judgmental.
10. Never reveal raw transaction-level detail beyond merchant names and amounts
    already present in the context.
11. When you state a percentage, compute it as amount ÷ total_spending × 100
    using the exact totals above — never round from memory or guess. When in
    doubt, omit the percentage (null is allowed) rather than estimating.

SEVERITY GUIDE:
- "high": a large or fast-growing money leak worth acting on first.
- "medium": a real pattern worth watching or a moderate saving opportunity.
- "low": a minor observation or reassurance.

Respond with ONLY a single JSON object (no markdown, no commentary):
{
  "headline": "one sentence: the single biggest clue (string)",
  "findings": [
    {
      "severity": "high | medium | low",
      "title": "short finding title (string)",
      "description": "1-3 sentences, cites specific numbers (string)",
      "amount": <INR number from context, or null>,
      "percentage": <0-100 number from context, or null>
    }
  ],
  "recommendations": [
    {
      "title": "short action title (string)",
      "description": "1-2 sentences tied to a finding (string)",
      "potential_reduction": <monthly INR estimate, or null>
    }
  ]
}
Provide 3 to 5 findings and 1 to 4 recommendations."""


def build_context(analytics: dict) -> dict:
    """Shrink full analytics to the numeric essentials the model needs."""
    summary = analytics.get("summary", {})
    largest = summary.get("largest_transaction") or {}
    time_of_day = (analytics.get("timeline") or {}).get("time_of_day") or {}
    return {
        "currency": "INR",
        "period": summary.get("period"),
        "transaction_count": summary.get("transaction_count"),
        "total_income": summary.get("total_income"),
        "total_spending": summary.get("total_spending"),
        "net_balance": summary.get("net_balance"),
        "savings_rate_pct": summary.get("savings_rate"),
        "average_expense": summary.get("average_expense"),
        "largest_expense": {
            "merchant": largest.get("merchant"),
            "category": largest.get("category"),
            "amount": abs(float(largest.get("amount", 0) or 0)),
            "date": largest.get("date"),
        },
        "categories": [
            {
                "name": c.get("name"),
                "total": c.get("total"),
                "count": c.get("count"),
                "percentage": c.get("percentage"),
            }
            for c in (analytics.get("categories") or [])[:8]
        ],
        "top_merchants": [
            {"name": m.get("name"), "total": m.get("total"), "count": m.get("count")}
            for m in (analytics.get("merchants") or [])[:6]
        ],
        "monthly": [
            {"label": m.get("label"), "income": m.get("income"), "spending": m.get("spending")}
            for m in ((analytics.get("timeline") or {}).get("monthly") or [])
        ],
        "weekday_vs_weekend": ((analytics.get("timeline") or {}).get("weekday_vs_weekend")),
        "time_of_day": time_of_day,
        "rule_based_patterns": [
            {"title": p.get("title"), "detail": p.get("detail")}
            for p in (analytics.get("patterns") or [])
        ],
    }


def _collect_numbers(node: object, into: set[float]) -> None:
    if isinstance(node, bool):
        return
    if isinstance(node, (int, float)):
        into.add(float(node))
        into.add(abs(float(node)))
    elif isinstance(node, dict):
        for v in node.values():
            _collect_numbers(v, into)
    elif isinstance(node, (list, tuple)):
        for v in node:
            _collect_numbers(v, into)


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _grounded(value: float, numbers: set[float]) -> bool:
    return any(abs(value - n) <= max(1.0, 0.01 * abs(n)) for n in numbers)


def _validate(obj: object, numbers: set[float], total_spending: float) -> dict | None:
    """Normalize a model reply against the schema. None if unusable."""
    if not isinstance(obj, dict):
        return None
    headline = obj.get("headline")
    raw_findings = obj.get("findings")
    if not isinstance(headline, str) or not headline.strip():
        return None
    if not isinstance(raw_findings, list) or not raw_findings:
        return None

    findings = []
    for item in raw_findings[:5]:
        if not isinstance(item, dict):
            continue
        title = item.get("title")
        description = item.get("description")
        if not isinstance(title, str) or not title.strip():
            continue
        if not isinstance(description, str) or not description.strip():
            continue
        severity = str(item.get("severity", "medium")).lower()
        if severity not in SEVERITIES:
            severity = "medium"
        amount = item.get("amount")
        amount = (
            float(amount)
            if _is_number(amount) and float(amount) >= 0 and _grounded(float(amount), numbers)
            else None
        )
        percentage = item.get("percentage")
        if _is_number(percentage):
            percentage = float(percentage)
            consistent = any(
                abs(percentage - (a / t * 100)) <= 2.0
                for a in ([amount] if amount is not None else [])
                for t in numbers
                if t > 0
            )
            percentage = (
                percentage
                if (0 <= percentage <= 100 and (_grounded(percentage, numbers) or consistent))
                else None
            )
        else:
            percentage = None
        findings.append(
            {
                "severity": severity,
                "title": title.strip()[:120],
                "description": description.strip()[:600],
                "amount": amount,
                "percentage": percentage,
            }
        )
    if not findings:
        return None

    recommendations = []
    for item in (obj.get("recommendations") or [])[:4]:
        if not isinstance(item, dict):
            continue
        title = item.get("title")
        description = item.get("description")
        if not isinstance(title, str) or not title.strip():
            continue
        if not isinstance(description, str) or not description.strip():
            continue
        reduction = item.get("potential_reduction")
        # Reductions are proposals, not facts: allow novel estimates, but cap
        # them at total spending so wild claims cannot pass through.
        reduction = (
            float(reduction)
            if _is_number(reduction) and 0 < float(reduction) <= (total_spending or float("inf"))
            else None
        )
        recommendations.append(
            {
                "title": title.strip()[:120],
                "description": description.strip()[:400],
                "potential_reduction": reduction,
            }
        )

    return {
        "headline": headline.strip()[:200],
        "findings": findings,
        "recommendations": recommendations,
    }


def _extract_json(text: str) -> object:
    """Best-effort JSON recovery: raw, fenced, then balanced-brace scan."""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass
    candidates = []
    depth = 0
    start = -1
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start != -1:
                candidates.append(text[start : i + 1])
                start = -1
    for candidate in sorted(candidates, key=len, reverse=True):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    return None


def _post_json(url: str, payload: dict, timeout: float) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except TimeoutError as exc:
        raise OllamaTimeout(timeout) from exc
    except urllib.error.HTTPError as exc:
        try:
            body = exc.read().decode("utf-8")
        except Exception:
            body = ""
        raise OllamaUnavailable(
            f"Ollama returned HTTP {exc.code}: {body[:200]}"
        ) from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise OllamaUnavailable(str(exc)) from exc


def _get_json(url: str, timeout: float) -> dict:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise OllamaUnavailable(str(exc)) from exc


def setup_hint(host: str, model: str, reachable: bool) -> str:
    if not reachable:
        return (
            f"Ollama is not reachable at {host}. To enable the AI investigator: "
            f"install Ollama from https://ollama.com, run `ollama serve`, "
            f"then `ollama pull {model}` and try again."
        )
    return (
        f"The model `{model}` is not installed in Ollama. Run "
        f"`ollama pull {model}` (or set OLLAMA_MODEL to an installed model) "
        f"and try again."
    )


def check_status() -> dict:
    """Is Ollama up, and is the configured model installed?"""
    cfg = get_config()
    try:
        tags = _get_json(f"{cfg['host']}/api/tags", timeout=5)
    except OllamaUnavailable:
        return {
            "available": False,
            "model": cfg["model"],
            "model_present": False,
            "setup": setup_hint(cfg["host"], cfg["model"], reachable=False),
        }
    installed = [m.get("name", "") for m in tags.get("models", [])]
    present = any(
        name == cfg["model"] or name.startswith(cfg["model"] + ":")
        for name in installed
    )
    return {
        "available": True,
        "model": cfg["model"],
        "model_present": present,
        "setup": None if present else setup_hint(cfg["host"], cfg["model"], reachable=True),
    }


def _chat(messages: list[dict], cfg: dict) -> str:
    try:
        data = _post_json(
            f"{cfg['host']}/api/chat",
            {
                "model": cfg["model"],
                "messages": messages,
                "stream": False,
                "format": "json",
                # Skip chain-of-thought for reasoning models (qwen3 etc.):
                # far faster, and structured extraction needs the answer, not
                # the deliberation. Ignored by non-reasoning models.
                "think": False,
                "options": {"temperature": 0.2, "num_predict": 1500},
            },
            timeout=cfg["timeout"],
        )
    except OllamaTimeout:
        raise
    except OllamaUnavailable as exc:
        msg = str(exc)
        if "404" in msg or "not found" in msg.lower():
            raise OllamaUnavailable(
                setup_hint(cfg["host"], cfg["model"], reachable=True)
            ) from exc
        raise OllamaUnavailable(
            setup_hint(cfg["host"], cfg["model"], reachable=False)
        ) from exc
    content = ((data.get("message") or {}).get("content") or "").strip()
    if not content:
        raise InvestigationFailed("The model returned an empty response.")
    return content


def investigate(analytics: dict) -> dict:
    """Run the full AI investigation. Raises OllamaUnavailable/InvestigationFailed."""
    cfg = get_config()
    context = build_context(analytics)
    numbers: set[float] = set()
    _collect_numbers(context, numbers)
    total_spending = float(context.get("total_spending") or 0)

    user_prompt = (
        "Here is the spending analysis (all amounts in INR):\n"
        f"{json.dumps(context)}\n\n"
        "Investigate this spending and return 3 to 5 findings plus 1 to 4 "
        "recommendations as the JSON object specified."
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    last_error = "no valid findings"
    for attempt in ("initial", "repair"):
        if attempt == "repair":
            messages.append(
                {
                    "role": "user",
                    "content": (
                        "Your previous reply was not valid JSON matching the schema. "
                        "Reply again with ONLY the JSON object — no markdown, no commentary."
                    ),
                }
            )
        content = _chat(messages, cfg)
        messages.append({"role": "assistant", "content": content})
        parsed = _extract_json(content)
        if parsed is None:
            last_error = "response was not valid JSON"
            continue
        result = _validate(parsed, numbers, total_spending)
        if result is None:
            last_error = "response did not match the required schema"
            continue
        result["model"] = cfg["model"]
        return result

    raise InvestigationFailed(
        f"The AI investigator could not produce a valid report ({last_error}). "
        "Please try again — a different sampling may succeed."
    )
