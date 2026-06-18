"""
Extract a random sample of leads from the FOIA xlsx for enrichment testing.

Usage:
    python extract_sample.py              # 1500 random leads (default)
    python extract_sample.py --size 500   # custom sample size
    python extract_sample.py --high-value # only salary>80k & 10+ yrs service
"""
import argparse
import json
import random
from datetime import datetime, date
from pathlib import Path

import openpyxl

from config import DATA_SEED, SAMPLE_FILE, OUTPUT_DIR

COLUMNS = [
    "first_name", "last_name", "middle_initial", "occupation_title",
    "grade_level", "annual_salary", "hourly_rate", "facility_name",
    "facility_address", "facility_city", "facility_state", "facility_zip_code",
    "entered_on_duty_date",
]


def years_of_service(eod: datetime | None) -> float | None:
    if eod is None:
        return None
    delta = date.today() - eod.date()
    return round(delta.days / 365.25, 1)


def load_all_rows() -> list[dict]:
    print(f"Loading {DATA_SEED} ...")
    wb = openpyxl.load_workbook(DATA_SEED, read_only=True, data_only=True)
    ws = wb.active
    rows = []
    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
        rec = dict(zip(COLUMNS, row))
        # normalise name casing
        rec["first_name"] = str(rec["first_name"] or "").strip().title()
        rec["last_name"]  = str(rec["last_name"] or "").strip().title()
        rec["middle_initial"] = str(rec["middle_initial"] or "").strip().upper() or None
        rec["facility_state"] = str(rec["facility_state"] or "").strip().upper()
        rec["facility_city"]  = str(rec["facility_city"] or "").strip().title()
        # convert date
        eod = rec["entered_on_duty_date"]
        rec["entered_on_duty_date"] = eod.strftime("%Y-%m-%d") if isinstance(eod, datetime) else None
        rec["years_of_service"] = years_of_service(eod) if isinstance(eod, datetime) else None
        rec["annual_salary"] = int(rec["annual_salary"] or 0)
        rec["hourly_rate"] = float(rec["hourly_rate"] or 0)
        rows.append(rec)
    wb.close()
    print(f"  Loaded {len(rows):,} total records.")
    return rows


def sample_leads(rows: list[dict], size: int, high_value: bool) -> list[dict]:
    if high_value:
        filtered = [
            r for r in rows
            if r["annual_salary"] >= 80_000
            and r["years_of_service"] is not None
            and r["years_of_service"] >= 10
        ]
        print(f"  High-value filter: {len(filtered):,} qualifying records.")
        pool = filtered
    else:
        pool = rows

    size = min(size, len(pool))
    sample = random.sample(pool, size)

    # spread across states for variety
    sample.sort(key=lambda r: (r["facility_state"], r["last_name"]))
    return sample


def save(leads: list[dict]):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(SAMPLE_FILE, "w", encoding="utf-8") as f:
        json.dump(leads, f, indent=2, default=str)
    print(f"  Saved {len(leads):,} sample leads -> {SAMPLE_FILE}")

    # quick state distribution
    states: dict[str, int] = {}
    for r in leads:
        st = r["facility_state"]
        states[st] = states.get(st, 0) + 1
    top = sorted(states.items(), key=lambda x: -x[1])[:10]
    print(f"  Top states: {', '.join(f'{s}({n})' for s, n in top)}")

    # salary stats
    salaries = [r["annual_salary"] for r in leads if r["annual_salary"] > 0]
    if salaries:
        avg = sum(salaries) / len(salaries)
        print(f"  Salary range: ${min(salaries):,} - ${max(salaries):,}  avg: ${avg:,.0f}")


def main():
    parser = argparse.ArgumentParser(description="Extract sample leads for enrichment")
    parser.add_argument("--size", type=int, default=1500, help="Number of leads to sample")
    parser.add_argument("--high-value", action="store_true", help="Only salary>80k & 10+ yrs service")
    args = parser.parse_args()

    rows = load_all_rows()
    leads = sample_leads(rows, args.size, args.high_value)
    save(leads)


if __name__ == "__main__":
    main()
