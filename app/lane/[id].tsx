import DateTimePicker from '@react-native-community/datetimepicker';
import { useStripe } from '@stripe/stripe-react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { createPaymentIntent, formatUsd } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import type { Booking, Lane } from '@/lib/types';

const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;
const SLOT_MINUTES = 60;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildSlots(date: Date) {
  const slots: { start: Date; end: Date }[] = [];
  const base = startOfDay(date);
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    const start = new Date(base);
    start.setHours(h, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + SLOT_MINUTES);
    slots.push({ start, end });
  }
  return slots;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function LaneBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const laneId = Number(id);
  const navigation = useNavigation();
  const { session } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [lane, setLane] = useState<Lane | null>(null);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const slots = useMemo(() => buildSlots(date), [date]);

  const load = useCallback(async () => {
    setLoading(true);
    const dayStart = startOfDay(date).toISOString();
    const dayEnd = new Date(startOfDay(date).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const [{ data: laneRow }, { data: bookingRows }] = await Promise.all([
      supabase.from('lanes').select('*').eq('id', laneId).single(),
      supabase
        .from('bookings')
        .select('*')
        .eq('lane_id', laneId)
        .eq('status', 'confirmed')
        .gte('starts_at', dayStart)
        .lt('starts_at', dayEnd),
    ]);
    setLane((laneRow as Lane) ?? null);
    setBookings((bookingRows as Booking[]) ?? []);
    setLoading(false);
  }, [laneId, date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (lane) navigation.setOptions({ title: lane.name });
  }, [lane, navigation]);

  function isBooked(start: Date, end: Date) {
    return bookings.some((b) => {
      const bs = new Date(b.starts_at).getTime();
      const be = new Date(b.ends_at).getTime();
      return bs < end.getTime() && be > start.getTime();
    });
  }

  async function book(start: Date, end: Date) {
    if (!session) {
      Alert.alert('Sign in required');
      return;
    }
    setSubmitting(true);
    try {
      const intent = await createPaymentIntent({
        lane_id: laneId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      });

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

      const { error } = await supabase.from('bookings').insert({
        user_id: session.user.id,
        lane_id: laneId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        amount_cents: intent.amount_cents,
        payment_intent_id: intent.payment_intent_id,
        payment_status: 'paid',
      });
      if (error) {
        Alert.alert(
          'Payment succeeded but booking failed',
          `${error.message}\n\nContact us with payment id ${intent.payment_intent_id} and we will sort it out.`
        );
        return;
      }

      Alert.alert(
        'Booked',
        `${lane?.name} at ${fmtTime(start)} · ${formatUsd(intent.amount_cents)}`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/bookings') }]
      );
    } catch (e: any) {
      Alert.alert('Could not book', e?.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !lane) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.row}>
          <Text style={styles.title}>{lane.name}</Text>
          <Text style={styles.kindBadge}>
            {lane.kind === 'bowling_machine' ? 'BOWLING MACHINE' : 'NET'}
          </Text>
        </View>
        <Text style={styles.sub}>
          {lane.id <= 4 ? 'Left side' : 'Right side'}
          {lane.surface ? ` · ${lane.surface}` : ''}
        </Text>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.label}>DATE</Text>
        {Platform.OS === 'android' ? (
          <Pressable onPress={() => setShowPicker(true)} style={styles.dateBtn}>
            <Text style={{ color: brand.text }}>{date.toDateString()}</Text>
          </Pressable>
        ) : null}
        {showPicker ? (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            themeVariant="dark"
            onChange={(_, d) => {
              if (Platform.OS === 'android') setShowPicker(false);
              if (d) setDate(d);
            }}
          />
        ) : null}
      </View>

      <Text style={styles.label}>AVAILABLE SLOTS</Text>
      <View style={styles.grid}>
        {slots.map(({ start, end }) => {
          const taken = isBooked(start, end);
          const past = end.getTime() <= Date.now();
          const disabled = taken || past;
          return (
            <Pressable
              key={start.toISOString()}
              disabled={disabled || submitting}
              onPress={() =>
                Alert.alert(
                  'Confirm booking',
                  `${lane.name} · ${fmtTime(start)} – ${fmtTime(end)}\n${formatUsd(lane.price_cents)}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Pay & book', onPress: () => book(start, end) },
                  ]
                )
              }
              style={[styles.slot, disabled ? styles.slotDisabled : styles.slotOpen]}>
              <Text style={[styles.slotText, disabled && { color: brand.textMuted }]}>
                {fmtTime(start)}
              </Text>
              {taken ? <Text style={styles.slotTag}>booked</Text> : null}
            </Pressable>
          );
        })}
      </View>
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
    gap: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: brand.text, flex: 1 },
  kindBadge: {
    color: 'white',
    backgroundColor: brand.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    overflow: 'hidden',
  },
  sub: { color: brand.textMuted },
  label: {
    color: brand.text,
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 12,
    marginTop: 4,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBtn: {
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
    padding: 10,
    borderRadius: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  slotOpen: { backgroundColor: brand.surface, borderColor: brand.accent },
  slotDisabled: { backgroundColor: brand.surface, borderColor: brand.border, opacity: 0.5 },
  slotText: { fontWeight: '700', color: brand.text },
  slotTag: { fontSize: 11, color: brand.textMuted, marginTop: 2 },
});
