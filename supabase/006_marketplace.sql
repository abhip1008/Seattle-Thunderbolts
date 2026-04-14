-- Migration: marketplace for cricket gear.
-- Two sections surface from one table via seller_type:
--   'store'     -> official Thunderbolts inventory (seller_id null)
--   'community' -> user-to-user listings (seller_id = auth.uid())

create table if not exists public.listings (
  id           uuid primary key default gen_random_uuid(),
  seller_type  text not null check (seller_type in ('store', 'community')),
  seller_id    uuid references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  category     text,
  price_cents  int  not null,
  condition    text check (condition in ('new', 'like_new', 'good', 'used')),
  image_url    text,
  status       text not null default 'active'
    check (status in ('active', 'sold', 'removed')),
  contact      text,
  created_at   timestamptz not null default now(),
  -- Community listings must have a seller; store listings must not.
  constraint seller_matches_type check (
    (seller_type = 'community' and seller_id is not null)
    or (seller_type = 'store' and seller_id is null)
  )
);

create index if not exists listings_section_idx
  on public.listings (seller_type, status, created_at desc);
create index if not exists listings_seller_idx
  on public.listings (seller_id, created_at desc);

alter table public.listings enable row level security;

-- Anyone authenticated can browse active listings.
create policy "read active listings"
  on public.listings for select
  using (status = 'active' or seller_id = auth.uid());

-- Users can only create community listings as themselves.
create policy "create own community listings"
  on public.listings for insert
  with check (
    seller_type = 'community'
    and seller_id = auth.uid()
  );

-- Users can update or remove their own listings.
create policy "update own listings"
  on public.listings for update
  using (seller_id = auth.uid());

-- Seed the Thunderbolts store with a starter catalogue.
insert into public.listings
  (seller_type, seller_id, title, description, category, price_cents, condition, contact)
values
  ('store', null,
   'Thunderbolts Match Jersey',
   'Official home jersey, moisture-wicking fabric.',
   'apparel', 5500, 'new', 'store@seattlethunderbolts.com'),
  ('store', null,
   'Senior English Willow Bat',
   'Club-grade bat, ready to knock in.',
   'bats', 14000, 'new', 'store@seattlethunderbolts.com'),
  ('store', null,
   'Leather Match Ball (4-piece)',
   'Red leather, 5.5oz, tournament spec.',
   'balls', 2200, 'new', 'store@seattlethunderbolts.com'),
  ('store', null,
   'Batting Pads — Adult',
   'Lightweight, high-impact foam.',
   'protective', 7800, 'new', 'store@seattlethunderbolts.com'),
  ('store', null,
   'Wicketkeeping Gloves',
   'Pro-grade, reinforced palm.',
   'protective', 6500, 'new', 'store@seattlethunderbolts.com');
