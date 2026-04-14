export type Lane = {
  id: number;
  name: string;
  surface: string | null;
  notes: string | null;
  kind: 'net' | 'bowling_machine';
  layout_x: number;
  layout_y: number;
  layout_w: number;
  layout_h: number;
  price_cents: number;
};

export type Booking = {
  id: string;
  user_id: string;
  lane_id: number;
  starts_at: string;
  ends_at: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
  amount_cents: number | null;
  payment_intent_id: string | null;
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'failed';
};

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  image_url: string | null;
};

export type MembershipTier = {
  id: string;
  name: string;
  price_cents: number;
  period_days: number;
  perks: string[];
  sort_order: number;
};

export type Listing = {
  id: string;
  seller_type: 'store' | 'community';
  seller_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  price_cents: number;
  condition: 'new' | 'like_new' | 'good' | 'used' | null;
  image_url: string | null;
  status: 'active' | 'sold' | 'removed';
  contact: string | null;
  created_at: string;
};

export type Membership = {
  id: string;
  user_id: string;
  tier_id: string;
  status: 'active' | 'cancelled' | 'expired';
  valid_from: string;
  valid_until: string;
  amount_cents: number;
  payment_intent_id: string | null;
  created_at: string;
};
