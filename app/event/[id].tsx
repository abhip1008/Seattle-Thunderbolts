import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { supabase } from '@/lib/supabase';
import type { EventItem } from '@/lib/types';

function fmtDateRange(start: string, end: string | null) {
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  if (!end) return s.toLocaleString([], opts);
  const e = new Date(end);
  return `${s.toLocaleString([], opts)} – ${e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('events').select('*').eq('id', id).single();
      setEvent((data as EventItem) ?? null);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (event) navigation.setOptions({ title: event.title });
  }, [event, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }
  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={{ color: brand.textMuted }}>Event not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.accentBar} />
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.when}>{fmtDateRange(event.starts_at, event.ends_at)}</Text>
      {event.location ? <Text style={styles.where}>📍 {event.location}</Text> : null}
      {event.description ? <Text style={styles.body}>{event.description}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: brand.bg },
  container: { padding: 20, gap: 8, backgroundColor: brand.bg, flexGrow: 1 },
  accentBar: { height: 4, width: 60, backgroundColor: brand.accent, borderRadius: 2, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: brand.text },
  when: { color: brand.accent, fontWeight: '700', marginTop: 4 },
  where: { color: brand.textMuted, marginTop: 2 },
  body: { marginTop: 16, fontSize: 15, lineHeight: 22, color: brand.text },
});
