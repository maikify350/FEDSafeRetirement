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
            if line.startswith("RTRVR_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    key = os.environ.get("RTRVR_API_KEY", "")
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
    Use RTRVR's REST API to enrich a single lead.

    NOTE: This is a template — RTRVR's exact API endpoints may vary.
    Check https://www.rtrvr.ai/blog/rtrvr-api for current docs.
    """
    import aiohttp

    prompt = build_prompt(lead)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "output_format": "json",
        "sources": [
            "https://www.fastpeoplesearch.com",
            "https://www.truepeoplesearch.com",
        ],
    }

    try:
        async with session.post(
            "https://api.rtrvr.ai/v1/retrieve",
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                result = data.get("result", {})
                if isinstance(result, str):
                    try:
                        result = json.loads(result)
                    except json.JSONDecodeError:
                        return None

                return {
                    "personal_phone":   result.get("phone"),
                    "personal_email":   result.get("email"),
                    "personal_address": result.get("address"),
                    "personal_city":    result.get("city"),
                    "personal_state":   result.get("state"),
                    "personal_zip":     result.get("zip"),
                    "enrichment_source": "rtrvr_api",
                    "enrichment_dt": datetime.now(timezone.utc).isoformat(),
                    "match_confidence": 0.7,  # RTRVR handles matching internally
                }
            elif resp.status == 429:
                log.warning("RTRVR rate limited — waiting 10s")
                await asyncio.sleep(10)
                return None
            else:
                log.warning(f"RTRVR API error {resp.status}: {await resp.text()}")
                return None

    except Exception as e:
        log.error(f"RTRVR API call failed: {e}")
        return None


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

async def run_api(leads: list[dict], api_key: str):
    """Enrich leads via RTRVR REST API."""
    import aiohttp

    results = []
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
            if enrichment and any(enrichment.get(f) for f in ("personal_phone", "personal_email", "personal_address")):
                stats["enriched"] += 1
                lead_out = {**lead, **enrichment, "enrichment_status": "enriched"}
                log.info(f"  ENRICHED: phone={enrichment.get('personal_phone')} addr={enrichment.get('personal_address')}")
            else:
                stats["not_found"] += 1
                lead_out = {**lead, "enrichment_status": "not_found"}

            results.append(lead_out)
            stats["processed"] += 1

            # save every 10
            if stats["processed"] % 10 == 0:
                _save(results, stats)

            await asyncio.sleep(2)  # respect rate limits

    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    stats["match_rate"] = f"{stats['enriched'] / stats['total'] * 100:.1f}%" if stats["total"] > 0 else "N/A"
    _save(results, stats)
    _print_summary(stats)


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


def _print_summary(stats):
    log.info("=" * 60)
    log.info("RTRVR ENRICHMENT COMPLETE")
    log.info(f"  Total processed : {stats['processed']}")
    log.info(f"  Enriched        : {stats['enriched']}")
    log.info(f"  Not found       : {stats['not_found']}")
    log.info(f"  Match rate      : {stats['match_rate']}")
    log.info(f"  Results saved   : {RTRVR_ENRICHED_FILE}")
    log.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Enrich leads via RTRVR.ai")
    parser.add_argument("--limit", type=int, help="Only process first N leads")
    parser.add_argument(
        "--method", choices=["api", "chrome"], default="api",
        help="'api' for REST API, 'chrome' to generate prompts for extension"
    )
    args = parser.parse_args()

    with open(SAMPLE_FILE, "r") as f:
        leads = json.load(f)
    if args.limit:
        leads = leads[:args.limit]

    if args.method == "chrome":
        run_chrome_prompts(leads)
    else:
        api_key = load_env_key()
        asyncio.run(run_api(leads, api_key))


if __name__ == "__main__":
    main()
