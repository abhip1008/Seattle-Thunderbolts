import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { formatUsd } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('listings').select('*').eq('id', id).single();
    setListing((data as Listing) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function markSold() {
    if (!listing) return;
    const { error } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', listing.id);
    if (error) return Alert.alert('Could not update', error.message);
    router.back();
  }

  async function remove() {
    if (!listing) return;
    Alert.alert('Remove listing?', '', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('listings')
            .update({ status: 'removed' })
            .eq('id', listing.id);
          if (error) return Alert.alert('Could not remove', error.message);
          router.back();
        },
      },
    ]);
  }

  function contact() {
    if (!listing?.contact) return;
    const raw = listing.contact.trim();
    const url = raw.includes('@') ? `mailto:${raw}` : `tel:${raw.replace(/[^0-9+]/g, '')}`;
    Linking.openURL(url);
  }

  if (loading || !listing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  const isMine = listing.seller_id && session?.user.id === listing.seller_id;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>{formatUsd(listing.price_cents)}</Text>
        <Text style={styles.meta}>
          {listing.seller_type === 'store' ? 'Thunderbolts Store' : 'Community seller'}
          {listing.category ? ` · ${listing.category}` : ''}
          {listing.condition ? ` · ${listing.condition.replace('_', ' ')}` : ''}
        </Text>
      </View>

      {listing.description ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>DESCRIPTION</Text>
          <Text style={styles.body}>{listing.description}</Text>
        </View>
      ) : null}

      {listing.contact ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>CONTACT</Text>
          <Text style={styles.body}>{listing.contact}</Text>
          <Pressable style={styles.primaryBtn} onPress={contact}>
            <Text style={styles.primaryText}>CONTACT SELLER</Text>
          </Pressable>
        </View>
      ) : null}

      {isMine ? (
        <View style={styles.row}>
          <Pressable style={styles.secondaryBtn} onPress={markSold}>
            <Text style={styles.secondaryText}>MARK SOLD</Text>
          </Pressable>
          <Pressable style={styles.dangerBtn} onPress={remove}>
            <Text style={styles.dangerText}>REMOVE</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: brand.bg, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: brand.bg },
  headerCard: {
    padding: 16,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 12,
    gap: 4,
  },
  title: { color: brand.text, fontSize: 22, fontWeight: '800' },
  price: { color: brand.accent, fontSize: 20, fontWeight: '800', marginTop: 4 },
  meta: { color: brand.textMuted, marginTop: 4, textTransform: 'capitalize' },
  card: {
    padding: 14,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 10,
    gap: 8,
  },
  sectionLabel: {
    color: brand.textMuted,
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: '800',
  },
  body: { color: brand.text, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: brand.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryText: { color: 'white', fontWeight: '800', letterSpacing: 2, fontSize: 13 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.accent,
    alignItems: 'center',
  },
  secondaryText: { color: brand.accent, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
  dangerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.busy,
    alignItems: 'center',
  },
  dangerText: { color: brand.busy, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
});
