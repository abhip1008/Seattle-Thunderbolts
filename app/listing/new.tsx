import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const CATEGORIES = ['bats', 'balls', 'protective', 'apparel', 'shoes', 'bags', 'other'];
const CONDITIONS: ('new' | 'like_new' | 'good' | 'used')[] = [
  'new',
  'like_new',
  'good',
  'used',
];

export default function NewListing() {
  const { session } = useAuth();

  const [title, setTitle] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('bats');
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>('good');
  const [contact, setContact] = useState(session?.user.email ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!session) {
      Alert.alert('Sign in required');
      return;
    }
    const cleanTitle = title.trim();
    const priceNum = Number(priceUsd);
    if (!cleanTitle) return Alert.alert('Title is required');
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return Alert.alert('Enter a valid price');
    }
    if (!contact.trim()) return Alert.alert('Contact info is required');

    setSubmitting(true);
    const { error } = await supabase.from('listings').insert({
      seller_type: 'community',
      seller_id: session.user.id,
      title: cleanTitle,
      description: description.trim() || null,
      category,
      price_cents: Math.round(priceNum * 100),
      condition,
      contact: contact.trim(),
    });
    setSubmitting(false);
    if (error) return Alert.alert('Could not list', error.message);
    router.replace('/(tabs)/marketplace');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: brand.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>LIST AN ITEM</Text>

        <Text style={styles.label}>TITLE</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="SS Ton bat — gently used"
          placeholderTextColor={brand.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>PRICE (USD)</Text>
        <TextInput
          value={priceUsd}
          onChangeText={setPriceUsd}
          placeholder="60"
          placeholderTextColor={brand.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>CONDITION</Text>
        <View style={styles.chips}>
          {CONDITIONS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCondition(c)}
              style={[styles.chip, condition === c && styles.chipActive]}>
              <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>
                {c.replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Age, condition notes, size, etc."
          placeholderTextColor={brand.textMuted}
          multiline
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
        />

        <Text style={styles.label}>CONTACT (EMAIL OR PHONE)</Text>
        <TextInput
          value={contact}
          onChangeText={setContact}
          placeholder="you@example.com"
          placeholderTextColor={brand.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Pressable
          disabled={submitting}
          onPress={submit}
          style={[styles.submit, submitting && { opacity: 0.6 }]}>
          <Text style={styles.submitText}>{submitting ? 'POSTING…' : 'POST LISTING'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, flexGrow: 1 },
  h1: { color: brand.text, fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  label: {
    color: brand.textMuted,
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  input: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: brand.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  chipActive: { borderColor: brand.accent, backgroundColor: brand.surfaceAlt },
  chipText: { color: brand.textMuted, fontSize: 12, textTransform: 'capitalize' },
  chipTextActive: { color: brand.accent, fontWeight: '800' },
  submit: {
    marginTop: 10,
    backgroundColor: brand.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: { color: 'white', fontWeight: '800', fontSize: 14, letterSpacing: 2 },
});
