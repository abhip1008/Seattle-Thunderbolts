-- Migration: 8 lanes split into left (1-4) and right (5-8) columns.
-- Lanes 2, 3, 4 have bowling machines; lane 1 + lanes 5-8 are regular nets.
-- Run this in the Supabase SQL editor *after* schema.sql.

alter table public.lanes
  add column if not exists kind text not null default 'net'
    check (kind in ('net', 'bowling_machine'));

-- Wipe existing seed lanes and any bookings against them, then re-seed.
delete from public.bookings;
delete from public.lanes;

-- Layout uses a 100x100 viewBox.
-- Left column: lanes 1-4 at x = 4, 16, 28, 40 (w = 10, h = 80, y = 10).
-- Right column: lanes 5-8 at x = 50, 62, 74, 86.
insert into public.lanes (id, name, surface, kind, layout_x, layout_y, layout_w, layout_h) values
  (1, 'Lane 1', 'turf',     'net',              4,  10, 22, 55),
  (2, 'Lane 2', 'turf',     'bowling_machine', 16,  10, 22, 55),
  (3, 'Lane 3', 'turf',     'bowling_machine', 28,  10, 22, 55),
  (4, 'Lane 4', 'turf',     'bowling_machine', 40,  10, 22, 55),
  (5, 'Lane 5', 'matting',  'net',             50,  10, 22, 55),
  (6, 'Lane 6', 'matting',  'net',             62,  10, 22, 55),
  (7, 'Lane 7', 'matting',  'net',             74,  10, 22, 55),
  (8, 'Lane 8', 'matting',  'net',             86,  10, 22, 55);
