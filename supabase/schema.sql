-- Run this in the Supabase SQL editor to set up the database.

-- Lanes (cricket nets) at the facility.
create table public.lanes (
  id            int primary key,
  name          text not null,
  surface       text,                         -- e.g. 'turf', 'matting', 'concrete'
  notes         text,
  -- Position of the lane on the SVG floor plan (0..100 in both axes).
  layout_x      numeric not null,
  layout_y      numeric not null,
  layout_w      numeric not null default 12,
  layout_h      numeric not null default 30
);

-- A user's reservation of a lane for a given time window.
create table public.bookings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  lane_id     int  not null references public.lanes(id),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now(),
  status      text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  constraint  ends_after_starts check (ends_at > starts_at)
);

-- Prevent overlapping confirmed bookings on the same lane.
create extension if not exists btree_gist;
alter table public.bookings
  add constraint no_overlap exclude using gist (
    lane_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed');

create index bookings_user_idx on public.bookings (user_id, starts_at desc);
create index bookings_lane_idx on public.bookings (lane_id, starts_at);

-- Events held at the facility.
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  location    text,
  image_url   text,
  created_at  timestamptz not null default now()
);

create index events_starts_idx on public.events (starts_at);

-- Row-level security.
alter table public.lanes    enable row level security;
alter table public.bookings enable row level security;
alter table public.events   enable row level security;

-- Lanes and events: anyone authenticated can read.
create policy "read lanes"  on public.lanes  for select using (true);
create policy "read events" on public.events for select using (true);

-- Bookings: users see and manage only their own.
create policy "read own bookings"   on public.bookings for select using (auth.uid() = user_id);
create policy "create own bookings" on public.bookings for insert with check (auth.uid() = user_id);
create policy "update own bookings" on public.bookings for update using (auth.uid() = user_id);

-- Seed lanes (placeholder layout — adjust to the real facility floor plan).
insert into public.lanes (id, name, surface, layout_x, layout_y, layout_w, layout_h) values
  (1, 'Lane 1', 'turf',    8,  10, 12, 35),
  (2, 'Lane 2', 'turf',   24,  10, 12, 35),
  (3, 'Lane 3', 'turf',   40,  10, 12, 35),
  (4, 'Lane 4', 'matting',56,  10, 12, 35),
  (5, 'Lane 5', 'matting',72,  10, 12, 35),
  (6, 'Lane 6', 'concrete',8, 55, 12, 35);

-- Seed a couple of events.
insert into public.events (title, description, starts_at, location) values
  ('Junior Cricket Camp',     'Week-long camp for ages 8–14.',           now() + interval '7 days',  'Main facility'),
  ('Adult League Tryouts',    'Open tryouts for the summer league.',      now() + interval '14 days', 'Main facility'),
  ('Coaching Clinic with Pro','Special session with a guest coach.',      now() + interval '21 days', 'Lane 1');
