import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

type CheckoutScreenRouteProp = RouteProp<RootStackParamList, 'Checkout'>;

export default function CheckoutScreen() {
  const route = useRoute<CheckoutScreenRouteProp>();
  const { restaurantId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout Screen</Text>
      <Text style={styles.subtitle}>Restaurant ID: {restaurantId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
