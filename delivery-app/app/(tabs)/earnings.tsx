
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EarningsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Earnings</Text>
      <Text style={styles.amount}>₹0</Text>
      <Text style={styles.subtitle}>Today's earnings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
