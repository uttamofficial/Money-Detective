"""Pandas-powered analytics: summary, categories, merchants, timeline,
explainable pattern detection, and rule-based next moves.

All arithmetic happens here with pandas/numpy. No LLM is involved.
"""

from __future__ import annotations

import pandas as pd

LATE_NIGHT_HOUR = 21  # transactions at/after 9 PM count as late-night
SMALL_TXN_CAP = 500  # frequent-small-purchase threshold (INR)
LARGE_TXN_MULTIPLE = 3.0  # expense > 3x the average expense = large
SPIKE_MULTIPLE = 2.0  # day spending > 2x the daily mean = spike
CONCENTRATION_PCT = 30.0  # category share of spending that counts as concentration
DISCRETIONARY = {"Food", "Shopping", "Entertainment", "Groceries"}


def _r(x: float) -> float:
    return round(float(x), 2)


def format_inr(value: float) -> str:
    """Indian digit grouping: 46280 -> '₹46,280'."""
    n = int(round(value))
    sign = "-" if n < 0 else ""
    s = str(abs(n))
    if len(s) <= 3:
        return f"{sign}₹{s}"
    tail, head = s[-3:], s[:-3]
    groups = []
    while len(head) > 2:
        groups.append(head[-2:])
        head = head[:-2]
    groups.append(head)
    return f"{sign}₹{','.join(reversed(groups))},{tail}"


def compute_summary(df: pd.DataFrame) -> dict:
    income = df.loc[df["transaction_type"] == "income", "amount"].sum()
    expenses = df.loc[df["transaction_type"] == "expense", "amount"].abs()
    total_spending = float(expenses.sum())
    total_income = float(income)
    count = int(len(df))

    largest = None
    if not expenses.empty:
        idx = expenses.idxmax()
        row = df.loc[idx]
        largest = {
            "date": row["date"].date().isoformat(),
            "description": row["description"],
            "merchant": row["merchant"],
            "category": row["category"],
            "amount": _r(row["amount"]),
        }

    savings_rate = _r((total_income - total_spending) / total_income * 100) if total_income else 0.0
    return {
        "total_income": _r(total_income),
        "total_spending": _r(total_spending),
        "net_balance": _r(total_income - total_spending),
        "transaction_count": count,
        "average_transaction": _r(df["amount"].abs().mean()) if count else 0.0,
        "average_expense": _r(expenses.mean()) if not expenses.empty else 0.0,
        "largest_transaction": largest,
        "savings_rate": savings_rate,
        "period": {
            "start": df["date"].min().date().isoformat(),
            "end": df["date"].max().date().isoformat(),
            "days": int((df["date"].max().date() - df["date"].min().date()).days) + 1,
        },
    }


def compute_categories(df: pd.DataFrame, total_spending: float) -> list[dict]:
    expenses = df[df["transaction_type"] == "expense"]
    if expenses.empty:
        return []
    grouped = expenses.groupby("category")["amount"].agg(["sum", "count", "mean"])
    out = []
    for name, row in grouped.iterrows():
        total = abs(float(row["sum"]))
        out.append(
            {
                "name": str(name),
                "total": _r(total),
                "count": int(row["count"]),
                "percentage": _r(total / total_spending * 100) if total_spending else 0.0,
                "average": _r(abs(float(row["mean"]))),
            }
        )
    return sorted(out, key=lambda c: c["total"], reverse=True)


def compute_merchants(df: pd.DataFrame, top_n: int = 8) -> list[dict]:
    expenses = df[df["transaction_type"] == "expense"]
    if expenses.empty:
        return []
    grouped = expenses.groupby("merchant")["amount"].agg(["sum", "count", "mean"])
    out = []
    for name, row in grouped.iterrows():
        total = abs(float(row["sum"]))
        out.append(
            {
                "name": str(name),
                "total": _r(total),
                "count": int(row["count"]),
                "average": _r(abs(float(row["mean"]))),
            }
        )
    return sorted(out, key=lambda m: m["total"], reverse=True)[:top_n]


