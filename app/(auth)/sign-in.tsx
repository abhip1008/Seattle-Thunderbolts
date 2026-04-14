import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandHeader } from '@/components/brand-header';
import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      Alert.alert('Sign in failed', error);
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandWrap}>
        <BrandHeader tagline />
      </View>
      <TextInput
        placeholder="Email"
        placeholderTextColor={brand.textMuted}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={brand.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Pressable style={[styles.button, busy && { opacity: 0.6 }]} onPress={onSubmit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'SIGNING IN…' : 'SIGN IN'}</Text>
      </Pressable>
      <Link href="/(auth)/sign-up" style={styles.link}>
        Don't have an account? Sign up
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 14, backgroundColor: brand.bg },
  brandWrap: { marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
    color: brand.text,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: brand.accent,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontWeight: '800', fontSize: 15, letterSpacing: 2 },
  link: { textAlign: 'center', marginTop: 18, color: brand.textMuted },
});
