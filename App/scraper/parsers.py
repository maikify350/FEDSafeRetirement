"""
Site-specific HTML parsers.  Each parser receives a Playwright Page and
returns a list of candidate matches (dicts) found on the results page.

Radaris is the primary target — it returns address, phone, email, age,
and employer in a structured format without heavy anti-bot protection
when accessed from a real Chrome session via CDP.
"""
from __future__ import annotations

import re
from playwright.async_api import Page


async def parse_fastpeoplesearch(page: Page, first: str, last: str, state: str) -> list[dict]:
    """
    Parse FastPeopleSearch results page.
    Returns list of candidate matches with available contact info.
    """
    candidates = []
    try:
        cards = await page.query_selector_all("div.card.card-block")
        if not cards:
            # try alternate selectors
            cards = await page.query_selector_all("div.people-list div.card")

        for card in cards:
            candidate: dict = {}

            # name
            name_el = await card.query_selector("h2 a, .card-title a, a.btn-link")
            if name_el:
                candidate["matched_name"] = (await name_el.inner_text()).strip()

            # location / address
            addr_el = await card.query_selector("span.person-adr, .detail-box-address span")
            if addr_el:
                addr_text = (await addr_el.inner_text()).strip()
                candidate.update(_parse_address_text(addr_text))

            # phone
            phone_el = await card.query_selector("a[href^='tel:'], .detail-box-phone a")
            if phone_el:
                candidate["phone"] = (await phone_el.inner_text()).strip()

            # age
            age_el = await card.query_selector("span.person-age")
            if age_el:
                candidate["age"] = (await age_el.inner_text()).strip()

            if candidate.get("matched_name"):
                candidates.append(candidate)

        # if cards didn't work, try the detail page layout (single-person view)
        if not candidates:
            candidates = await _parse_fps_detail(page)

    except Exception:
        pass

    return candidates


async def _parse_fps_detail(page: Page) -> list[dict]:
    """Parse a FastPeopleSearch detail/single-result page."""
    candidate: dict = {}

    name_el = await page.query_selector("h1")
    if name_el:
        candidate["matched_name"] = (await name_el.inner_text()).strip()

    # current address
    addr_section = await page.query_selector("#current-address, [data-link-to-more='address']")
    if addr_section:
        addr_text = (await addr_section.inner_text()).strip()
        candidate.update(_parse_address_text(addr_text))

    # phone numbers
    phone_section = await page.query_selector("#phone-number, [data-link-to-more='phone']")
    if phone_section:
        phone_link = await phone_section.query_selector("a[href^='tel:']")
        if phone_link:
            candidate["phone"] = (await phone_link.inner_text()).strip()

    # email
    email_section = await page.query_selector("#email-address, [data-link-to-more='email']")
    if email_section:
        email_link = await email_section.query_selector("a[href^='mailto:']")
        if email_link:
            candidate["email"] = (await email_link.inner_text()).strip()

    return [candidate] if candidate.get("matched_name") else []


async def parse_truepeoplesearch(page: Page, first: str, last: str, state: str) -> list[dict]:
    """
    Parse TruePeopleSearch results page.
    """
    candidates = []
    try:
        cards = await page.query_selector_all("div.card.card-block, div[class*='CardContent']")

        for card in cards:
            candidate: dict = {}

            name_el = await card.query_selector("div.h4 a, a.btn-primary")
            if name_el:
                candidate["matched_name"] = (await name_el.inner_text()).strip()

            # address lines
            addr_el = await card.query_selector("span[class*='addr'], div.col-12 span.nowrap")
            if addr_el:
                addr_text = (await addr_el.inner_text()).strip()
                candidate.update(_parse_address_text(addr_text))

            # phone
            phone_el = await card.query_selector("span[class*='phone'], a[href^='tel:']")
            if phone_el:
                candidate["phone"] = (await phone_el.inner_text()).strip()

            # age
            age_el = await card.query_selector("span[class*='age']")
            if age_el:
                candidate["age"] = (await age_el.inner_text()).strip()

            if candidate.get("matched_name"):
                candidates.append(candidate)

    except Exception:
        pass

    return candidates


def _parse_address_text(text: str) -> dict:
    """
    Best-effort parsing of a freeform address string into components.
    Handles formats like:
        "123 Maple St, Springfield, MA 01101"
        "123 Maple St\nSpringfield, MA 01101"
    """
    result: dict = {}
    if not text:
        return result

    # normalise newlines and extra whitespace
    text = re.sub(r"\s+", " ", text.replace("\n", ", ")).strip()

    # try "street, city, ST ZIP" pattern
    m = re.match(
        r"^(.+?),\s*(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$",
        text,
        re.IGNORECASE,
    )
    if m:
        result["address"] = m.group(1).strip()
        result["city"]    = m.group(2).strip().title()
        result["state"]   = m.group(3).upper()
        result["zip"]     = m.group(4)
        return result

    # fallback: just extract state + zip from the end
    m2 = re.search(r"([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$", text, re.IGNORECASE)
    if m2:
        result["state"] = m2.group(1).upper()
        result["zip"]   = m2.group(2)
        before = text[: m2.start()].rstrip(", ")
        parts = [p.strip() for p in before.rsplit(",", 1)]
        if len(parts) == 2:
            result["address"] = parts[0]
            result["city"]    = parts[1].title()
        else:
            result["address"] = before

    return result


