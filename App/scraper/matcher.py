"""
Fuzzy matching logic to pick the best candidate from scrape results.

We match on:
  - Name similarity (first + last)
  - Geographic proximity (state match, city proximity to facility_city)
"""
from __future__ import annotations


def score_candidate(candidate: dict, lead: dict) -> float:
    """
    Score a candidate match (0.0 = no match, 1.0 = perfect match).
    Returns the confidence score.
    """
    score = 0.0
    max_score = 0.0

    matched_name = (candidate.get("matched_name") or "").lower()
    lead_first = (lead.get("first_name") or "").lower()
    lead_last = (lead.get("last_name") or "").lower()

    # ── Name match (0-0.5) ─────────────────────────────────────────────
    max_score += 0.5
    if lead_last and lead_last in matched_name:
        score += 0.3
        if lead_first and lead_first in matched_name:
            score += 0.2

    # ── State match (0-0.2) ────────────────────────────────────────────
    max_score += 0.2
    cand_state = (candidate.get("state") or "").upper()
    lead_state = (lead.get("facility_state") or "").upper()
    if cand_state and lead_state and cand_state == lead_state:
        score += 0.2

    # ── City match (0-0.2) ─────────────────────────────────────────────
    max_score += 0.2
    cand_city = (candidate.get("city") or "").lower()
    lead_city = (lead.get("facility_city") or "").lower()
    if cand_city and lead_city:
        if cand_city == lead_city:
            score += 0.2
        elif cand_city in lead_city or lead_city in cand_city:
            score += 0.1

    # ── Has contact data bonus (0-0.1) ─────────────────────────────────
    max_score += 0.1
    has_data = any(candidate.get(f) for f in ("phone", "email", "address"))
    if has_data:
        score += 0.1

    return round(score / max_score, 2) if max_score > 0 else 0.0


def best_match(candidates: list[dict], lead: dict, min_confidence: float = 0.5) -> dict | None:
    """
    Pick the best candidate above the confidence threshold.
    Returns enrichment dict or None.
    """
    if not candidates:
        return None

    scored = [(score_candidate(c, lead), c) for c in candidates]
    scored.sort(key=lambda x: -x[0])

    best_score, best_cand = scored[0]
    if best_score < min_confidence:
        return None

    return {
        "personal_phone":   best_cand.get("phone"),
        "personal_email":   best_cand.get("email"),
        "personal_address": best_cand.get("address"),
        "personal_city":    best_cand.get("city"),
        "personal_state":   best_cand.get("state"),
        "personal_zip":     best_cand.get("zip"),
        "matched_name":     best_cand.get("matched_name"),
        "match_confidence":  best_score,
    }
