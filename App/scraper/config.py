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
CONCURRENT_BROWSERS = 3          # parallel browser instances
REQUEST_DELAY_MIN   = 2.0        # seconds between requests (per browser)
REQUEST_DELAY_MAX   = 5.0        # randomised upper bound
PAGE_TIMEOUT        = 15_000     # ms — how long to wait for page load
MAX_RETRIES         = 2          # retries per lead on transient failure
HEADLESS            = True       # set False to watch the browser

# ── Target sites (in priority order) ──────────────────────────────────
SITES = [
    {
        "name": "fastpeoplesearch",
        "base_url": "https://www.fastpeoplesearch.com/name/{first}_{last}_{state}",
        "enabled": True,
    },
    {
        "name": "truepeoplesearch",
        "base_url": "https://www.truepeoplesearch.com/results?name={first}+{last}&citystatezip={state}",
        "enabled": True,
    },
]
