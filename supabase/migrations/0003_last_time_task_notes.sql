-- Adds an optional free-text note to last-time tasks (e.g. "used the blue
-- filter, next one is under the sink") shown back to the user when the
-- reminder fires. Run after 0001_init.sql / 0002_billing.sql.

alter table public.last_time_tasks add column if not exists note text;
