"""
Quick test of the RTRVR.ai /agent API for lead enrichment.

Setup:
    1. Get your API key from https://www.rtrvr.ai/cloud (you have Pro)
    2. Add to App/.env:  RTRVR_API_KEY=rtrvr_your_key_here
    3. Run:  python test_rtrvr.py

This tests a single lead lookup to verify the API works before running
the full batch enrichment.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

# Load API key from .env
def load_api_key() -> str:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "RTRVR_API_KEY=" in line and not line.strip().startswith("#"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    key = os.environ.get("RTRVR_API_KEY", "") or os.environ.get("NEXT_PUBLIC_RTRVR_API_KEY", "")
    if not key:
        print("ERROR: RTRVR_API_KEY not found.")
        print("Add to App/.env:  RTRVR_API_KEY=rtrvr_your_key_here")
        print("Get your key at: https://www.rtrvr.ai/cloud")
        sys.exit(1)
    return key


async def test_single_lookup(api_key: str):
    """Test RTRVR agent API with a known lead (Eleanor Sanbei, AK)."""
    import aiohttp

    # This is the lead we've already verified manually on Radaris
    test_lead = {
        "first_name": "Eleanor",
        "last_name": "Sanbei",
        "facility_state": "AK",
        "facility_city": "Aniak",
        "occupation_title": "POSTMASTER",
    }

    print(f"Testing RTRVR API with: {test_lead['first_name']} {test_lead['last_name']} ({test_lead['facility_state']})")
    print(f"Expected: phone=(907) 675-4395, email=ersanbei@yahoo.com, addr=PO Box 162, Aniak, AK 99557")
    print()

    payload = {
        "input": (
            f"Find the personal contact information for {test_lead['first_name']} {test_lead['last_name']} "
            f"who lives near {test_lead['facility_city']}, {test_lead['facility_state']}. "
            f"They work for the US Postal Service as a {test_lead['occupation_title']}. "
            f"Search people-search sites like radaris.com, fastpeoplesearch.com, or truepeoplesearch.com. "
            f"Return their home address, personal phone number, and personal email address."
        ),
        "urls": [
            f"https://radaris.com/p/{test_lead['first_name']}/{test_lead['last_name']}/",
        ],
        "output_schema": {
            "type": "object",
            "properties": {
                "phone": {"type": "string", "description": "Personal phone number"},
                "email": {"type": "string", "description": "Personal email address"},
                "address": {"type": "string", "description": "Street address"},
                "city": {"type": "string", "description": "City"},
                "state": {"type": "string", "description": "State abbreviation"},
                "zip": {"type": "string", "description": "ZIP code"},
                "confidence": {"type": "string", "description": "How confident are you this is the right person? high/medium/low"},
                "source": {"type": "string", "description": "Which website provided this data"},
            },
        },
        "response": {"verbosity": "final"},
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    print("Sending request to RTRVR /agent endpoint...")
    print(f"Payload: {json.dumps(payload, indent=2)[:500]}...")
    print()

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                "https://api.rtrvr.ai/agent",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=60),
            ) as resp:
                status = resp.status
                print(f"Response status: {status}")

                if status == 200:
                    data = await resp.json()
                    print(f"Response: {json.dumps(data, indent=2)}")
                    print()
                    print("SUCCESS — RTRVR API is working!")
                    print("You can now run the full enrichment with:")
                    print("  python rtrvr_scraper.py --method api --limit 50")
                elif status == 401:
                    print("ERROR: 401 Unauthorized — check your API key")
                    text = await resp.text()
                    print(f"Response: {text[:300]}")
                elif status == 402:
                    print("ERROR: 402 — credits exhausted or payment required")
                    text = await resp.text()
                    print(f"Response: {text[:300]}")
                elif status == 429:
                    print("ERROR: 429 — rate limited. Try again in a few seconds.")
                    text = await resp.text()
                    print(f"Response: {text[:300]}")
                else:
                    text = await resp.text()
                    print(f"ERROR: Unexpected status {status}")
                    print(f"Response: {text[:500]}")

        except aiohttp.ClientError as e:
            print(f"ERROR: Connection failed — {e}")
        except asyncio.TimeoutError:
            print("ERROR: Request timed out (60s). RTRVR may be processing — try again.")


async def test_scrape_endpoint(api_key: str):
    """Test the cheaper /scrape endpoint (just returns page data, no agent)."""
    import aiohttp

    print("\n--- Testing /scrape endpoint (cheaper) ---")

    payload = {
        "input": "Extract all personal contact information visible on this page: phone numbers, email addresses, and physical addresses.",
        "urls": ["https://radaris.com/p/Eleanor/Sanbei/"],
        "response": {"verbosity": "final"},
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                "https://api.rtrvr.ai/scrape",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=45),
            ) as resp:
                print(f"Response status: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    print(f"Response: {json.dumps(data, indent=2)[:1000]}")
                    print("\n/scrape endpoint works! This is cheaper per-call than /agent.")
                else:
                    text = await resp.text()
                    print(f"Response: {text[:500]}")

        except Exception as e:
            print(f"ERROR: {e}")


async def main():
    api_key = load_api_key()
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    print()

    await test_single_lookup(api_key)
    await test_scrape_endpoint(api_key)


if __name__ == "__main__":
    # install aiohttp if missing
    try:
        import aiohttp
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp", "-q"])
        import aiohttp

    asyncio.run(main())