def compute_timeline(df: pd.DataFrame, has_time: bool) -> dict:
    expenses = df[df["transaction_type"] == "expense"].copy()
    income = df[df["transaction_type"] == "income"].copy()
    expenses["day"] = expenses["date"].dt.date
    income["day"] = income["date"].dt.date

    daily_spend = expenses.groupby("day")["amount"].sum().abs()
    daily_income = income.groupby("day")["amount"].sum()
    days = sorted(set(daily_spend.index) | set(daily_income.index))
    daily = [
        {
            "date": d.isoformat(),
            "spending": _r(daily_spend.get(d, 0.0)),
            "income": _r(daily_income.get(d, 0.0)),
        }
        for d in days
    ]

    tmp = df.copy()
    tmp["week"] = tmp["date"].dt.to_period("W").astype(str)
    weekly_rows = tmp.groupby("week")
    weekly = [
        {
            "week": week,
            "week_start": g["date"].min().date().isoformat(),
            "spending": _r(g.loc[g["transaction_type"] == "expense", "amount"].abs().sum()),
            "income": _r(g.loc[g["transaction_type"] == "income", "amount"].sum()),
        }
        for week, g in weekly_rows
    ]

    tmp["month"] = tmp["date"].dt.to_period("M").astype(str)
    monthly = []
    for month, g in tmp.groupby("month"):
        dt = pd.Period(month, freq="M")
        monthly.append(
            {
                "month": month,
                "label": dt.strftime("%b"),
                "spending": _r(g.loc[g["transaction_type"] == "expense", "amount"].abs().sum()),
                "income": _r(g.loc[g["transaction_type"] == "income", "amount"].sum()),
            }
        )

    weekday_mask = df["date"].dt.weekday < 5
    weekend_mask = ~weekday_mask
    weekend_days = int(weekend_mask.sum())
    weekday_days = int(weekday_mask.sum())
    weekend_total = float(df.loc[weekend_mask & (df["transaction_type"] == "expense"), "amount"].abs().sum())
    weekday_total = float(df.loc[weekday_mask & (df["transaction_type"] == "expense"), "amount"].abs().sum())

    timeline: dict = {
        "daily": daily,
        "weekly": weekly,
        "monthly": monthly,
        "weekday_vs_weekend": {
            "weekday_total": _r(weekday_total),
            "weekend_total": _r(weekend_total),
            "weekday_daily_avg": _r(weekday_total / weekday_days) if weekday_days else 0.0,
            "weekend_daily_avg": _r(weekend_total / weekend_days) if weekend_days else 0.0,
            "ratio": _r((weekend_total / weekend_days) / (weekday_total / weekday_days))
            if weekday_days and weekend_days and weekday_total
            else 0.0,
        },
        "time_of_day": None,
    }

    if has_time:
        # Only rows that actually carry a clock time count toward buckets.
        # Date-only rows parse as midnight and must NOT pollute "late night".
        exp_dt = df.loc[df["transaction_type"] == "expense", "date"]
        timed = exp_dt[((exp_dt.dt.hour != 0) | (exp_dt.dt.minute != 0))]
        hours = timed.dt.hour
        timed_idx = set(timed.index)
        totals: dict[str, float] = {}
        counts: dict[str, int] = {}
        for name, in_range in [
            ("morning", (hours >= 5) & (hours <= 11)),
            ("afternoon", (hours >= 12) & (hours <= 16)),
            ("evening", (hours >= 17) & (hours <= 20)),
            ("late_night", (hours >= 21) | (hours < 5)),
        ]:
            idx = hours[in_range].index
            counts[name] = int(len(idx))
            totals[name] = _r(df.loc[df.index.isin(idx), "amount"].abs().sum())
        untimed_idx = df.loc[
            (df["transaction_type"] == "expense")
            & ~df.index.isin(timed_idx)
        ].index
        timeline["time_of_day"] = {
            name: {"count": counts[name], "total": totals[name]}
            for name in counts
        } | {
            "untimed": {
                "count": int(len(untimed_idx)),
                "total": _r(df.loc[df.index.isin(untimed_idx), "amount"].abs().sum()),
            }
        }

    return timeline


