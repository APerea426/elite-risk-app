-- ============================================================
-- Migration: add line_of_coverage to premium_loss_history
-- Run this in the Supabase SQL Editor before deploying code.
-- ============================================================

-- 1. Add the new column (nullable so existing rows are unaffected)
ALTER TABLE premium_loss_history
  ADD COLUMN IF NOT EXISTS line_of_coverage TEXT;

-- 2. Drop the old unique constraint (client_id, year)
ALTER TABLE premium_loss_history
  DROP CONSTRAINT IF EXISTS premium_loss_history_client_id_year_key;

-- 3. Create a new unique index that treats NULL = NULL
--    so (client_id, year, NULL) is also unique per pair
--    and (client_id, year, 'AL') is distinct from (client_id, year, 'MTC')
CREATE UNIQUE INDEX IF NOT EXISTS premium_loss_history_client_year_line_idx
  ON premium_loss_history (client_id, year, line_of_coverage)
  NULLS NOT DISTINCT;

-- 4. (Optional) verify — should return 0 rows if no duplicates exist
-- SELECT client_id, year, line_of_coverage, COUNT(*)
-- FROM premium_loss_history
-- GROUP BY client_id, year, line_of_coverage
-- HAVING COUNT(*) > 1;
