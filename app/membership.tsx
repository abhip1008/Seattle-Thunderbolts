import { useStripe } from '@stripe/stripe-react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { createMembershipIntent, formatUsd } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import type { Membership, MembershipTier } from '@/lib/types';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function MembershipScreen() {
  const { session } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [active, setActive] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingTier, setWorkingTier] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    const [{ data: tierRows }, { data: memRows }] = await Promise.all([
      supabase.from('membership_tiers').select('*').order('sort_order'),
      session
        ? supabase
            .from('memberships')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .gt('valid_until', nowIso)
            .order('valid_until', { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setTiers((tierRows as MembershipTier[]) ?? []);
    setActive(((memRows as Membership[]) ?? [])[0] ?? null);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function subscribe(tier: MembershipTier) {
    if (!session) {
      Alert.alert('Sign in required');
      return;
    }
    setWorkingTier(tier.id);
    try {
      const intent = await createMembershipIntent({ tier_id: tier.id });

      const init = await initPaymentSheet({
        merchantDisplayName: 'Seattle Thunderbolts',
        paymentIntentClientSecret: intent.client_secret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: { email: session.user.email ?? undefined },
      });
      if (init.error) throw new Error(init.error.message);

      const result = await presentPaymentSheet();
      if (result.error) {
        if (result.error.code !== 'Canceled') {
          Alert.alert('Payment failed', result.error.message);
        }
        return;
      }

      const now = new Date();
      const validUntil = new Date(
        now.getTime() + intent.period_days * 24 * 60 * 60 * 1000
      );
      const { error } = await supabase.from('memberships').insert({
        user_id: session.user.id,
        tier_id: intent.tier_id,
        status: 'active',
        valid_from: now.toISOString(),
        valid_until: validUntil.toISOString(),
        amount_cents: intent.amount_cents,
        payment_intent_id: intent.payment_intent_id,
      });
      if (error) {
        Alert.alert(
          'Payment succeeded but membership failed',
          `${error.message}\n\nContact us with payment id ${intent.payment_intent_id}.`
        );
        return;
      }

      Alert.alert(
        'Welcome aboard',
        `${intent.tier_name} membership is active until ${fmtDate(validUntil.toISOString())}.`
      );
      load();
    } catch (e: any) {
      Alert.alert('Could not start membership', e?.message ?? 'Unknown error');
    } finally {
      setWorkingTier(null);
    }
  }

  async function cancel() {
    if (!active) return;
    Alert.alert(
      'Cancel membership?',
      'Your access stays until the end of the current period. We do not refund partial periods.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel membership',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('memberships')
              .update({ status: 'cancelled' })
              .eq('id', active.id);
            if (error) {
              Alert.alert('Could not cancel', error.message);
              return;
            }
            load();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  const activeTier = active ? tiers.find((t) => t.id === active.tier_id) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>MEMBERSHIP</Text>

      {active && activeTier ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>CURRENT PLAN</Text>
          <Text style={styles.activeTier}>{activeTier.name}</Text>
          <Text style={styles.activeMeta}>
            Valid until {fmtDate(active.valid_until)}
          </Text>
          <Pressable onPress={cancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>CANCEL MEMBERSHIP</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.sub}>
          Choose a tier to unlock member perks. Pay once for a 30-day period.
        </Text>
      )}

      <Text style={styles.h2}>{active ? 'CHANGE TIER' : 'AVAILABLE TIERS'}</Text>
      {tiers.map((tier) => {
        const isCurrent = active?.tier_id === tier.id;
        const isWorking = workingTier === tier.id;
        return (
          <View key={tier.id} style={styles.tierCard}>
            <View style={styles.tierHead}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierPrice}>
                {formatUsd(tier.price_cents)}
                <Text style={styles.tierPeriod}> / {tier.period_days} days</Text>
              </Text>
            </View>
            {tier.perks.map((perk) => (
              <Text key={perk} style={styles.perk}>
                • {perk}
              </Text>
            ))}
            <Pressable
              disabled={isCurrent || isWorking}
              style={[
                styles.joinBtn,
                (isCurrent || isWorking) && styles.joinBtnDisabled,
              ]}
              onPress={() => subscribe(tier)}>
              {isWorking ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.joinText}>
                  {isCurrent ? 'CURRENT' : 'JOIN'}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: brand.bg, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: brand.bg },
  h1: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    color: brand.text,
  },
  h2: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: brand.textMuted,
    marginTop: 8,
  },
  sub: { color: brand.textMuted },
  activeCard: {
    padding: 16,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.accent,
    borderRadius: 12,
    gap: 4,
  },
  activeLabel: {
    color: brand.accent,
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 11,
  },
  activeTier: { color: brand.text, fontSize: 22, fontWeight: '800' },
  activeMeta: { color: brand.textMuted, marginTop: 2 },
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: brand.busy,
  },
  cancelText: { color: brand.busy, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
  tierCard: {
    padding: 16,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 12,
    gap: 6,
  },
  tierHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tierName: { color: brand.text, fontSize: 18, fontWeight: '800' },
  tierPrice: { color: brand.accent, fontSize: 16, fontWeight: '800' },
  tierPeriod: { color: brand.textMuted, fontSize: 12, fontWeight: '600' },
  perk: { color: brand.textMuted, fontSize: 13 },
  joinBtn: {
    marginTop: 10,
    backgroundColor: brand.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinBtnDisabled: { backgroundColor: brand.surfaceAlt },
  joinText: { color: 'white', fontWeight: '800', letterSpacing: 2, fontSize: 13 },
});
