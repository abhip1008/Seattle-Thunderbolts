import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <BrandHeader size="sm" />

      <View style={styles.card}>
        <Text style={styles.label}>SIGNED IN AS</Text>
        <Text style={styles.email}>{session?.user.email ?? '—'}</Text>
      </View>

      <Pressable
        style={styles.button}
        onPress={async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        }}>
        <Text style={styles.buttonText}>SIGN OUT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24, backgroundColor: brand.bg },
  card: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 10,
    padding: 16,
  },
  label: { color: brand.textMuted, letterSpacing: 2, fontSize: 11, fontWeight: '700' },
  email: { fontSize: 16, fontWeight: '700', color: brand.text, marginTop: 6 },
  button: {
    backgroundColor: brand.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
});