def detect_patterns(
    df: pd.DataFrame,
    summary: dict,
    categories: list[dict],
    timeline: dict,
    has_time: bool,
    large: pd.DataFrame,
) -> list[dict]:
    """Explainable, number-backed patterns. Every claim cites real figures."""
    expenses = df[df["transaction_type"] == "expense"]
    patterns: list[dict] = []
    avg_expense = summary["average_expense"]

    # 1. Late-night spending (needs timestamps)
    if has_time and timeline["time_of_day"]:
        late = timeline["time_of_day"]["late_night"]
        if late["count"] > 0:
            share = late["total"] / summary["total_spending"] * 100 if summary["total_spending"] else 0
            patterns.append(
                {
                    "id": "late-night",
                    "title": "Late-night spending adds up",
                    "detail": (
                        f"{late['count']} transactions after 9 PM total "
                        f"{format_inr(late['total'])} — {share:.0f}% of all spending. "
                        "Late orders tend to be impulse, not planned."
                    ),
                    "tag": "Pattern" if late["count"] < 8 else "Watch out",
                    "tone": "watch" if late["count"] < 8 else "alert",
                }
            )

    # 2. Weekend vs weekday
    wvw = timeline["weekday_vs_weekend"]
    if wvw["ratio"] >= 1.5:
        patterns.append(
            {
                "id": "weekend",
                "title": f"Weekends cost {wvw['ratio']:.1f}× weekdays",
                "detail": (
                    f"Weekend days average {format_inr(wvw['weekend_daily_avg'])} vs "
                    f"{format_inr(wvw['weekday_daily_avg'])} on weekdays — "
                    f"{format_inr(wvw['weekend_total'])} in total. Leisure and dining drive the gap."
                ),
                "tag": "Pattern",
                "tone": "watch" if wvw["ratio"] < 2.0 else "alert",
            }
        )

    # 3. Frequent small purchases
    small = (
        expenses.assign(abs_amount=expenses["amount"].abs())
        .groupby("merchant")["abs_amount"]
        .agg(["count", "mean", "sum"])
    )
    frequent = small[(small["count"] >= 6) & (small["mean"] < SMALL_TXN_CAP)]
    if not frequent.empty:
        top = frequent.sort_values("count", ascending=False).iloc[0]
        patterns.append(
            {
                "id": "frequent-small",
                "title": f"Small taps at {frequent.sort_values('count', ascending=False).index[0]}",
                "detail": (
                    f"{int(top['count'])} transactions averaging {format_inr(top['mean'])} — "
                    f"{format_inr(top['sum'])} in total. Individually harmless, collectively a leak."
                ),
                "tag": "Easy win",
                "tone": "watch",
            }
        )

    # 4. Large transactions (computed once in analyze()).
    if not large.empty:
        biggest = large.loc[large["amount"].abs().idxmax()]
        patterns.append(
            {
                "id": "large",
                "title": f"{len(large)} unusually large purchase{'s' if len(large) != 1 else ''}",
                "detail": (
                    f"Spending over {format_inr(LARGE_TXN_MULTIPLE * avg_expense)} stands out "
                    f"against your {format_inr(avg_expense)} average — biggest was "
                    f"{biggest['merchant']} at {format_inr(abs(biggest['amount']))} "
                    f"on {biggest['date'].date().isoformat()}."
                ),
                "tag": "Review",
                "tone": "watch",
            }
        )

    # 5. Spending concentration
    if categories:
        top = categories[0]
        if top["percentage"] >= CONCENTRATION_PCT and top["name"] != "Income":
            tone = "alert" if top["name"] in DISCRETIONARY else "watch"
            patterns.append(
                {
                    "id": "concentration",
                    "title": f"{top['name']} eats {top['percentage']:.0f}% of spending",
                    "detail": (
                        f"{format_inr(top['total'])} across {top['count']} transactions. "
                        + (
                            "Discretionary categories this concentrated deserve a monthly cap."
                            if top["name"] in DISCRETIONARY
                            else "Fixed costs this high are worth renegotiating once a year."
                        )
                    ),
                    "tag": "High impact",
                    "tone": tone,
                }
            )

    # 6. Recurring / subscription-like transactions (fixed costs excluded).
    recurring = []
    for merchant, g in expenses.groupby("merchant"):
        if len(g) < 3:
            continue
        if g["category"].isin(["Rent", "Income"]).any():
            continue
        amounts = g["amount"].abs()
        mean = amounts.mean()
        if mean == 0:
            continue
        span_days = (g["date"].max() - g["date"].min()).days
        if amounts.std() / mean <= 0.10 and span_days >= 20:
            recurring.append(
                {"merchant": merchant, "monthly": mean, "count": len(g)}
            )
    if recurring:
        recurring.sort(key=lambda r: r["monthly"], reverse=True)
        total_rec = sum(r["monthly"] for r in recurring)
        names = ", ".join(
            f"{r['merchant']} ({format_inr(r['monthly'])})" for r in recurring[:3]
        )
        patterns.append(
            {
                "id": "recurring",
                "title": f"{len(recurring)} subscription-like charges",
                "detail": (
                    f"Repeated similar amounts total ~{format_inr(total_rec)}/month: {names}"
                    + ("…" if len(recurring) > 3 else ".")
                    + " Worth checking which ones you still use."
                ),
                "tag": "Easy win",
                "tone": "watch",
            }
        )

    # 7. Spending spikes
    daily = timeline["daily"]
    spends = [d["spending"] for d in daily if d["spending"] > 0]
    if len(spends) >= 7:
        mean_daily = sum(spends) / len(spends)
        spikes = [d for d in daily if d["spending"] > SPIKE_MULTIPLE * mean_daily]
        if spikes:
            worst = max(spikes, key=lambda d: d["spending"])
            patterns.append(
                {
                    "id": "spikes",
                    "title": f"{len(spikes)} spending spike{'s' if len(spikes) != 1 else ''} detected",
                    "detail": (
                        f"Your normal day is ~{format_inr(mean_daily)}, but {worst['date']} hit "
                        f"{format_inr(worst['spending'])}. Big-event days are normal — "
                        "back-to-back ones are the danger."
                    ),
                    "tag": "Pattern",
                    "tone": "watch",
                }
            )

    # 8. Savings-rate good news
    if summary["savings_rate"] >= 25:
        patterns.append(
            {
                "id": "savings",
                "title": f"You saved {summary['savings_rate']:.0f}% of income",
                "detail": (
                    f"{format_inr(summary['net_balance'])} stayed unspent — "
                    "the leaks above are optimization, not emergency."
                ),
                "tag": "Good news",
                "tone": "good",
            }
        )

    return patterns