async def parse_radaris(page: Page, first: str, last: str, state: str) -> list[dict]:
    """
    Parse Radaris person page.

    Radaris has a structured Q&A section at the bottom of each person page:
      "What is X's address?"  -> "X's address is ..."
      "What is X's phone number?" -> "X's phone number is ..."
      "What is X's email address?" -> "X's email address is ..."

    It also shows address/phone/email in card sections and the body text.
    """
    candidate: dict = {}

    try:
        body = await page.inner_text("body")
        body = body.replace("\u2002", " ")  # en-space -> normal space

        # ── Parse the Q&A section (most reliable) ─────────────────────
        # Address
        addr_match = re.search(
            r"address\s+is\s+(.+?)(?:\.|$)",
            body,
            re.IGNORECASE,
        )
        if addr_match:
            addr_raw = addr_match.group(1).strip().rstrip(".")
            candidate.update(_parse_address_text(addr_raw))

        # Phone
        phone_match = re.search(
            r"phone\s+number\s+is\s+\(?(\d{3})\)?\s*[-.]?\s*(\d{3})\s*[-.]?\s*(\d{4})",
            body,
            re.IGNORECASE,
        )
        if phone_match:
            candidate["phone"] = f"({phone_match.group(1)}) {phone_match.group(2)}-{phone_match.group(3)}"

        # Email
        email_match = re.search(
            r"email\s+address\s+is\s+([\w.+-]+@[\w-]+\.[\w.]+)",
            body,
            re.IGNORECASE,
        )
        if email_match:
            email = email_match.group(1).strip().rstrip(".")
            # remove trailing TLD-period artifacts (e.g., "user@gmail.com." -> "user@gmail.com")
            candidate["email"] = email

        # ── Fallback: parse from page elements ────────────────────────
        if not candidate.get("phone"):
            phone_els = await page.query_selector_all("[class*=phone]")
            for el in phone_els:
                text = (await el.inner_text()).strip()
                pm = re.search(r"\(?(\d{3})\)?\s*[-.]?\s*(\d{3})\s*[-.]?\s*(\d{4})", text)
                if pm:
                    candidate["phone"] = f"({pm.group(1)}) {pm.group(2)}-{pm.group(3)}"
                    break

        if not candidate.get("address"):
            addr_els = await page.query_selector_all("[class*=address]")
            for el in addr_els:
                text = (await el.inner_text()).strip()
                if re.search(r"\d{5}", text):  # has a zip code
                    candidate.update(_parse_address_text(text.split("\n")[-1].strip()))
                    break

        # ── Name from page title ──────────────────────────────────────
        title = await page.title()
        name_match = re.match(r"^(.+?)\s*[-\u2013]", title)
        if name_match:
            candidate["matched_name"] = name_match.group(1).strip()

        # ── Age ───────────────────────────────────────────────────────
        age_match = re.search(r"Age\s+(\d+)", body)
        if age_match:
            candidate["age"] = age_match.group(1)

        # ── Verified location from body text ──────────────────────────
        # "Aniak, AK   Verified" pattern
        verified_match = re.search(
            r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})\s+Verified",
            body,
        )
        if verified_match and not candidate.get("city"):
            candidate["city"] = verified_match.group(1)
            candidate["state"] = verified_match.group(2)

    except Exception:
        pass

    return [candidate] if (candidate.get("phone") or candidate.get("address") or candidate.get("email")) else []


async def parse_spokeo(page: Page, first: str, last: str, state: str) -> list[dict]:
    """
    Parse Spokeo search results.
    Spokeo shows partial info (city, state, age) on the results page.
    Full contact info requires a paid account, but partial data is still useful.
    """
    candidates = []
    try:
        body = await page.inner_text("body")

        # Look for result entries with location info
        # Spokeo results typically show: "Name, Age XX, City, ST"
        pattern = re.compile(
            rf"{re.escape(first)}\s+{re.escape(last)}.*?(?:Age\s+(\d+))?.*?"
            rf"([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{{2}})",
            re.IGNORECASE | re.DOTALL,
        )
        for m in pattern.finditer(body):
            cand = {
                "matched_name": f"{first} {last}",
                "city": m.group(2),
                "state": m.group(3),
            }
            if m.group(1):
                cand["age"] = m.group(1)
            candidates.append(cand)

    except Exception:
        pass

    return candidates


# Registry: site name -> parser function
PARSERS = {
    "fastpeoplesearch": parse_fastpeoplesearch,
    "truepeoplesearch": parse_truepeoplesearch,
    "radaris": parse_radaris,
    "spokeo": parse_spokeo,
}
