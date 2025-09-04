
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1A1A1A',
            },
            headerTintColor: '#4CAF50',
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 18,
            },
            contentStyle: {
              backgroundColor: '#1A1A1A',
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Partner Login' }} />
        </Stack>
        <StatusBar style="light" backgroundColor="#1A1A1A" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
