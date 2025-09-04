
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { webSocketService } from '../services/websocket';

const { width, height } = Dimensions.get('window');

interface TrackingProps {
  orderId: string;
  restaurantLocation: {
    latitude: number;
    longitude: number;
    name: string;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

export default function MapTracking({ orderId, restaurantLocation, deliveryLocation }: TrackingProps) {
  const [userLocation, setUserLocation] = useState<any>(null);
  const [deliveryAgentLocation, setDeliveryAgentLocation] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState('preparing');
  const [estimatedTime, setEstimatedTime] = useState(30);

  useEffect(() => {
    getCurrentLocation();
    connectToOrderTracking();
    
    return () => {
      webSocketService.off('order:location:updated', handleLocationUpdate);
      webSocketService.off('order:status:updated', handleStatusUpdate);
    };
  }, [orderId]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const connectToOrderTracking = () => {
    // Subscribe to order updates
    webSocketService.send({
      type: 'order:subscribe',
      data: { orderId },
    });

    // Listen for location updates
    webSocketService.on('order:location:updated', handleLocationUpdate);
    
    // Listen for status updates
    webSocketService.on('order:status:updated', handleStatusUpdate);
  };

  const handleLocationUpdate = (data: any) => {
    if (data.orderId === orderId && data.position) {
      setDeliveryAgentLocation({
        latitude: data.position.latitude,
        longitude: data.position.longitude,
      });
      
      // Calculate estimated time based on distance
      if (userLocation) {
        const distance = calculateDistance(
          data.position,
          deliveryLocation
        );
        const estimatedMinutes = Math.ceil(distance * 2); // Rough estimate: 2 min per km
        setEstimatedTime(estimatedMinutes);
      }
    }
  };

  const handleStatusUpdate = (data: any) => {
    if (data.orderId === orderId) {
      setOrderStatus(data.status);
    }
  };

  const calculateDistance = (pos1: any, pos2: any) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getStatusColor = () => {
    switch (orderStatus) {
      case 'preparing': return '#FF9800';
      case 'ready': return '#2196F3';
      case 'picked_up': return '#9C27B0';
      case 'in_transit': return '#FF5722';
      case 'delivered': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getStatusText = () => {
    switch (orderStatus) {
      case 'preparing': return 'Restaurant is preparing your order';
      case 'ready': return 'Order is ready for pickup';
      case 'picked_up': return 'Order picked up by delivery partner';
      case 'in_transit': return 'Order is on the way';
      case 'delivered': return 'Order delivered!';
      default: return 'Order status unknown';
    }
  };

  const initialRegion = {
    latitude: userLocation?.latitude || restaurantLocation.latitude,
    longitude: userLocation?.longitude || restaurantLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Restaurant Marker */}
        <Marker
          coordinate={restaurantLocation}
          title={restaurantLocation.name}
          description="Restaurant"
          pinColor="#FF9800"
        />

        {/* Delivery Location Marker */}
        <Marker
          coordinate={deliveryLocation}
          title="Delivery Location"
          description={deliveryLocation.address}
          pinColor="#4CAF50"
        />

        {/* Delivery Agent Marker */}
        {deliveryAgentLocation && (
          <Marker
            coordinate={deliveryAgentLocation}
            title="Delivery Partner"
            description="Your order is with the delivery partner"
            pinColor="#2196F3"
          />
        )}

        {/* Route Polyline */}
        {deliveryAgentLocation && (
          <Polyline
            coordinates={[deliveryAgentLocation, deliveryLocation]}
            strokeColor="#2196F3"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Status Overlay */}
      <View style={styles.statusOverlay}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{orderStatus.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <Text style={styles.statusDescription}>{getStatusText()}</Text>
        {estimatedTime > 0 && orderStatus !== 'delivered' && (
          <Text style={styles.estimatedTime}>
            Estimated delivery: {estimatedTime} minutes
          </Text>
        )}
      </View>

      {/* Order Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={[
            styles.progressDot, 
            { backgroundColor: ['preparing', 'ready', 'picked_up', 'in_transit', 'delivered'].includes(orderStatus) ? '#4CAF50' : '#E0E0E0' }
          ]} />
          <Text style={styles.progressLabel}>Preparing</Text>
        </View>
        
        <View style={[
          styles.progressLine,
          { backgroundColor: ['ready', 'picked_up', 'in_transit', 'delivered'].includes(orderStatus) ? '#4CAF50' : '#E0E0E0' }
        ]} />
        
        <View style={styles.progressStep}>
          <View style={[
            styles.progressDot, 
            { backgroundColor: ['ready', 'picked_up', 'in_transit', 'delivered'].includes(orderStatus) ? '#4CAF50' : '#E0E0E0' }
          ]} />
          <Text style={styles.progressLabel}>Ready</Text>
        </View>
        
        <View style={[
          styles.progressLine,
          { backgroundColor: ['picked_up', 'in_transit', 'delivered'].includes(orderStatus) ? '#4CAF50' : '#E0E0E0' }
        ]} />
        
        <View style={styles.progressStep}>
          <View style={[
            styles.progressDot, 
            { backgroundColor: ['picked_up', 'in_transit', 'delivered'].includes(orderStatus) ? '#4CAF50' : '#E0E0E0' }
          ]} />
          <Text style={styles.progressLabel}>Picked Up</Text>
        </View>
        
        <View style={[
          styles.progressLine,
          { backgroundColor: ['in_transit', 'delivered'].includes(orderStatus) ? '#4CAF50' : '#E0E0E0' }
        ]} />
        
        <View style={styles.progressStep}>
          <View style={[
            styles.progressDot, 
            { backgroundColor: ['in_transit', 'delivered'].includes(orderStatus) ? '#4CAF50' : '#E0E0E0' }
          ]} />
          <Text style={styles.progressLabel}>On the way</Text>
        </View>
        
        <View style={[
          styles.progressLine,
          { backgroundColor: orderStatus === 'delivered' ? '#4CAF50' : '#E0E0E0' }
        ]} />
        
        <View style={styles.progressStep}>
          <View style={[
            styles.progressDot, 
            { backgroundColor: orderStatus === 'delivered' ? '#4CAF50' : '#E0E0E0' }
          ]} />
          <Text style={styles.progressLabel}>Delivered</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  statusOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  estimatedTime: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  progressLine: {
    height: 2,
    flex: 0.5,
    marginHorizontal: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
});
