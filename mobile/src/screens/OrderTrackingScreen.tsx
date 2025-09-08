import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useWebSocket } from '../contexts/WebSocketContext';

type OrderTrackingScreenRouteProp = RouteProp<RootStackParamList, 'OrderTracking'>;

export default function OrderTrackingScreen() {
  const route = useRoute<OrderTrackingScreenRouteProp>();
  const { orderId } = route.params;
  const { socket } = useWebSocket();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Tracking</Text>
      <Text style={styles.subtitle}>Tracking order: {orderId}</Text>
      <Text style={styles.status}>
        Socket status: {socket ? 'Connected' : 'Disconnected'}
      </Text>
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
    marginBottom: 20,
  },
  status: {
    fontSize: 14,
    color: '#333',
    marginTop: 20,
  },
});