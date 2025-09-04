import { Redirect } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, ScrollView } from 'react-native';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Auth check error:', error);
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading Makubang...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Text style={styles.description}>Please try restarting the app</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // If authenticated, redirect to the main app content. Otherwise, redirect to login.
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/feed" />;
  } else {
    return <Redirect href="/login" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B35',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  header: {
    padding: 20,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  features: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  feature: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});