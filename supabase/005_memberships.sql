-- Migration: add membership tiers + paid subscriptions.
-- Run after 004_payments.sql.

-- Catalogue of available tiers. Start with two.
create table if not exists public.membership_tiers (
  id                  text primary key,
  name                text not null,
  price_cents         int  not null,
  period_days         int  not null default 30,
  perks               text[] not null default '{}',
  sort_order          int  not null default 0
);

insert into public.membership_tiers (id, name, price_cents, period_days, perks, sort_order)
values
  ('basic',
   'Basic',
   2500,
   30,
   array['Members-only booking window (48h ahead)', '10% off every booking'],
   1),
  ('premium',
   'Premium',
   7500,
   30,
   array['Priority booking (72h ahead)', '25% off every booking', 'One free coaching clinic / month'],
   2)
on conflict (id) do update
  set name        = excluded.name,
      price_cents = excluded.price_cents,
      period_days = excluded.period_days,
      perks       = excluded.perks,
      sort_order  = excluded.sort_order;

alter table public.membership_tiers enable row level security;
create policy "read tiers" on public.membership_tiers for select using (true);

-- One row per purchased membership. A user can have many rows over time;
-- the active one is the most recent with valid_until in the future.
create table if not exists public.memberships (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  tier_id             text not null references public.membership_tiers(id),
  status              text not null default 'active'
    check (status in ('active', 'cancelled', 'expired')),
  valid_from          timestamptz not null default now(),
  valid_until         timestamptz not null,
  amount_cents        int  not null,
  payment_intent_id   text,
  created_at          timestamptz not null default now()
);

create index if not exists memberships_user_idx
  on public.memberships (user_id, valid_until desc);

alter table public.memberships enable row level security;

create policy "read own memberships"
  on public.memberships for select using (auth.uid() = user_id);

create policy "create own memberships"
  on public.memberships for insert with check (auth.uid() = user_id);

create policy "update own memberships"
  on public.memberships for update using (auth.uid() = user_id);
