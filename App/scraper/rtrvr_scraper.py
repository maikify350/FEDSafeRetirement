"""
RTRVR.ai-powered enrichment — alternative to raw Playwright scraping.

RTRVR uses a DOM-native AI agent that navigates pages via natural language
prompts.  It handles anti-bot, pagination, and extraction automatically.

Prerequisites:
    1. RTRVR Chrome extension installed (you already have it)
    2. RTRVR API key — get one from https://www.rtrvr.ai/
    3. Set RTRVR_API_KEY in App/.env

Usage:
    python rtrvr_scraper.py                   # enrich all sample leads
    python rtrvr_scraper.py --limit 50        # first 50 only
    python rtrvr_scraper.py --method chrome   # use Chrome extension via MCP
    python rtrvr_scraper.py --method api      # use REST API (default)
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from config import SAMPLE_FILE, OUTPUT_DIR, LOG_DIR
from db import LeadsDB

# ── Logging ────────────────────────────────────────────────────────────
LOG_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_DIR / f"rtrvr_{datetime.now():%Y%m%d_%H%M%S}.log"),
    ],
)
log = logging.getLogger("rtrvr")

RTRVR_ENRICHED_FILE = OUTPUT_DIR / "rtrvr_enriched_leads.json"
RTRVR_STATS_FILE    = OUTPUT_DIR / "rtrvr_enrichment_stats.json"


def load_env_key() -> str:
    """Load RTRVR API key from App/.env"""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "RTRVR_API_KEY=" in line and not line.strip().startswith("#"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    key = os.environ.get("RTRVR_API_KEY", "") or os.environ.get("NEXT_PUBLIC_RTRVR_API_KEY", "")
    if not key:
        raise RuntimeError(
            "RTRVR_API_KEY not found.\n"
            "Add RTRVR_API_KEY=your_key to App/.env or set it as an environment variable.\n"
            "Get your key at https://www.rtrvr.ai/"
        )
    return key


def build_prompt(lead: dict) -> str:
    """
    Build a natural-language prompt for RTRVR to find a person's contact info.
    RTRVR's AI agent will interpret this and navigate accordingly.
    """
    first = lead.get("first_name", "")
    last  = lead.get("last_name", "")
    state = lead.get("facility_state", "")
    city  = lead.get("facility_city", "")

    return (
        f"Find the personal contact information for {first} {last} "
        f"who lives near {city}, {state}. "
        f"They work for the US Postal Service. "
        f"I need their: home address (street, city, state, zip), "
        f"personal phone number, and personal email address. "
        f"Return the results as JSON with keys: "
        f"address, city, state, zip, phone, email. "
        f"If you find multiple people with this name, pick the one closest to {city}, {state}."
    )


# ── REST API approach ──────────────────────────────────────────────────

async def enrich_via_api(lead: dict, api_key: str, session) -> dict | None:
    """
    Use RTRVR's /agent REST API to enrich a single lead.
    Sends RTRVR to Radaris to extract contact data with structured output.
    ~8 credits per lookup.
    """
    import aiohttp

    first = lead.get("first_name", "")
    last = lead.get("last_name", "")
    city = lead.get("facility_city", "")
    state = lead.get("facility_state", "")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "input": (
            f"Go to the Radaris page for {first} {last}. "
            f"They live near {city}, {state} and work for the US Postal Service. "
            f"On the page, look for the sections labeled 'PHONES', 'EMAILS', and 'ADDRESSES'. "
            f"Also look for the FAQ section at the bottom that says "
            f"'What is {first} {last}'s phone number?' and 'What is {first} {last}'s email address?' "
            f"and 'What is {first} {last}'s address?'. "
            f"Extract the phone number, email address, and full home address."
        ),
        "urls": [f"https://radaris.com/p/{first.title()}/{last.title()}/"],
        "output_schema": {
            "type": "object",
            "properties": {
                "phone": {"type": "string", "description": "Personal phone number"},
                "email": {"type": "string", "description": "Personal email address"},
                "address": {"type": "string", "description": "Full home address including street, city, state, zip"},
            },
        },
        "response": {"verbosity": "final"},
    }

    try:
        async with session.post(
            "https://api.rtrvr.ai/agent",
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=90),
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                if not data.get("success"):
                    log.warning(f"RTRVR returned success=false for {first} {last}")
                    return None

                # extract from result.json or output[0].data
                raw_result = data.get("result", {})
                if isinstance(raw_result, dict):
                    result = raw_result.get("json", {})
                    if isinstance(result, list):
                        result = result[0] if result else {}
                elif isinstance(raw_result, list):
                    result = raw_result[0] if raw_result else {}
                else:
                    result = {}

                if not result:
                    output = data.get("output", [])
                    if output and isinstance(output, list):
                        item = output[0]
                        if isinstance(item, dict):
                            result = item.get("data", {})
                            if isinstance(result, list):
                                result = result[0] if result else {}

                # parse address into components
                addr_raw = (
                    result.get("home_address") or
                    result.get("address") or ""
                ).strip()
                parsed = _parse_address(addr_raw)

                phone = (result.get("personal_phone") or result.get("phone") or "").strip()
                email = (result.get("personal_email") or result.get("email") or "").strip().rstrip(".")

                credits_used = data.get("usage", {}).get("creditsUsed", 0)
                credits_left = data.get("usage", {}).get("creditsLeft", 0)
                log.info(f"    RTRVR credits: {credits_used:.1f} used, {credits_left:.0f} remaining")

                return {
                    "personal_phone": phone or None,
                    "personal_email": email or None,
                    "personal_address": parsed.get("address"),
                    "personal_city": parsed.get("city"),
                    "personal_state": parsed.get("state"),
                    "personal_zip": parsed.get("zip"),
                    "enrichment_source": "rtrvr_api",
                    "enrichment_dt": datetime.now(timezone.utc).isoformat(),
                    "match_confidence": 0.8,
                }
            elif resp.status == 429:
                log.warning("RTRVR rate limited — waiting 15s")
                await asyncio.sleep(15)
                return None
            elif resp.status == 402:
                log.error("RTRVR credits exhausted!")
                return {"_credits_exhausted": True}
            else:
                text = await resp.text()
                log.warning(f"RTRVR API error {resp.status}: {text[:200]}")
                return None

    except asyncio.TimeoutError:
        log.warning(f"RTRVR timeout for {first} {last}")
        return None
    except Exception as e:
        log.error(f"RTRVR API call failed: {e}")
        return None


def _parse_address(addr: str) -> dict:
    """Parse 'PO Box 162, Aniak, AK 99557' into components."""
    import re
    result: dict = {}
    if not addr:
        return result
    m = re.match(
        r"^(.+?),\s*(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$",
        addr.strip(),
        re.IGNORECASE,
    )
    if m:
        result["address"] = m.group(1).strip()
        result["city"] = m.group(2).strip().title()
        result["state"] = m.group(3).upper()
        result["zip"] = m.group(4)
    else:
        result["address"] = addr
    return result


# ── Chrome extension / MCP approach ────────────────────────────────────

def build_chrome_instructions(lead: dict) -> str:
    """
    Instructions for using RTRVR via the Chrome extension manually or via MCP.

    When using RTRVR's Chrome extension with Claude's MCP tools:
    1. Open RTRVR extension in Chrome
    2. Paste the prompt
    3. RTRVR navigates and extracts automatically
    """
    return build_prompt(lead)


# ── Main orchestrator ──────────────────────────────────────────────────

async def run_api(leads: list[dict], api_key: str, db: LeadsDB | None = None):
    """Enrich leads via RTRVR REST API. Writes to Supabase if db is provided."""
    import aiohttp

    results = []
    db_updates: list[dict] = []
    stats = {
        "total": len(leads),
        "processed": 0,
        "enriched": 0,
        "not_found": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "method": "rtrvr_api",
    }

    async with aiohttp.ClientSession() as session:
        for i, lead in enumerate(leads):
            name = f"{lead['first_name']} {lead['last_name']}"
            log.info(f"[{i+1}/{len(leads)}] {name} ({lead['facility_state']})")

            enrichment = await enrich_via_api(lead, api_key, session)

            if enrichment and enrichment.get("_credits_exhausted"):
                log.error("Credits exhausted — stopping early.")
                break

            db_record = {"id": lead.get("id")}

            if enrichment and any(enrichment.get(f) for f in ("personal_phone", "personal_email", "personal_address")):
                stats["enriched"] += 1
                found = [f for f in ("personal_phone", "personal_email", "personal_address") if enrichment.get(f)]
                status = "enriched" if len(found) >= 2 else "partial"
                lead_out = {**lead, **enrichment, "enrichment_status": status}
                log.info(f"  ENRICHED: phone={enrichment.get('personal_phone')} addr={enrichment.get('personal_address')}")
                db_record.update({
                    "personal_phone": enrichment.get("personal_phone"),
                    "personal_email": enrichment.get("personal_email"),
                    "personal_address": enrichment.get("personal_address"),
                    "personal_city": enrichment.get("personal_city"),
                    "personal_state": enrichment.get("personal_state"),
                    "personal_zip": enrichment.get("personal_zip"),
                    "enrichment_source": "rtrvr_api",
                    "enrichment_confidence": enrichment.get("match_confidence", 0.8),
                    "enrichment_status": status,
                })
            else:
                stats["not_found"] += 1
                lead_out = {**lead, "enrichment_status": "not_found"}
                db_record["enrichment_status"] = "not_found"

            results.append(lead_out)
            stats["processed"] += 1
            if db and db_record.get("id"):
                db_updates.append(db_record)

            # save every 10
            if stats["processed"] % 10 == 0:
                if db and db_updates:
                    result = db.bulk_update_enrichment(db_updates)
                    log.info(f"  DB: wrote {result['updated']} records to Supabase")
                    db_updates.clear()
                _save(results, stats)

            await asyncio.sleep(2)  # respect rate limits

    # final flush
    if db and db_updates:
        result = db.bulk_update_enrichment(db_updates)
        log.info(f"  DB: final flush — wrote {result['updated']} records to Supabase")

    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    stats["match_rate"] = f"{stats['enriched'] / stats['total'] * 100:.1f}%" if stats["total"] > 0 else "N/A"
    _save(results, stats)
    _print_summary(stats, db is not None)


def run_chrome_prompts(leads: list[dict]):
    """
    Generate RTRVR prompts for use with the Chrome extension.
    Saves a batch file of prompts you can feed to RTRVR manually or via MCP.
    """
    prompts_file = OUTPUT_DIR / "rtrvr_prompts.json"
    prompts = []
    for lead in leads:
        prompts.append({
            "lead_name": f"{lead['first_name']} {lead['last_name']}",
            "state": lead["facility_state"],
            "prompt": build_chrome_instructions(lead),
        })

    with open(prompts_file, "w", encoding="utf-8") as f:
        json.dump(prompts, f, indent=2)

    log.info(f"Generated {len(prompts)} RTRVR prompts -> {prompts_file}")
    log.info("You can feed these to RTRVR's Chrome extension one at a time,")
    log.info("or use them with the RTRVR MCP server integration.")


def _save(results, stats):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(RTRVR_ENRICHED_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)
    with open(RTRVR_STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)


def _print_summary(stats, wrote_to_db: bool = False):
    log.info("=" * 60)
    log.info("RTRVR ENRICHMENT COMPLETE")
    log.info(f"  Total processed : {stats['processed']}")
    log.info(f"  Enriched        : {stats['enriched']}")
    log.info(f"  Not found       : {stats['not_found']}")
    log.info(f"  Match rate      : {stats['match_rate']}")
    log.info(f"  Results saved   : {RTRVR_ENRICHED_FILE}")
    if wrote_to_db:
        log.info(f"  Supabase        : leads table updated")
    log.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Enrich leads via RTRVR.ai")
    parser.add_argument("--limit", type=int, default=100, help="Number of leads to process (default: 100)")
    parser.add_argument("--state", type=str, help="Filter leads by state (e.g. 'CA', 'TX')")
    parser.add_argument("--from-file", action="store_true", help="Use sample_leads.json instead of Supabase")
    parser.add_argument(
        "--method", choices=["api", "chrome"], default="api",
        help="'api' for REST API, 'chrome' to generate prompts for extension"
    )
    args = parser.parse_args()

    api_key = load_env_key()
    db = None

    if args.from_file:
        with open(SAMPLE_FILE, "r") as f:
            leads = json.load(f)
        if args.limit:
            leads = leads[:args.limit]
        log.info(f"Loaded {len(leads)} leads from sample file")
    else:
        db = LeadsDB()
        leads = db.get_pending_leads(limit=args.limit or 100, state=args.state)
        log.info(f"Loaded {len(leads)} pending leads from Supabase" +
                 (f" (state={args.state.upper()})" if args.state else ""))

    if not leads:
        log.info("No pending leads to process.")
        return

    if args.method == "chrome":
        run_chrome_prompts(leads)
    else:
        asyncio.run(run_api(leads, api_key, db))


if __name__ == "__main__":
    main()
