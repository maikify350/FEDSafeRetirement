"""
CDP-based scraper — connects Playwright to YOUR running Chrome browser.

This bypasses all anti-bot detection because it's a real browser with your
real cookies, fingerprint, and browsing history. The scraper just drives
a new tab in your existing Chrome session.

Setup (one-time):
    1. Close all Chrome windows
    2. Relaunch Chrome with remote debugging enabled:
       chrome.exe --remote-debugging-port=9222

    Or use the included launch_chrome.bat

Usage:
    python scraper_cdp.py --limit 10       # test with 10 leads
    python scraper_cdp.py                   # all 1500 sample leads
    python scraper_cdp.py --site fastpeople # specific site only
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import random
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright, Browser, Page

from config import (
    SAMPLE_FILE, ENRICHED_FILE, STATS_FILE, OUTPUT_DIR, LOG_DIR,
    REQUEST_DELAY_MIN, REQUEST_DELAY_MAX, PAGE_TIMEOUT, MAX_RETRIES, SITES,
)
from parsers import PARSERS
from matcher import best_match

# ── Logging ────────────────────────────────────────────────────────────
LOG_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_DIR / f"cdp_scraper_{datetime.now():%Y%m%d_%H%M%S}.log"),
    ],
)
log = logging.getLogger("cdp_scraper")

CDP_ENDPOINT = "http://localhost:9222"


async def random_delay(min_s: float = REQUEST_DELAY_MIN, max_s: float = REQUEST_DELAY_MAX):
    await asyncio.sleep(random.uniform(min_s, max_s))


async def human_scroll(page: Page):
    """Simulate human-like scrolling."""
    for _ in range(random.randint(1, 3)):
        await page.mouse.wheel(0, random.randint(200, 500))
        await asyncio.sleep(random.uniform(0.3, 0.8))


def build_url(site: dict, lead: dict) -> str:
    first_raw = (lead.get("first_name") or "").strip()
    last_raw  = (lead.get("last_name") or "").strip()
    state_raw = (lead.get("facility_state") or "").strip()

    name = site["name"]
    if name == "radaris":
        # Radaris uses title case: /p/First/Last/
        first = first_raw.title().replace(" ", "-")
        last  = last_raw.title().replace(" ", "-")
    elif name == "spokeo":
        # Spokeo uses title case with dash: /First-Last
        first = first_raw.title().replace(" ", "-")
        last  = last_raw.title().replace(" ", "-")
    else:
        first = first_raw.lower().replace(" ", "-")
        last  = last_raw.lower().replace(" ", "-")

    state = state_raw.lower()
    return site["base_url"].format(first=first, last=last, state=state)


def load_sample() -> list[dict]:
    with open(SAMPLE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_progress() -> dict[str, dict]:
    if ENRICHED_FILE.exists():
        with open(ENRICHED_FILE, "r", encoding="utf-8") as f:
            return {_lead_key(r): r for r in json.load(f)}
    return {}


def _lead_key(lead: dict) -> str:
    return f"{lead.get('first_name','')}-{lead.get('last_name','')}-{lead.get('facility_state','')}".lower()


def save_results(results: list[dict]):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(ENRICHED_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)


def save_stats(stats: dict):
    with open(STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)


async def check_for_captcha(page: Page) -> bool:
    """
    Detect actual CAPTCHA/challenge pages — NOT just the word 'captcha'
    anywhere in the source (Radaris includes Turnstile JS on normal pages).
    We check for signs that the page is BLOCKED, not just that it has
    anti-bot scripts loaded.
    """
    title = (await page.title()).lower()

    # title-based signals are the strongest indicator of a block page
    if any(s in title for s in ["just a moment", "security challenge", "attention required", "access denied"]):
        return True

    # check if the page has almost no visible text (block pages are empty)
    try:
        body_text = await page.inner_text("body")
        if len(body_text.strip()) < 100:
            content = await page.content()
            lower = content.lower()
            if "cf-challenge" in lower or "challenge-running" in lower:
                return True
    except Exception:
        pass

    return False


async def scrape_lead(page: Page, lead: dict, site: dict) -> dict | None:
    url = build_url(site, lead)
    site_name = site["name"]
    parser = PARSERS.get(site_name)
    if not parser:
        return None

    try:
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT)
        # wait for JS rendering
        await page.wait_for_timeout(random.randint(1500, 3000))

        if resp and resp.status == 403:
            log.warning(f"  403 on {site_name} — may need to solve CAPTCHA in browser")
            return {"_blocked": True, "_site": site_name}

        if await check_for_captcha(page):
            log.warning(f"  CAPTCHA on {site_name} for {lead['first_name']} {lead['last_name']}")
            log.warning("  >>> Solve the CAPTCHA in your Chrome window, then press Enter here <<<")
            # Wait for user to solve captcha — poll page every 2s for up to 120s
            for _ in range(60):
                await asyncio.sleep(2)
                if not await check_for_captcha(page):
                    log.info("  CAPTCHA solved! Continuing...")
                    break
            else:
                log.warning("  CAPTCHA timeout — skipping this lead")
                return {"_blocked": True, "_site": site_name}

        # simulate human scrolling
        await human_scroll(page)

        candidates = await parser(
            page,
            lead["first_name"],
            lead["last_name"],
            lead["facility_state"],
        )

        if not candidates:
            # save debug HTML for first few misses
            debug_dir = LOG_DIR / "debug_html"
            debug_dir.mkdir(exist_ok=True)
            debug_count = len(list(debug_dir.glob("*.html")))
            if debug_count < 15:
                fname = f"{site_name}_{lead['last_name']}_{lead['facility_state']}.html"
                (debug_dir / fname).write_text(await page.content(), encoding="utf-8")
                log.info(f"  Debug HTML saved -> {fname}")
            return None

        match = best_match(candidates, lead, min_confidence=0.5)
        if match:
            match["enrichment_source"] = site_name
            match["enrichment_dt"] = datetime.now(timezone.utc).isoformat()
            log.info(
                f"  MATCH [{match['match_confidence']:.0%}] "
                f"phone={match.get('personal_phone')} "
                f"addr={match.get('personal_address')}"
            )
        return match

    except Exception as e:
        log.error(f"  Error: {e}")
        return None


async def scrape_lead_all_sites(page: Page, lead: dict, sites: list[dict]) -> dict:
    for site in sites:
        if not site.get("enabled"):
            continue
        for attempt in range(1, MAX_RETRIES + 1):
            result = await scrape_lead(page, lead, site)
            if result and result.get("_blocked"):
                break
            if result:
                return result
            if attempt < MAX_RETRIES:
                await random_delay()
        await random_delay()
    return {}


async def run(limit: int | None, site_filter: str | None):
    leads = load_sample()
    if limit:
        leads = leads[:limit]

    active_sites = [s for s in SITES if s["enabled"]]
    if site_filter:
        active_sites = [s for s in active_sites if site_filter.lower() in s["name"].lower()]

    log.info(f"Sites: {[s['name'] for s in active_sites]}")
    log.info(f"Leads to process: {len(leads)}")

    # resume support
    progress = load_progress()
    pending = []
    for i, lead in enumerate(leads):
        key = _lead_key(lead)
        if key in progress and progress[key].get("enrichment_status") in ("enriched", "partial"):
            continue
        pending.append((i, lead))

    if len(pending) < len(leads):
        log.info(f"Resuming — skipping {len(leads) - len(pending)} already-enriched records")

    results: list[dict] = list(progress.values()) if progress else []
    stats = {
        "total": len(pending),
        "processed": 0,
        "enriched": 0,
        "not_found": 0,
        "blocked": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "sites_used": [s["name"] for s in active_sites],
    }

    log.info(f"Connecting to Chrome at {CDP_ENDPOINT} ...")
    log.info("Make sure Chrome is running with: chrome.exe --remote-debugging-port=9222")

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.connect_over_cdp(CDP_ENDPOINT)
            # use a new tab in the existing browser
            context = browser.contexts[0]
            page = await context.new_page()

            for idx, lead in pending:
                name = f"{lead['first_name']} {lead['last_name']} ({lead['facility_state']})"
                log.info(f"[{stats['processed']+1}/{stats['total']}] {name}")

                enrichment = await scrape_lead_all_sites(page, lead, active_sites)
                lead_out = {**lead}

                if enrichment and not enrichment.get("_blocked"):
                    found = [f for f in ("personal_phone", "personal_email", "personal_address") if enrichment.get(f)]
                    if found:
                        stats["enriched"] += 1
                        lead_out.update(enrichment)
                        lead_out["enrichment_status"] = "enriched" if len(found) >= 2 else "partial"
                        for f in found:
                            stats[f"found_{f}"] = stats.get(f"found_{f}", 0) + 1
                    else:
                        stats["not_found"] += 1
                        lead_out["enrichment_status"] = "not_found"
                elif enrichment and enrichment.get("_blocked"):
                    stats["blocked"] += 1
                    lead_out["enrichment_status"] = "blocked"
                else:
                    stats["not_found"] += 1
                    lead_out["enrichment_status"] = "not_found"

                stats["processed"] += 1
                results.append(lead_out)

                if stats["processed"] % 25 == 0:
                    save_results(results)
                    save_stats(stats)
                    log.info(
                        f"  === Progress: {stats['processed']}/{stats['total']} "
                        f"| enriched={stats['enriched']} not_found={stats['not_found']} blocked={stats['blocked']}"
                    )

                await random_delay()

            await page.close()

    except Exception as e:
        if "connect" in str(e).lower():
            log.error(
                f"Could not connect to Chrome at {CDP_ENDPOINT}.\n"
                "Please launch Chrome with remote debugging:\n"
                "  1. Close all Chrome windows\n"
                "  2. Run: chrome.exe --remote-debugging-port=9222\n"
                "  Or use: launch_chrome.bat"
            )
        else:
            log.error(f"Fatal error: {e}")
        return

    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    stats["match_rate"] = f"{stats['enriched']/stats['total']*100:.1f}%" if stats["total"] > 0 else "N/A"

    save_results(results)
    save_stats(stats)

    log.info("=" * 60)
    log.info("ENRICHMENT COMPLETE")
    log.info(f"  Total processed : {stats['processed']}")
    log.info(f"  Enriched        : {stats['enriched']}")
    log.info(f"  Not found       : {stats['not_found']}")
    log.info(f"  Blocked/CAPTCHA : {stats['blocked']}")
    log.info(f"  Match rate      : {stats['match_rate']}")
    log.info(f"  Phones found    : {stats.get('found_personal_phone', 0)}")
    log.info(f"  Emails found    : {stats.get('found_personal_email', 0)}")
    log.info(f"  Addresses found : {stats.get('found_personal_address', 0)}")
    log.info(f"  Results         : {ENRICHED_FILE}")
    log.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="CDP scraper — uses your running Chrome browser")
    parser.add_argument("--limit", type=int, help="Only process first N leads")
    parser.add_argument("--site", type=str, help="Filter to a specific site")
    args = parser.parse_args()
    asyncio.run(run(args.limit, args.site))


if __name__ == "__main__":
    main()
