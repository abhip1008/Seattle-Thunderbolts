import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

// Offset added to lanes 5–8 so there is a visible aisle between the left
// (1–4) and right (5–8) columns.
const RIGHT_COL_OFFSET = 5;

// Lanes 5 and 6 are Australian turf; highlight the top of those bars.
const AUS_TURF_COLOR = '#C9A87C';

// Lanes 2 and 3 get a dark-blue section on the top of the bar.
const LANE_23_COLOR = '#1E3A8A';

import { BrandHeader } from '@/components/brand-header';
import { brand } from '@/constants/brand';
import { supabase } from '@/lib/supabase';
import type { Lane } from '@/lib/types';

const MAP_W = 100;
const MAP_H = 100;

export default function MapScreen() {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [busyLaneIds, setBusyLaneIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const now = new Date().toISOString();
        const [{ data: laneRows }, { data: bookingRows }] = await Promise.all([
          supabase.from('lanes').select('*').order('id'),
          supabase
            .from('bookings')
            .select('lane_id, starts_at, ends_at, status')
            .eq('status', 'confirmed')
            .lte('starts_at', now)
            .gte('ends_at', now),
        ]);
        if (cancelled) return;
        setLanes((laneRows as Lane[]) ?? []);
        setBusyLaneIds(new Set((bookingRows ?? []).map((b: any) => b.lane_id)));
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

  const leftLanes = lanes.filter((l) => l.id <= 4);
  const rightLanes = lanes.filter((l) => l.id >= 5);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ marginBottom: 8 }}>
        <BrandHeader size="sm" />
      </View>

      <Text style={styles.heading}>FACILITY MAP</Text>
      <Text style={styles.sub}>Tap a lane to book.</Text>

      <View style={styles.mapWrap}>
        <Svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" height={300}>
          <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={brand.surface} />

          {/* Aisle divider (wider after the extra gap). */}
          <Line
            x1={50 + RIGHT_COL_OFFSET / 2}
            y1={22}
            x2={50 + RIGHT_COL_OFFSET / 2}
            y2={78}
            stroke={brand.border}
            strokeWidth={0.6}
            strokeDasharray="2,2"
          />

          {/* Lane rectangles */}
          {lanes.map((lane) => {
            const busy = busyLaneIds.has(lane.id);
            const fill = busy ? brand.busy : brand.available;
            const x = lane.id >= 5 ? lane.layout_x + RIGHT_COL_OFFSET : lane.layout_x;
            const isAusTurf = lane.id === 5 || lane.id === 6;
            const isLane23 = lane.id === 2 || lane.id === 3;
            // Surface strip sits just below the lane-number label and
            // covers the top quarter of the bar.
            const stripY = lane.layout_y + 9;
            const stripH = lane.layout_h / 4;
            const stripColor = isAusTurf
              ? AUS_TURF_COLOR
              : isLane23
                ? LANE_23_COLOR
                : null;
            return (
              <React.Fragment key={lane.id}>
                <Rect
                  x={x}
                  y={lane.layout_y}
                  width={lane.layout_w}
                  height={lane.layout_h}
                  rx={1.5}
                  fill={fill}
                  opacity={0.9}
                  stroke={brand.border}
                  strokeWidth={0.4}
                  onPress={() => router.push(`/lane/${lane.id}`)}
                />
                {stripColor ? (
                  <Rect
                    x={x}
                    y={stripY}
                    width={lane.layout_w}
                    height={stripH}
                    fill={stripColor}
                    opacity={0.95}
                    onPress={() => router.push(`/lane/${lane.id}`)}
                  />
                ) : null}
              </React.Fragment>
            );
          })}

          {/* Lane number labels */}
          {lanes.map((lane) => {
            const x = lane.id >= 5 ? lane.layout_x + RIGHT_COL_OFFSET : lane.layout_x;
            return (
              <SvgText
                key={`num-${lane.id}`}
                x={x + lane.layout_w / 2}
                y={lane.layout_y + 6}
                fontSize={4.5}
                fontWeight="bold"
                fill="white"
                textAnchor="middle">
                {lane.id}
              </SvgText>
            );
          })}

          {/* Type badge: M = bowling machine, N = net */}
          {lanes.map((lane) => {
            const x = lane.id >= 5 ? lane.layout_x + RIGHT_COL_OFFSET : lane.layout_x;
            return (
              <SvgText
                key={`tag-${lane.id}`}
                x={x + lane.layout_w / 2}
                y={lane.layout_y + lane.layout_h - 2}
                fontSize={3.2}
                fontWeight="bold"
                fill="white"
                opacity={0.85}
                textAnchor="middle">
                {lane.kind === 'bowling_machine' ? 'M' : 'NET'}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: brand.available }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: brand.busy }]} />
          <Text style={styles.legendText}>In use</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendBadge}>M</Text>
          <Text style={styles.legendText}>Bowling machine</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendBadge}>NET</Text>
          <Text style={styles.legendText}>Regular net</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: AUS_TURF_COLOR }]} />
          <Text style={styles.legendText}>Australian turf (5 & 6)</Text>
        </View>
      </View>

      <Text style={styles.heading}>LEFT SIDE</Text>
      {leftLanes.map((lane) => (
        <LaneRow key={lane.id} lane={lane} busy={busyLaneIds.has(lane.id)} />
      ))}

      <Text style={styles.heading}>RIGHT SIDE</Text>
      {rightLanes.map((lane) => (
        <LaneRow key={lane.id} lane={lane} busy={busyLaneIds.has(lane.id)} />
      ))}
    </ScrollView>
  );
}

function LaneRow({ lane, busy }: { lane: Lane; busy: boolean }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{lane.name}</Text>
        <Text style={styles.rowSub}>
          {lane.kind === 'bowling_machine' ? 'Bowling machine' : 'Net'}
          {lane.surface ? ` · ${lane.surface}` : ''}
        </Text>
      </View>
      <Text
        style={{
          color: busy ? brand.busy : brand.available,
          fontWeight: '700',
          letterSpacing: 1,
        }}
        onPress={() => router.push(`/lane/${lane.id}`)}>
        {busy ? 'IN USE' : 'OPEN'} ›
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: brand.bg, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: brand.bg },
  heading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    color: brand.text,
    marginTop: 8,
  },
  sub: { color: brand.textMuted },
  mapWrap: {
    backgroundColor: brand.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: brand.border,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  colLabel: {
    color: brand.accent,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { color: brand.textMuted, fontSize: 12 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  legendBadge: {
    color: 'white',
    backgroundColor: brand.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: brand.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.border,
    alignItems: 'center',
  },
  rowTitle: { fontWeight: '700', fontSize: 16, color: brand.text },
  rowSub: { color: brand.textMuted, marginTop: 2, fontSize: 12 },
});
