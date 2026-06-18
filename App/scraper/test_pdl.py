"""
Test PeopleDataLabs Person Enrichment API for USPS lead enrichment.

PDL returns: phone_numbers, personal_emails, street_address, locality, region, postal_code
Match by: first_name + last_name + company:'United States Postal Service' + region:state

Setup:
    1. Sign up at https://www.peopledatalabs.com/ (free tier: 100 credits)
    2. Get API key from dashboard
    3. Add to App/.env:  PDL_API_KEY=your_key_here
    4. Run:  python test_pdl.py

Pricing: $0.20-0.28/credit (Pro plan). Only charged on 200 (match found).
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

import aiohttp


def load_api_key() -> str:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "PDL_API_KEY=" in line and not line.strip().startswith("#"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    key = os.environ.get("PDL_API_KEY", "")
    if not key:
        print("ERROR: PDL_API_KEY not found.")
        print("1. Sign up free at https://www.peopledatalabs.com/")
        print("2. Add to App/.env:  PDL_API_KEY=your_key_here")
        print("   (Free tier gives you 100 credits to test)")
        sys.exit(1)
    return key


async def enrich_person(session: aiohttp.ClientSession, api_key: str, lead: dict) -> dict:
    """Call PDL Person Enrichment API."""
    params = {
        "api_key": api_key,
        "first_name": lead["first_name"],
        "last_name": lead["last_name"],
        "company": "United States Postal Service",
        "region": lead.get("facility_state", ""),
        "locality": lead.get("facility_city", ""),
        "min_likelihood": 5,
        "titlecase": "true",
        "include_if_matched": "true",
        "required": "phone_numbers OR emails",
    }

    try:
        async with session.get(
            "https://api.peopledatalabs.com/v5/person/enrich",
            params=params,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as resp:
            data = await resp.json()
            return {
                "status": resp.status,
                "likelihood": data.get("likelihood"),
                "data": data.get("data"),
                "matched": data.get("matched"),
                "error": data.get("error", {}).get("message") if resp.status != 200 else None,
            }
    except Exception as e:
        return {"status": 0, "error": str(e)}


def extract_contact(pdl_data: dict) -> dict:
    """Extract enrichment fields from PDL response."""
    if not pdl_data:
        return {}

    # Phone — prefer mobile
    phones = pdl_data.get("phone_numbers") or []
    mobile = next((p for p in phones if "mobile" in str(p).lower()), None)
    phone = mobile or (phones[0] if phones else None)

    # Email — prefer personal
    personal_emails = pdl_data.get("personal_emails") or []
    all_emails = pdl_data.get("emails") or []
    personal = [e for e in all_emails if e.get("type") == "personal"]
    email = (
        personal_emails[0] if personal_emails
        else personal[0].get("address") if personal
        else all_emails[0].get("address") if all_emails
        else None
    )

    return {
        "personal_phone": phone if isinstance(phone, str) else (phone.get("number") if isinstance(phone, dict) else None),
        "personal_email": email,
        "personal_address": pdl_data.get("street_address"),
        "personal_city": pdl_data.get("locality"),
        "personal_state": pdl_data.get("region"),
        "personal_zip": pdl_data.get("postal_code"),
        "linkedin_url": pdl_data.get("linkedin_url"),
        "match_likelihood": pdl_data.get("likelihood"),
    }


async def test_known_lead(session: aiohttp.ClientSession, api_key: str):
    """Test with Eleanor Sanbei — our known-good lead."""
    print("=" * 60)
    print("TEST 1: Known lead — Eleanor Sanbei (AK)")
    print("Expected: phone=(907) 675-4395, email=ersanbei@yahoo.com")
    print("=" * 60)

    lead = {
        "first_name": "Eleanor",
        "last_name": "Sanbei",
        "facility_state": "AK",
        "facility_city": "Aniak",
    }

    result = await enrich_person(session, api_key, lead)
    print(f"\nStatus: {result['status']}")
    print(f"Likelihood: {result.get('likelihood')}")

    if result["status"] == 200 and result.get("data"):
        contact = extract_contact(result["data"])
        print(f"\nExtracted contact:")
        for k, v in contact.items():
            print(f"  {k}: {v}")
        print(f"\nMatched on: {result.get('matched')}")
    elif result["status"] == 404:
        print("No match found (404)")
    else:
        print(f"Error: {result.get('error')}")

    return result


async def test_batch(session: aiohttp.ClientSession, api_key: str, leads: list[dict], limit: int = 10):
    """Test a batch of leads."""
    print("\n" + "=" * 60)
    print(f"TEST 2: Batch of {limit} random leads")
    print("=" * 60)

    stats = {"matched": 0, "not_found": 0, "error": 0, "phones": 0, "emails": 0, "addresses": 0}

    for i, lead in enumerate(leads[:limit]):
        name = f"{lead['first_name']} {lead['last_name']} ({lead.get('facility_state', '?')})"
        result = await enrich_person(session, api_key, lead)

        if result["status"] == 200 and result.get("data"):
            contact = extract_contact(result["data"])
            stats["matched"] += 1
            if contact.get("personal_phone"): stats["phones"] += 1
            if contact.get("personal_email"): stats["emails"] += 1
            if contact.get("personal_address"): stats["addresses"] += 1
            print(f"  [{i+1}/{limit}] {name} -> MATCH (L={result['likelihood']}) "
                  f"phone={contact.get('personal_phone')} email={contact.get('personal_email')}")
        elif result["status"] == 404:
            stats["not_found"] += 1
            print(f"  [{i+1}/{limit}] {name} -> not found")
        else:
            stats["error"] += 1
            print(f"  [{i+1}/{limit}] {name} -> error: {result.get('error', '')[:60]}")

        await asyncio.sleep(0.7)  # respect rate limits

    print(f"\nBatch results:")
    print(f"  Matched:   {stats['matched']}/{limit} ({stats['matched']/limit*100:.0f}%)")
    print(f"  Not found: {stats['not_found']}/{limit}")
    print(f"  Errors:    {stats['error']}/{limit}")
    print(f"  Phones:    {stats['phones']}/{limit}")
    print(f"  Emails:    {stats['emails']}/{limit}")
    print(f"  Addresses: {stats['addresses']}/{limit}")
    print(f"\n  Credits used: ~{stats['matched']} (only charged on matches)")


async def main():
    api_key = load_api_key()
    print(f"PDL API Key: {api_key[:8]}...{api_key[-4:]}")
    print()

    # Load sample leads
    sample_file = Path(__file__).parent / "output" / "sample_leads.json"
    with open(sample_file) as f:
        leads = json.load(f)
    print(f"Loaded {len(leads)} sample leads\n")

    async with aiohttp.ClientSession() as session:
        # Test 1: known lead
        await test_known_lead(session, api_key)

        # Test 2: batch of 10
        await test_batch(session, api_key, leads, limit=10)

    print("\n" + "=" * 60)
    print("To run full enrichment, use:")
    print("  python pdl_enricher.py --limit 100")
    print("=" * 60)


if __name__ == "__main__":
    try:
        import aiohttp
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp", "-q"])

    asyncio.run(main())
