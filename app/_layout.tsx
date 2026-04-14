import { DarkTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { brand } from '@/constants/brand';
import { AuthProvider } from '@/lib/auth';

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: brand.bg,
    card: brand.bg,
    text: brand.text,
    border: brand.border,
    primary: brand.accent,
    notification: brand.accent,
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={navTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: brand.bg },
            headerTintColor: brand.text,
            headerTitleStyle: { color: brand.text, fontWeight: '700' },
            contentStyle: { backgroundColor: brand.bg },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="lane/[id]" options={{ title: 'Book Lane' }} />
          <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
