import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { brand } from '@/constants/brand';
import { formatUsd } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';

type Section = {
  key: 'store' | 'community';
  title: string;
  subtitle: string;
  items: Listing[];
};

export default function MarketplaceScreen() {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Listing[]>([]);
  const [community, setCommunity] = useState<Listing[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    const rows = (data as Listing[]) ?? [];
    setStore(rows.filter((r) => r.seller_type === 'store'));
    setCommunity(rows.filter((r) => r.seller_type === 'community'));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  const sections: Section[] = [
    {
      key: 'store',
      title: 'THUNDERBOLTS STORE',
      subtitle: 'Official club gear. Ships from the facility.',
      items: store,
    },
    {
      key: 'community',
      title: 'COMMUNITY',
      subtitle: 'Gear from fellow members. Arrange pickup directly.',
      items: community,
    },
  ];

  return (
    <FlatList
      style={{ backgroundColor: brand.bg }}
      contentContainerStyle={styles.container}
      data={sections}
      keyExtractor={(s) => s.key}
      ListHeaderComponent={
        <View style={{ gap: 6, marginBottom: 6 }}>
          <BrandHeader size="sm" />
          <View style={styles.topRow}>
            <Text style={styles.pageTitle}>MARKETPLACE</Text>
            <Pressable style={styles.sellBtn} onPress={() => router.push('/listing/new')}>
              <Text style={styles.sellText}>+ SELL</Text>
            </Pressable>
          </View>
        </View>
      }
      renderItem={({ item: section }) => (
        <View style={{ gap: 10, marginTop: 14 }}>
          <View style={styles.sectionHeader}>
            {section.key === 'store' ? (
              <View style={styles.badgeStore}>
                <Text style={styles.badgeStoreText}>OFFICIAL</Text>
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <Text style={styles.sectionSub}>{section.subtitle}</Text>
          {section.items.length === 0 ? (
            <Text style={styles.empty}>
              {section.key === 'community'
                ? 'No community listings yet. Be the first to sell!'
                : 'Store is being restocked.'}
            </Text>
          ) : (
            section.items.map((item) => (
              <ListingRow key={item.id} listing={item} />
            ))
          )}
        </View>
      )}
    />
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/listing/${listing.id}`)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{listing.title}</Text>
        <Text style={styles.cardSub}>
          {listing.category ?? 'misc'}
          {listing.condition ? ` · ${listing.condition.replace('_', ' ')}` : ''}
        </Text>
      </View>
      <Text style={styles.price}>{formatUsd(listing.price_cents)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 6, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: brand.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: {
    color: brand.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  sellBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: brand.accent,
  },
  sellText: { color: brand.accent, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: {
    color: brand.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  sectionSub: { color: brand.textMuted, fontSize: 12 },
  badgeStore: {
    backgroundColor: brand.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeStoreText: { color: 'white', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 10,
    gap: 10,
  },
  cardTitle: { color: brand.text, fontWeight: '700', fontSize: 15 },
  cardSub: { color: brand.textMuted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  price: { color: brand.accent, fontWeight: '800', fontSize: 16 },
  empty: {
    color: brand.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
