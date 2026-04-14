import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/lib/auth';

export default function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: brand.bg }}>
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  return session ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/sign-in" />;
}
