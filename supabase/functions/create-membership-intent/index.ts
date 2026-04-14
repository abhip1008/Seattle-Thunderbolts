// Supabase Edge Function: create-membership-intent
//
// Issues a Stripe PaymentIntent for a chosen membership tier. The tier's
// price is read server-side from membership_tiers so a malicious client
// can't pick its own price.
//
// Deploy:
//   supabase functions deploy create-membership-intent

// @ts-nocheck — runs on Deno inside Supabase Edge Runtime.

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

  let body: { tier_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  const { tier_id } = body;
  if (!tier_id) return json({ error: 'tier_id required' }, 400);

  const { data: tier, error: tierErr } = await supabase
    .from('membership_tiers')
    .select('id, name, price_cents, period_days')
    .eq('id', tier_id)
    .single();
  if (tierErr || !tier) return json({ error: 'tier not found' }, 404);

  const amount = tier.price_cents;
  if (!Number.isInteger(amount) || amount < 50) {
    return json({ error: 'invalid price on tier' }, 500);
  }

  const form = new URLSearchParams();
  form.set('amount', String(amount));
  form.set('currency', 'usd');
  form.set('automatic_payment_methods[enabled]', 'true');
  form.set('description', `Thunderbolts ${tier.name} membership`);
  form.set('metadata[user_id]', user.id);
  form.set('metadata[tier_id]', tier.id);
  form.set('metadata[period_days]', String(tier.period_days));

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
    tier_id: tier.id,
    tier_name: tier.name,
    period_days: tier.period_days,
  });
});
