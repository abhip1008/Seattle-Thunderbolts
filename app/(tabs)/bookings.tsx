import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Booking, Lane } from '@/lib/types';

type BookingWithLane = Booking & { lane: Pick<Lane, 'name' | 'kind'> | null };

function fmt(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function BookingsScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<BookingWithLane[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, lane:lanes(name, kind)')
      .eq('user_id', session.user.id)
      .order('starts_at', { ascending: false });
    setItems((data as BookingWithLane[]) ?? []);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function cancel(id: string) {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) {
      Alert.alert('Could not cancel', error.message);
      return;
    }
    load();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: brand.textMuted, textAlign: 'center', paddingHorizontal: 32 }}>
          No bookings yet. Visit the Map tab to book a lane.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: brand.bg }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={items}
      keyExtractor={(b) => b.id}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      renderItem={({ item }) => {
        const past = new Date(item.ends_at).getTime() <= Date.now();
        const cancelled = item.status === 'cancelled';
        return (
          <View style={[styles.card, (past || cancelled) && { opacity: 0.55 }]}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.lane?.name ?? `Lane ${item.lane_id}`}</Text>
              {item.lane?.kind === 'bowling_machine' ? (
                <Text style={styles.kindBadge}>MACHINE</Text>
              ) : (
                <Text style={styles.kindBadge}>NET</Text>
              )}
            </View>
            <Text style={styles.when}>{fmt(item.starts_at)}</Text>
            {cancelled ? (
              <Text style={styles.tagCancel}>Cancelled</Text>
            ) : past ? (
              <Text style={styles.tagPast}>Completed</Text>
            ) : (
              <Pressable
                onPress={() =>
                  Alert.alert('Cancel booking?', '', [
                    { text: 'Keep', style: 'cancel' },
                    {
                      text: 'Cancel booking',
                      style: 'destructive',
                      onPress: () => cancel(item.id),
                    },
                  ])
                }
                style={styles.cancelBtn}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </Pressable>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brand.bg,
    padding: 24,
  },
  card: {
    padding: 14,
    backgroundColor: brand.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', color: brand.text, flex: 1 },
  kindBadge: {
    color: brand.accent,
    backgroundColor: brand.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    overflow: 'hidden',
  },
  when: { color: brand.accent, marginTop: 6, fontWeight: '600' },
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
  tagCancel: { color: brand.busy, marginTop: 8, fontWeight: '700' },
  tagPast: { color: brand.textMuted, marginTop: 8 },
});
