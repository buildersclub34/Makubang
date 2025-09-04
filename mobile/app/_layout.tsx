import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/contexts/AuthContext';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#0D0D0D',
              },
              headerTintColor: '#00D4FF',
              headerTitleStyle: {
                fontWeight: '800',
                fontSize: 18,
              },
              contentStyle: {
                backgroundColor: '#0D0D0D',
              },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: 'Login' }} />
            <Stack.Screen name="register" options={{ title: 'Sign Up' }} />
          </Stack>
          <StatusBar style="light" backgroundColor="#0D0D0D" />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}