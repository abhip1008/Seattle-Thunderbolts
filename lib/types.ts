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
};

export type Booking = {
  id: string;
  user_id: string;
  lane_id: number;
  starts_at: string;
  ends_at: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
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
