import { StyleSheet, Text, View } from 'react-native';

import { brand } from '@/constants/brand';

type Props = {
  size?: 'sm' | 'lg';
  tagline?: boolean;
};

export function BrandHeader({ size = 'lg', tagline = false }: Props) {
  const isLg = size === 'lg';
  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, isLg ? styles.barLg : styles.barSm]} />
      <Text style={[styles.title, isLg ? styles.titleLg : styles.titleSm]}>
        T H U N D E R B O L T S
      </Text>
      <Text style={styles.sub}>CRICKET ACADEMY</Text>
      {tagline ? <Text style={styles.tagline}>DELIVERING THE FUTURE</Text> : null}
      <View style={[styles.bar, isLg ? styles.barLg : styles.barSm]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  bar: {
    backgroundColor: brand.accent,
    borderRadius: 2,
  },
  barLg: { height: 4, width: 220 },
  barSm: { height: 2, width: 120 },
  title: {
    color: brand.text,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  titleLg: { fontSize: 22 },
  titleSm: { fontSize: 14 },
  sub: {
    color: brand.textMuted,
    fontWeight: '600',
    letterSpacing: 4,
    fontSize: 11,
  },
  tagline: {
    color: brand.text,
    fontWeight: '700',
    letterSpacing: 3,
    fontSize: 14,
    marginTop: 6,
  },
});
