import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function HomeScreen() {
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