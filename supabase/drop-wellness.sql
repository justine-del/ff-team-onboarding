-- OPTIONAL migration — the Wellness feature was removed from the app.
--
-- This drops the wellness_checkins table (which never had a tracked migration
-- file). It is NOT run automatically and is NOT required: the app no longer
-- reads or writes this table, so leaving it in place is harmless and preserves
-- historical check-in data.
--
-- Run this ONLY after you have archived/exported any data you want to keep.

-- Optional: archive before dropping
-- create table if not exists wellness_checkins_archive as table public.wellness_checkins;

drop table if exists public.wellness_checkins;
