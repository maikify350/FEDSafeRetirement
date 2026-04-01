"""
Playwright-based people-search scraper.

Enriches leads by scraping free people-search sites (FastPeopleSearch,
TruePeopleSearch) using async Playwright with multiple browser contexts
for concurrency and randomised delays to stay under the radar.

Usage:
    python scraper.py                     # scrape all sample leads
    python scraper.py --limit 50          # scrape first 50 only
    python scraper.py --site fastpeople   # only use FastPeopleSearch
    python scraper.py --headed            # watch the browser work
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import random
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from playwright_stealth import Stealth
from fake_useragent import UserAgent

from config import (
    SAMPLE_FILE, ENRICHED_FILE, STATS_FILE, OUTPUT_DIR, LOG_DIR,
    CONCURRENT_BROWSERS, REQUEST_DELAY_MIN, REQUEST_DELAY_MAX,
    PAGE_TIMEOUT, MAX_RETRIES, HEADLESS, SITES,
)
from parsers import PARSERS
from matcher import best_match

stealth = Stealth()

# ── Logging ────────────────────────────────────────────────────────────
LOG_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_DIR / f"scraper_{datetime.now():%Y%m%d_%H%M%S}.log"),
    ],
)
log = logging.getLogger("scraper")

ua = UserAgent()


# ── Helpers ────────────────────────────────────────────────────────────

def load_sample() -> list[dict]:
    if not SAMPLE_FILE.exists():
        raise FileNotFoundError(
            f"Sample file not found: {SAMPLE_FILE}\n"
            "Run extract_sample.py first."
        )
    with open(SAMPLE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_progress() -> dict[str, dict]:
    """Load previously enriched results so we can resume."""
    if ENRICHED_FILE.exists():
        with open(ENRICHED_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        # index by name key for fast lookup
        return {_lead_key(r): r for r in data}
    return {}


def save_results(results: list[dict]):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(ENRICHED_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)


def save_stats(stats: dict):
    with open(STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)


def _lead_key(lead: dict) -> str:
    return f"{lead.get('first_name','')}-{lead.get('last_name','')}-{lead.get('facility_state','')}".lower()


def build_url(site: dict, lead: dict) -> str:
    first = (lead.get("first_name") or "").strip().lower().replace(" ", "-")
    last  = (lead.get("last_name") or "").strip().lower().replace(" ", "-")
    state = (lead.get("facility_state") or "").strip().lower()
    return site["base_url"].format(first=first, last=last, state=state)


async def random_delay():
    delay = random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX)
    await asyncio.sleep(delay)


# ── Browser management ─────────────────────────────────────────────────

async def create_stealth_context(browser: Browser) -> BrowserContext:
    """Create a browser context with anti-detection measures."""
    context = await browser.new_context(
        user_agent=ua.random,
        viewport={"width": random.randint(1200, 1920), "height": random.randint(800, 1080)},
        locale="en-US",
        timezone_id="America/New_York",
        java_script_enabled=True,
    )
    # apply stealth patches to evade bot detection
    await stealth.apply_stealth_async(context)
    # block images & fonts to speed things up (but keep CSS for layout)
    await context.route(
        "**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot}",
        lambda route: route.abort(),
    )
    return context


async def check_for_captcha(page: Page) -> bool:
    """Detect common CAPTCHA indicators."""
    content = await page.content()
    captcha_signals = [
        "captcha", "recaptcha", "hcaptcha", "cf-challenge",
        "challenge-running", "ray-id", "attention required",
    ]
    lower = content.lower()
    return any(sig in lower for sig in captcha_signals)


# ── Core scraping logic ───────────────────────────────────────────────

async def scrape_lead(page: Page, lead: dict, site: dict) -> dict | None:
    """
    Scrape a single lead from a single site.
    Returns enrichment dict or None.
    """
    url = build_url(site, lead)
    site_name = site["name"]
    parser = PARSERS.get(site_name)
    if not parser:
        log.warning(f"No parser for site: {site_name}")
        return None

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
        await page.wait_for_timeout(random.randint(800, 2000))

        if await check_for_captcha(page):
            log.warning(f"CAPTCHA detected on {site_name} for {lead['first_name']} {lead['last_name']}")
            return {"_blocked": True, "_site": site_name}

        candidates = await parser(
            page,
            lead["first_name"],
            lead["last_name"],
            lead["facility_state"],
        )

        if not candidates:
            # save debug HTML for first few misses so we can adjust parsers
            debug_dir = LOG_DIR / "debug_html"
            debug_dir.mkdir(exist_ok=True)
            debug_count = len(list(debug_dir.glob("*.html")))
            if debug_count < 10:
                fname = f"{site_name}_{lead['last_name']}_{lead['facility_state']}.html"
                (debug_dir / fname).write_text(await page.content(), encoding="utf-8")
                log.info(f"  Saved debug HTML -> {debug_dir / fname}")
            log.debug(f"No candidates on {site_name} for {lead['first_name']} {lead['last_name']}")
            return None

        match = best_match(candidates, lead, min_confidence=0.5)
        if match:
            match["enrichment_source"] = site_name
            match["enrichment_dt"] = datetime.now(timezone.utc).isoformat()
            log.info(
                f"  MATCH [{match['match_confidence']:.0%}] "
                f"{lead['first_name']} {lead['last_name']} ({lead['facility_state']}) "
                f"-> phone={match.get('personal_phone')} addr={match.get('personal_address')}"
            )
        return match

    except Exception as e:
        log.error(f"Error scraping {site_name} for {lead['first_name']} {lead['last_name']}: {e}")
        return None


async def scrape_lead_all_sites(page: Page, lead: dict, sites: list[dict]) -> dict:
    """Try each enabled site until we get a match."""
    for site in sites:
        if not site.get("enabled"):
            continue

        for attempt in range(1, MAX_RETRIES + 1):
            result = await scrape_lead(page, lead, site)

            if result and result.get("_blocked"):
                log.warning(f"Blocked on {site['name']} — skipping to next site")
                break  # try next site

            if result:
                return result

            if attempt < MAX_RETRIES:
                await random_delay()

        await random_delay()

    return {}


# ── Worker / orchestrator ──────────────────────────────────────────────

async def worker(
    worker_id: int,
    browser: Browser,
    queue: asyncio.Queue,
    results: list[dict],
    stats: dict,
    sites: list[dict],
):
    context = await create_stealth_context(browser)
    page = await context.new_page()
    log.info(f"Worker {worker_id} started")

    while True:
        try:
            idx, lead = queue.get_nowait()
        except asyncio.QueueEmpty:
            break

        name = f"{lead['first_name']} {lead['last_name']} ({lead['facility_state']})"
        log.info(f"[{idx+1}/{stats['total']}] Worker {worker_id}: {name}")

        enrichment = await scrape_lead_all_sites(page, lead, sites)
        lead_out = {**lead, **enrichment}

        if enrichment and not enrichment.get("_blocked"):
            found_fields = [
                f for f in ("personal_phone", "personal_email", "personal_address")
                if enrichment.get(f)
            ]
            if found_fields:
                stats["enriched"] += 1
                for f in found_fields:
                    stats[f"found_{f}"] = stats.get(f"found_{f}", 0) + 1
                lead_out["enrichment_status"] = "enriched" if len(found_fields) >= 2 else "partial"
            else:
                stats["not_found"] += 1
                lead_out["enrichment_status"] = "not_found"
        else:
            stats["not_found"] += 1
            lead_out["enrichment_status"] = "not_found"

        stats["processed"] += 1
        results.append(lead_out)

        # save progress every 25 records
        if stats["processed"] % 25 == 0:
            save_results(results)
            save_stats(stats)
            log.info(
                f"  Progress: {stats['processed']}/{stats['total']} "
                f"({stats['enriched']} enriched, {stats['not_found']} not found)"
            )

        await random_delay()
        queue.task_done()

    await page.close()
    await context.close()
    log.info(f"Worker {worker_id} finished")


async def run(limit: int | None, site_filter: str | None, headed: bool):
    leads = load_sample()
    if limit:
        leads = leads[:limit]

    # filter sites
    active_sites = [s for s in SITES if s["enabled"]]
    if site_filter:
        active_sites = [s for s in active_sites if site_filter.lower() in s["name"].lower()]
    if not active_sites:
        log.error("No active sites configured. Check config.py.")
        return

    log.info(f"Sites: {[s['name'] for s in active_sites]}")
    log.info(f"Leads to process: {len(leads)}")
    log.info(f"Concurrent browsers: {CONCURRENT_BROWSERS}")

    # check for already-enriched records (resume support)
    progress = load_progress()
    queue: asyncio.Queue = asyncio.Queue()
    skipped = 0
    for i, lead in enumerate(leads):
        key = _lead_key(lead)
        if key in progress and progress[key].get("enrichment_status") in ("enriched", "partial"):
            skipped += 1
            continue
        queue.put_nowait((i, lead))

    if skipped:
        log.info(f"Skipping {skipped} already-enriched records (resume mode)")

    results: list[dict] = list(progress.values()) if progress else []
    stats = {
        "total": queue.qsize(),
        "processed": 0,
        "enriched": 0,
        "not_found": 0,
        "found_personal_phone": 0,
        "found_personal_email": 0,
        "found_personal_address": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "sites_used": [s["name"] for s in active_sites],
    }

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=not headed,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        num_workers = min(CONCURRENT_BROWSERS, queue.qsize() or 1)
        workers = [
            asyncio.create_task(worker(i, browser, queue, results, stats, active_sites))
            for i in range(num_workers)
        ]
        await asyncio.gather(*workers)
        await browser.close()

    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    stats["match_rate"] = (
        f"{stats['enriched'] / stats['total'] * 100:.1f}%"
        if stats["total"] > 0 else "N/A"
    )

    save_results(results)
    save_stats(stats)

    log.info("=" * 60)
    log.info("ENRICHMENT COMPLETE")
    log.info(f"  Total processed : {stats['processed']}")
    log.info(f"  Enriched        : {stats['enriched']}")
    log.info(f"  Not found       : {stats['not_found']}")
    log.info(f"  Match rate      : {stats['match_rate']}")
    log.info(f"  Phones found    : {stats.get('found_personal_phone', 0)}")
    log.info(f"  Emails found    : {stats.get('found_personal_email', 0)}")
    log.info(f"  Addresses found : {stats.get('found_personal_address', 0)}")
    log.info(f"  Results saved   : {ENRICHED_FILE}")
    log.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Enrich leads via people-search scraping")
    parser.add_argument("--limit", type=int, help="Only process first N leads")
    parser.add_argument("--site", type=str, help="Filter to a specific site (e.g. 'fastpeople')")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode (visible)")
    args = parser.parse_args()

    asyncio.run(run(args.limit, args.site, args.headed))


if __name__ == "__main__":
    main()
