import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

type RestaurantScreenRouteProp = RouteProp<RootStackParamList, 'Restaurant'>;

export default function RestaurantScreen() {
  const route = useRoute<RestaurantScreenRouteProp>();
  const { restaurantId } = route.params;
  
  const restaurant = {
    id: restaurantId,
    name: "Sample Restaurant",
    isOpen: true
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{restaurant.name}</Text>
      <Text style={styles.subtitle}>
        Status: <Text style={restaurant.isOpen ? styles.success : styles.error}>
          {restaurant.isOpen ? 'Open' : 'Closed'}
        </Text>
      </Text>
      <Text style={styles.id}>ID: {restaurant.id}</Text>
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
    marginBottom: 10,
  },
  id: {
    fontSize: 14,
    color: '#666',
  },
  success: {
    color: '#28A745',
  },
  error: {
    color: '#DC3545',
  },
});