def build_next_moves(
    summary: dict,
    categories: list[dict],
    timeline: dict,
    patterns: list[dict],
    large: pd.DataFrame,
    months: float,
) -> list[dict]:
    """Concrete, numbered actions with computed rupee impact. Rule-based.

    `months` normalizes period totals to a monthly pace so savings read
    "/mo". One-off large purchases are excluded from cap baselines.
    """
    moves: list[dict] = []
    by_id = {p["id"]: p for p in patterns}
    large_by_cat = large.groupby("category")["amount"].apply(
        lambda s: s.abs().sum()
    ).to_dict()

    # 1. Cap the biggest discretionary category at 75% of its monthly pace.
    discretionary = [c for c in categories if c["name"] in DISCRETIONARY]
    if discretionary:
        top = max(discretionary, key=lambda c: c["total"])
        baseline = max(top["total"] - float(large_by_cat.get(top["name"], 0.0)), 0.0)
        monthly_pace = baseline / months
        if monthly_pace >= 3000:
            cap = round(monthly_pace * 0.75, -1)
            saving = round(monthly_pace * 0.25, -1)
            moves.append(
                {
                    "id": "cap-category",
                    "title": f"Cap {top['name'].lower()} at {format_inr(cap)}/month",
                    "detail": (
                        f"A weekly budget of {format_inr(cap / 4)} keeps the fun and "
                        f"kills the drift — down from the current {format_inr(monthly_pace)}/month pace."
                    ),
                    "saving": f"≈ {format_inr(saving)}/mo",
                }
            )

    # 2. Review subscriptions, if any were detected.
    if "recurring" in by_id:
        moves.append(
            {
                "id": "review-subscriptions",
                "title": "Audit your subscriptions this weekend",
                "detail": (
                    "Open each recurring charge found above and cancel what you "
                    "haven't used in 30 days. Ten minutes, permanent savings."
                ),
                "saving": "≈ varies",
            }
        )

    # 3. Weekend envelope, if weekends dominate (normalized to monthly).
    if "weekend" in by_id:
        wvw = timeline["weekday_vs_weekend"]
        excess = max(wvw["weekend_total"] - wvw["weekday_daily_avg"] * 8, 0)
        saving = round(excess * 0.3 / months, -1)
        if saving > 0:
            moves.append(
                {
                    "id": "weekend-envelope",
                    "title": "Give weekends a fixed envelope",
                    "detail": (
                        "Move Saturday–Sunday fun money to a separate UPI account. "
                        "When the envelope is empty, the weekend borrows from next "
                        "week — not from savings."
                    ),
                    "saving": f"≈ {format_inr(saving)}/mo",
                }
            )

    # 4. Salary-day auto-transfer when savings are thin.
    if summary["savings_rate"] < 20 and summary["total_income"] > 0:
        auto = round(summary["total_income"] * 0.2, -2)
        moves.append(
            {
                "id": "auto-transfer",
                "title": f"Auto-transfer {format_inr(auto)} on salary day",
                "detail": (
                    "Pay your future self first with a standing instruction on the 1st. "
                    "It beats willpower on the 30th, every time."
                ),
                "saving": "Habit",
            }
        )

    # Universal fallbacks so the list is always useful.
    fallbacks = [
        {
            "id": "weekly-review",
            "title": "Do a 5-minute review every Sunday",
            "detail": (
                "Open this dashboard weekly. Awareness alone cuts impulse spending "
                "within a month for most people."
            ),
            "saving": "Habit",
        },
        {
            "id": "24h-rule",
            "title": "Use the 24-hour rule above ₹2,000",
            "detail": (
                "Any non-essential purchase over ₹2,000 waits a day. "
                "Most urges don't survive the night — your data proves it."
            ),
            "saving": "Habit",
        },
    ]
    for fallback in fallbacks:
        if len(moves) >= 4:
            break
        moves.append(fallback)

    return moves[:4]


def analyze(df: pd.DataFrame) -> dict:
    """Full pipeline: summary, categories, merchants, timeline, patterns, moves."""
    has_time = bool(df.attrs.get("has_time", False))
    summary = compute_summary(df)
    months = max(summary["period"]["days"] / 30.44, 1.0)
    expenses = df[df["transaction_type"] == "expense"]
    avg_expense = summary["average_expense"]
    large = (
        expenses[expenses["amount"].abs() > LARGE_TXN_MULTIPLE * avg_expense]
        if avg_expense
        else expenses.iloc[0:0]
    )
    categories = compute_categories(df, summary["total_spending"])
    merchants = compute_merchants(df)
    timeline = compute_timeline(df, has_time)
    patterns = detect_patterns(df, summary, categories, timeline, has_time, large)
    next_moves = build_next_moves(summary, categories, timeline, patterns, large, months)
    return {
        "summary": summary,
        "categories": categories,
        "merchants": merchants,
        "timeline": timeline,
        "patterns": patterns,
        "next_moves": next_moves,
    }
