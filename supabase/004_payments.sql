-- Migration: add Stripe-powered payments to lane bookings.
-- Run in the Supabase SQL editor after 003_shorter_lanes.sql.

-- Per-lane price (in cents) so staff can adjust without a code change.
alter table public.lanes
  add column if not exists price_cents int not null default 2000;

-- Link each booking to its Stripe PaymentIntent + payment state.
alter table public.bookings
  add column if not exists amount_cents       int,
  add column if not exists payment_intent_id  text,
  add column if not exists payment_status     text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded', 'failed'));

create index if not exists bookings_payment_intent_idx
  on public.bookings (payment_intent_id);

-- Reasonable starter pricing: bowling-machine lanes a bit more.
update public.lanes set price_cents = 2500 where kind = 'bowling_machine';
update public.lanes set price_cents = 2000 where kind = 'net';
