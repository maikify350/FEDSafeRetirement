-- ============================================================
-- Migration: Add color swatch field to users table
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT NULL;

-- Optional: pre-assign a distinct color to each agent automatically
-- (only sets color where it's currently null)
WITH agent_colors AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY last_name, first_name) AS rn
  FROM public.users
  WHERE role = 'agent' AND color IS NULL
)
UPDATE public.users u
SET color = CASE ac.rn
  WHEN 1  THEN '#6366f1'
  WHEN 2  THEN '#0ea5e9'
  WHEN 3  THEN '#10b981'
  WHEN 4  THEN '#f59e0b'
  WHEN 5  THEN '#ef4444'
  WHEN 6  THEN '#8b5cf6'
  WHEN 7  THEN '#ec4899'
  WHEN 8  THEN '#14b8a6'
  WHEN 9  THEN '#f97316'
  WHEN 10 THEN '#84cc16'
  WHEN 11 THEN '#06b6d4'
  ELSE '#94a3b8'
END
FROM agent_colors ac
WHERE u.id = ac.id;

-- Verify
SELECT id, first_name, last_name, role, color
FROM public.users
WHERE role = 'agent'
ORDER BY last_name;
