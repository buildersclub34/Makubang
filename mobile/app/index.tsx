import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      try {
        // Add any initialization logic here
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
      } catch (err) {
        console.error('App initialization error:', err);
        setError('Failed to initialize app');
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

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
  return (
    <SafeAreaProvider>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🍕 Makubang</Text>
          <Text style={styles.subtitle}>Food meets social media</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welcome to Makubang!</Text>
          <Text style={styles.description}>
            Discover amazing food content from your favorite creators and order directly from restaurants.
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureEmoji}>📱</Text>
            <Text style={styles.featureTitle}>Social Food Content</Text>
            <Text style={styles.featureDesc}>Watch food videos from creators</Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureEmoji}>🍔</Text>
            <Text style={styles.featureTitle}>Order Food</Text>
            <Text style={styles.featureDesc}>Order directly from restaurants</Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureEmoji}>🚚</Text>
            <Text style={styles.featureTitle}>Live Tracking</Text>
            <Text style={styles.featureDesc}>Track your order in real-time</Text>
          </View>
        </View>

        <StatusBar style="auto" />
      </ScrollView>
    </SafeAreaProvider>
  );
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