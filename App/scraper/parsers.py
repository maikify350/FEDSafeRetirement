"""
Site-specific HTML parsers.  Each parser receives a Playwright Page and
returns a list of candidate matches (dicts) found on the results page.
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


# Registry: site name -> parser function
PARSERS = {
    "fastpeoplesearch": parse_fastpeoplesearch,
    "truepeoplesearch": parse_truepeoplesearch,
}
