// Supabase Edge Function: create-payment-intent
//
// Deploy with:
//   supabase functions deploy create-payment-intent
// Set the secret (never ship this to the client):
//   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
//
// The client calls this with { lane_id, starts_at, ends_at }. We look up the
// lane's price on the server so a malicious client can't pick its own price.

// @ts-nocheck — this file runs on Deno inside Supabase Edge Runtime.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!stripeKey || !supabaseUrl || !serviceKey) {
    return json({ error: 'server not configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'missing auth' }, 401);

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: 'invalid auth' }, 401);
  const user = userData.user;

  let body: { lane_id?: number; starts_at?: string; ends_at?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  const { lane_id, starts_at, ends_at } = body;
  if (!lane_id || !starts_at || !ends_at) {
    return json({ error: 'lane_id, starts_at, ends_at required' }, 400);
  }

  const { data: lane, error: laneErr } = await supabase
    .from('lanes')
    .select('id, name, price_cents')
    .eq('id', lane_id)
    .single();
  if (laneErr || !lane) return json({ error: 'lane not found' }, 404);

  const amount = lane.price_cents;
  if (!Number.isInteger(amount) || amount < 50) {
    return json({ error: 'invalid price on lane' }, 500);
  }

  const form = new URLSearchParams();
  form.set('amount', String(amount));
  form.set('currency', 'usd');
  form.set('automatic_payment_methods[enabled]', 'true');
  form.set('metadata[user_id]', user.id);
  form.set('metadata[lane_id]', String(lane_id));
  form.set('metadata[starts_at]', starts_at);
  form.set('metadata[ends_at]', ends_at);

  const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const intent = await stripeRes.json();
  if (!stripeRes.ok) {
    return json({ error: intent?.error?.message ?? 'stripe error' }, 502);
  }

  return json({
    client_secret: intent.client_secret,
    payment_intent_id: intent.id,
    amount_cents: amount,
    lane_name: lane.name,
  });
});
