"""
Scraper configuration — all tunables in one place.
"""
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────
PROJECT_ROOT  = Path(__file__).resolve().parent
DATA_SEED     = PROJECT_ROOT.parent.parent / "DataSeed" / "00 FOIA 2025 PO REVISED.xlsx"
OUTPUT_DIR    = PROJECT_ROOT / "output"
LOG_DIR       = PROJECT_ROOT / "logs"

# ── Sample ─────────────────────────────────────────────────────────────
SAMPLE_SIZE       = 1500
SAMPLE_FILE       = OUTPUT_DIR / "sample_leads.json"
ENRICHED_FILE     = OUTPUT_DIR / "enriched_leads.json"
STATS_FILE        = OUTPUT_DIR / "enrichment_stats.json"

# ── Scraper tunables ───────────────────────────────────────────────────
CONCURRENT_BROWSERS = 3          # parallel browser instances (headless only)
REQUEST_DELAY_MIN   = 8.0        # seconds between requests — slower to avoid Radaris 403
REQUEST_DELAY_MAX   = 15.0       # randomised upper bound — stay under the radar
PAGE_TIMEOUT        = 15_000     # ms — how long to wait for page load
MAX_RETRIES         = 2          # retries per lead on transient failure
HEADLESS            = True       # set False to watch the browser
MIN_CONFIDENCE      = 0.6        # minimum match score to accept

# ── Target sites (in priority order) ──────────────────────────────────
# Radaris works well with CDP (real Chrome). FastPeopleSearch and
# TruePeopleSearch aggressively block automated browsers as of 2026.
SITES = [
    {
        "name": "radaris",
        "base_url": "https://radaris.com/p/{first}/{last}/",
        "enabled": True,
    },
    {
        "name": "spokeo",
        "base_url": "https://www.spokeo.com/{first}-{last}?loaded=1",
        "enabled": True,
    },
    {
        "name": "fastpeoplesearch",
        "base_url": "https://www.fastpeoplesearch.com/name/{first}_{last}_{state}",
        "enabled": False,  # blocks headless & CDP as of 2026
    },
    {
        "name": "truepeoplesearch",
        "base_url": "https://www.truepeoplesearch.com/results?name={first}+{last}&citystatezip={state}",
        "enabled": False,  # aggressive CAPTCHA on automated access
    },
]
