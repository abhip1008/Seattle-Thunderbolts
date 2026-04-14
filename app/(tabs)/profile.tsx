import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Membership, MembershipTier } from '@/lib/types';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [active, setActive] = useState<Membership | null>(null);
  const [tier, setTier] = useState<MembershipTier | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setActive(null);
      setTier(null);
      return;
    }
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from('memberships')
      .select('*, tier:membership_tiers(id, name, price_cents, period_days, perks, sort_order)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .gt('valid_until', nowIso)
      .order('valid_until', { ascending: false })
      .limit(1);
    const row = (data as (Membership & { tier: MembershipTier | null })[] | null)?.[0];
    setActive(row ?? null);
    setTier(row?.tier ?? null);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BrandHeader size="sm" />

      <View style={styles.card}>
        <Text style={styles.label}>SIGNED IN AS</Text>
        <Text style={styles.email}>{session?.user.email ?? '—'}</Text>
      </View>

      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>MEMBERSHIP</Text>
      </View>

      <View style={active ? styles.membershipActive : styles.card}>
        {active && tier ? (
          <>
            <Text style={styles.membershipTier}>{tier.name}</Text>
            <Text style={styles.membershipMeta}>
              Active · renews {fmtDate(active.valid_until)}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.membershipTier}>No active membership</Text>
            <Text style={styles.membershipMeta}>Join to unlock member perks.</Text>
          </>
        )}
        <Pressable
          style={styles.manageBtn}
          onPress={() => router.push('/membership')}>
          <Text style={styles.manageText}>
            {active ? 'MANAGE MEMBERSHIP' : 'VIEW PLANS'}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.signOutBtn}
        onPress={async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        }}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 18, backgroundColor: brand.bg, flexGrow: 1 },
  card: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 10,
    padding: 16,
  },
  membershipActive: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.accent,
    borderRadius: 10,
    padding: 16,
  },
  label: { color: brand.textMuted, letterSpacing: 2, fontSize: 11, fontWeight: '700' },
  email: { fontSize: 16, fontWeight: '700', color: brand.text, marginTop: 6 },
  sectionLabelRow: { marginTop: 4 },
  sectionLabel: {
    color: brand.textMuted,
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: '800',
  },
  membershipTier: { color: brand.text, fontSize: 18, fontWeight: '800' },
  membershipMeta: { color: brand.textMuted, marginTop: 4, fontSize: 13 },
  manageBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: brand.accent,
  },
  manageText: { color: brand.accent, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
  signOutBtn: {
    marginTop: 10,
    backgroundColor: brand.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutText: { color: 'white', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
});
