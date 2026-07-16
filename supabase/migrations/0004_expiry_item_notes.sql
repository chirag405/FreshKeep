-- Adds an optional free-text note to expiring items (e.g. "opened this on
-- Tuesday, smells fine so far"), matching last_time_tasks.note. The unused
-- `location` column from 0001_init.sql is left in place (no writers, no
-- readers) rather than dropped, to avoid a destructive migration.

alter table public.expiry_items add column if not exists note text;
