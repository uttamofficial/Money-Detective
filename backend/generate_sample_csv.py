"""Generate a realistic sample statement: 130+ Indian transactions.

Uses bank-style headers (Txn Date / Narration / Debit / Credit) with mixed
date formats and evening timestamps, so it exercises the parser's
flexible column detection, debit/credit handling, and time-of-day logic.

Run:  backend/.venv/bin/python backend/generate_sample_csv.py
"""

from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(20261004)

OUT = Path(__file__).resolve().parent.parent / "data" / "sample_transactions.csv"

START = date(2026, 5, 1)
END = date(2026, 10, 4)

rows: list[tuple[str, str, str, str]] = []


def add(day: date, narration: str, debit: float = 0, credit: float = 0) -> None:
    style = random.random()
    if style < 0.45:
        datestr = day.strftime("%d-%m-%Y")  # 03-09-2026
    elif style < 0.75:
        datestr = day.strftime("%d/%m/%Y")  # 03/09/2026
    elif style < 0.9:
        datestr = day.isoformat()  # 2026-09-03
    else:
        # evening/night timestamp with time component
        hour = random.choice([19, 20, 21, 22, 23, 0])
        minute = random.choice([5, 12, 18, 25, 33, 41, 47, 55])
        datestr = f"{day.strftime('%d-%m-%Y')} {hour:02d}:{minute:02d}"
    rows.append(
        (
            datestr,
            narration,
            f"{debit:.0f}" if debit else "",
            f"{credit:.0f}" if credit else "",
        )
    )


def month_range(year: int, month: int):
    day = date(year, month, 1)
    while day.month == month and day <= END:
        yield day
        day += timedelta(days=1)


FOOD = [
    ("Swiggy - Dinner", 280, 650),
    ("Zomato - Weekend Lunch", 350, 900),
    ("Swiggy - Late Night Biryani", 320, 700),
    ("Third Wave Coffee", 250, 450),
    ("Domino's Pizza Night", 500, 850),
]
GROCERY = [("DMart Grocery Run", 1500, 3000), ("BigBasket Monthly Stock-up", 1200, 2500)]
TRANSPORT = [
    ("Uber - Office Commute", 180, 420),
    ("Ola - Airport Drop", 550, 750),
    ("Rapido Bike Taxi", 60, 140),
    ("Metro Card Recharge", 500, 500),
]
SHOPPING = [
    ("Amazon - Kitchen Essentials", 800, 2500),
    ("Flipkart - Electronics", 1200, 4500),
    ("Myntra - Festive Shopping", 1500, 4000),
]
ENTERTAINMENT = [("BookMyShow - Movie Night", 700, 1400), ("PVR Cinemas Weekend", 800, 1200)]

# --- fixed monthly items (May..Oct) ---------------------------------------
for m in range(5, 11):
    salary_day = date(2026, m, 1)
    if salary_day <= END:
        add(salary_day, "Salary Credit - Acme Pvt Ltd", credit=82400)
    rent_day = date(2026, m, 2)
    if rent_day <= END:
        add(rent_day, "Rent - HSR Layout Bengaluru", debit=15000)
    for bill_day, narration, amt in [
        (5, "BESCOM Electricity Bill", random.randint(950, 1450)),
        (12, "Jio Prepaid Recharge", 399),
        (15, "Netflix Subscription", 649),
        (16, "Spotify Premium", 149),
        (18, "iCloud+ Storage 200GB", 219),
        (20, "ACT Fibernet Broadband", 1180),
    ]:
        d = date(2026, m, bill_day)
        if d <= END:
            add(d, narration, debit=amt)
    # fuel + gym
    d = date(2026, m, 8)
    if d <= END:
        add(d, "Shell Petrol Pump", debit=random.randint(1500, 2200))
    d = date(2026, m, 10)
    if d <= END and m % 2 == 1:
        add(d, "Cultfit Gym Membership", debit=1800)

# --- variable day-to-day life ---------------------------------------------
day = START
while day <= END:
    if day.day not in (1, 2):  # salary/rent days stay quiet
        # food: ~3x a week, weekend-biased, sometimes late
        if random.random() < (0.55 if day.weekday() >= 5 else 0.38):
            narration, lo, hi = random.choice(FOOD)
            add(day, narration, debit=random.randint(lo, hi))
        # transport: most weekdays
        if day.weekday() < 5 and random.random() < 0.5:
            narration, lo, hi = random.choice(TRANSPORT)
            add(day, narration, debit=random.randint(lo, hi))
        # groceries: ~twice a month
        if random.random() < 0.07:
            narration, lo, hi = random.choice(GROCERY)
            add(day, narration, debit=random.randint(lo, hi))
        # shopping: ~weekly itch
        if random.random() < 0.14:
            narration, lo, hi = random.choice(SHOPPING)
            add(day, narration, debit=random.randint(lo, hi))
        # entertainment: weekends
        if day.weekday() >= 5 and random.random() < 0.3:
            narration, lo, hi = random.choice(ENTERTAINMENT)
            add(day, narration, debit=random.randint(lo, hi))
        # small daily taps: chai / metro / autowala
        if random.random() < 0.3:
            add(
                day,
                random.choice(["Chai Point", "Metro - MG Road", "Auto - Forum Mall", "Blinkit - Snacks"]),
                debit=random.randint(40, 320),
            )
    day += timedelta(days=1)

# --- one-off large + health/education --------------------------------------
add(date(2026, 7, 18), "Croma - Sony Bravia TV", debit=42900)
add(date(2026, 6, 22), "Apollo Pharmacy", debit=860)
add(date(2026, 8, 9), "Udemy - Data Course", debit=499)
add(date(2026, 9, 27), "IndiGo - Diwali Flight", debit=6850)
add(date(2026, 9, 30), "Freelance Payout - Design Gig", credit=12000)

with OUT.open("w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["Txn Date", "Narration", "Debit", "Credit"])
    writer.writerows(rows)

print(f"Wrote {len(rows)} transactions to {OUT}")
