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
