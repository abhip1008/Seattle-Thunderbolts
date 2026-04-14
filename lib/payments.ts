import { supabase } from '@/lib/supabase';

export type PaymentIntentResponse = {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
  lane_name: string;
};

export async function createPaymentIntent(params: {
  lane_id: number;
  starts_at: string;
  ends_at: string;
}): Promise<PaymentIntentResponse> {
  const { data, error } = await supabase.functions.invoke<PaymentIntentResponse>(
    'create-payment-intent',
    { body: params }
  );
  if (error) throw error;
  if (!data?.client_secret) throw new Error('No client_secret returned');
  return data;
}

export function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
