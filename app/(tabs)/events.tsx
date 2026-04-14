import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { supabase } from '@/lib/supabase';
import type { EventItem } from '@/lib/types';

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EventsScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const { data } = await supabase
          .from('events')
          .select('*')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at');
        if (cancelled) return;
        setEvents((data as EventItem[]) ?? []);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: brand.textMuted }}>No upcoming events.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: brand.bg }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={events}
      keyExtractor={(e) => e.id}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/event/${item.id}`)}>
          <View style={styles.accentBar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.when}>{fmtDate(item.starts_at)}</Text>
            {item.location ? <Text style={styles.where}>📍 {item.location}</Text> : null}
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brand.bg,
  },
  card: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: brand.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.border,
    gap: 12,
    alignItems: 'center',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: brand.accent,
    borderRadius: 2,
  },
  title: { fontSize: 16, fontWeight: '800', color: brand.text, letterSpacing: 0.5 },
  when: { color: brand.accent, marginTop: 4, fontWeight: '600' },
  where: { color: brand.textMuted, marginTop: 2 },
});
