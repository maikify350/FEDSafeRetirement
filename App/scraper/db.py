"""
Supabase database interface for lead enrichment.

Uses the Supabase Management API (via Personal Access Token) to bypass RLS
for bulk enrichment updates. The anon key + RLS times out on 472K rows.

Usage:
    from db import LeadsDB

    db = LeadsDB()
    leads = db.get_pending_leads(limit=100)
    db.update_enrichment(lead_id, enrichment_data)
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import requests

log = logging.getLogger("db")

# ── Config from .env ───────────────────────────────────────────────────
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def _load_env() -> dict[str, str]:
    env = {}
    if _ENV_PATH.exists():
        for line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


class LeadsDB:
    """Thin wrapper around Supabase Management API for lead enrichment ops."""

    def __init__(self):
        env = _load_env()
        self.project_id = env.get("NEXT_PUBLIC_PROJECT_ID", "gqarlkfmpgaotbezpkbs")
        self.pat = env.get("NEXT_PUBLIC_SUPABASE_PERSONAL_ACCESS_TOKEN", "")
        if not self.pat:
            raise RuntimeError("NEXT_PUBLIC_SUPABASE_PERSONAL_ACCESS_TOKEN not found in App/.env")
        self.base_url = f"https://api.supabase.com/v1/projects/{self.project_id}/database/query"
        self.headers = {
            "Authorization": f"Bearer {self.pat}",
            "Content-Type": "application/json",
        }

    def _sql(self, query: str, timeout: int = 30) -> list[dict]:
        resp = requests.post(
            self.base_url,
            headers=self.headers,
            json={"query": query},
            timeout=timeout,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        raise RuntimeError(f"SQL error ({resp.status_code}): {resp.text[:300]}")

    # ── Read operations ────────────────────────────────────────────────

    def get_pending_leads(self, limit: int = 100, state: str | None = None) -> list[dict]:
        """Get leads with enrichment_status='pending', optionally filtered by state."""
        where = "WHERE enrichment_status = 'pending'"
        if state:
            where += f" AND facility_state = '{state.upper()}'"
        sql = f"""
            SELECT id, first_name, last_name, middle_initial,
                   facility_state, facility_city, facility_name,
                   occupation_title, annual_salary, entered_on_duty_date
            FROM public.leads
            {where}
            ORDER BY RANDOM()
            LIMIT {limit}
        """
        return self._sql(sql)

    def get_lead_count(self, status: str | None = None) -> int:
        where = f"WHERE enrichment_status = '{status}'" if status else ""
        result = self._sql(f"SELECT COUNT(*) as cnt FROM public.leads {where}")
        return result[0]["cnt"] if result else 0

    def get_enrichment_stats(self) -> list[dict]:
        return self._sql("""
            SELECT enrichment_status, COUNT(*) as cnt
            FROM public.leads
            GROUP BY enrichment_status
            ORDER BY cnt DESC
        """)

    # ── Write operations ───────────────────────────────────────────────

    def update_enrichment(self, lead_id: str, data: dict) -> bool:
        """
        Update enrichment fields for a single lead.

        data should contain any of:
            personal_email, personal_phone, personal_address,
            personal_city, personal_state, personal_zip,
            linkedin_url, enrichment_source, enrichment_confidence,
            enrichment_status
        """
        allowed_fields = {
            "personal_email", "personal_phone", "personal_address",
            "personal_city", "personal_state", "personal_zip",
            "linkedin_url", "facebook_url",
            "enrichment_source", "enrichment_confidence",
            "enrichment_status", "age_estimate",
        }

        sets = []
        for field in allowed_fields:
            if field in data and data[field] is not None:
                val = str(data[field]).replace("'", "''")
                if field == "enrichment_confidence":
                    sets.append(f"{field} = {float(val)}")
                elif field == "age_estimate":
                    sets.append(f"{field} = {int(val)}")
                else:
                    sets.append(f"{field} = '{val}'")

        if not sets:
            return False

        # Always set enrichment timestamp and mod_by
        sets.append(f"enrichment_dt = '{datetime.now(timezone.utc).isoformat()}'")
        sets.append("mod_by = 'scraper_enrichment'")

        sql = f"""
            UPDATE public.leads
            SET {', '.join(sets)}
            WHERE id = '{lead_id}'
            RETURNING id
        """
        try:
            result = self._sql(sql)
            return len(result) > 0
        except Exception as e:
            log.error(f"Failed to update lead {lead_id}: {e}")
            return False

    def bulk_update_enrichment(self, updates: list[dict]) -> dict:
        """
        Batch update multiple leads. Each item in updates must have 'id' + enrichment fields.
        Uses a single SQL transaction for efficiency.

        Returns: {"updated": N, "failed": N}
        """
        if not updates:
            return {"updated": 0, "failed": 0}

        stats = {"updated": 0, "failed": 0}

        # Build a single transaction with multiple UPDATE statements
        sql_parts = ["BEGIN;"]
        for item in updates:
            lead_id = item.get("id")
            if not lead_id:
                stats["failed"] += 1
                continue

            allowed_fields = {
                "personal_email", "personal_phone", "personal_address",
                "personal_city", "personal_state", "personal_zip",
                "linkedin_url", "facebook_url",
                "enrichment_source", "enrichment_confidence",
                "enrichment_status", "age_estimate",
            }

            sets = []
            for field in allowed_fields:
                if field in item and item[field] is not None:
                    val = str(item[field]).replace("'", "''")
                    if field == "enrichment_confidence":
                        sets.append(f"{field} = {float(val)}")
                    elif field == "age_estimate":
                        sets.append(f"{field} = {int(val)}")
                    else:
                        sets.append(f"{field} = '{val}'")

            if sets:
                sets.append(f"enrichment_dt = '{datetime.now(timezone.utc).isoformat()}'")
                sets.append("mod_by = 'scraper_enrichment'")
                sql_parts.append(
                    f"UPDATE public.leads SET {', '.join(sets)} WHERE id = '{lead_id}';"
                )

        sql_parts.append("COMMIT;")

        try:
            self._sql("\n".join(sql_parts), timeout=60)
            stats["updated"] = len(updates) - stats["failed"]
        except Exception as e:
            log.error(f"Bulk update failed: {e}")
            stats["failed"] = len(updates)

        return stats
