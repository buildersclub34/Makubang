import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';

interface Order {
  _id: string;
  orderId: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupOTP: string;
  deliveryOTP: string;
  estimatedTime: number;
}

export default function DeliveryPartnerApp() {
  const [isOnline, setIsOnline] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpType, setOtpType] = useState<'pickup' | 'delivery'>('pickup');
  const [earnings, setEarnings] = useState({ total: 0, thisMonth: 0 });

  useEffect(() => {
    requestLocationPermission();
    loadEarnings();
  }, []);

  useEffect(() => {
    if (isOnline && location) {
      updateLocationOnServer();
    }
  }, [isOnline, location]);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      startLocationTracking();
    }
  };

  const startLocationTracking = async () => {
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Update every 10 seconds
        distanceInterval: 10, // Update every 10 meters
      },
      (newLocation) => {
        setLocation(newLocation.coords);
      }
    );
  };

  const updateLocationOnServer = async () => {
    if (!location) return;

    try {
      await fetch('/api/delivery-partners/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          isOnline,
          location: {
            lat: location.latitude,
            lng: location.longitude
          }
        })
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
  };

  const acceptOrder = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/delivery-partners/assignments/${assignmentId}/accept`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Fetch updated order details
        loadCurrentOrder();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept order');
    }
  };

  const rejectOrder = async (assignmentId: string) => {
    Alert.prompt(
      'Reject Order',
      'Please provide a reason:',
      async (reason) => {
        if (!reason) return;

        try {
          await fetch(`/api/delivery-partners/assignments/${assignmentId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reason })
          });

          setCurrentOrder(null);
        } catch (error) {
          Alert.alert('Error', 'Failed to reject order');
        }
      }
    );
  };

  const verifyOTP = async () => {
    if (!currentOrder || !otpInput) return;

    const endpoint = otpType === 'pickup' ? 'verify-pickup' : 'verify-delivery';
    
    try {
      const response = await fetch(`/api/delivery-partners/assignments/${currentOrder._id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otp: otpInput })
      });

      if (response.ok) {
        setShowOtpModal(false);
        setOtpInput('');
        
        if (otpType === 'pickup') {
          // Update order status to picked up
          setCurrentOrder(prev => prev ? { ...prev, status: 'picked_up' } : null);
        } else {
          // Order completed
          setCurrentOrder(null);
          loadEarnings(); // Refresh earnings
        }
      } else {
        Alert.alert('Error', 'Invalid OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP');
    }
  };

  const updateDeliveryStatus = async (status: string) => {
    if (!currentOrder) return;

    try {
      const response = await fetch(`/api/delivery-partners/assignments/${currentOrder._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status,
          location: location ? { lat: location.latitude, lng: location.longitude } : undefined
        })
      });

      if (response.ok) {
        setCurrentOrder(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const loadCurrentOrder = async () => {
    try {
      const response = await fetch('/api/delivery-partners/current-order', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentOrder(data.order);
      }
    } catch (error) {
      console.error('Failed to load current order:', error);
    }
  };

  const loadEarnings = async () => {
    try {
      const response = await fetch('/api/delivery-partners/earnings', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEarnings(data.summary);
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
    }
  };

  const showOtpDialog = (type: 'pickup' | 'delivery') => {
    setOtpType(type);
    setShowOtpModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Makubang Delivery</Text>
        <TouchableOpacity
          style={[styles.statusButton, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]}
          onPress={toggleOnlineStatus}
        >
          <Text style={styles.statusText}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Earnings */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsTitle}>Today's Earnings</Text>
        <Text style={styles.earningsAmount}>₹{earnings.thisMonth}</Text>
        <Text style={styles.earningsTotal}>Total: ₹{earnings.total}</Text>
      </View>

      {/* Current Order */}
      {currentOrder ? (
        <View style={styles.orderCard}>
          <Text style={styles.orderTitle}>Current Order</Text>
          <Text style={styles.orderId}>#{currentOrder.orderId}</Text>
          <Text style={styles.orderStatus}>Status: {currentOrder.status}</Text>
          
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>Pickup:</Text>
            <Text style={styles.addressText}>{currentOrder.pickupAddress}</Text>
          </View>
          
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>Delivery:</Text>
            <Text style={styles.addressText}>{currentOrder.deliveryAddress}</Text>
          </View>

          <View style={styles.buttonContainer}>
            {currentOrder.status === 'assigned' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => acceptOrder(currentOrder._id)}
                >
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => rejectOrder(currentOrder._id)}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>
              </>
            )}

            {currentOrder.status === 'accepted' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => updateDeliveryStatus('en_route_pickup')}
              >
                <Text style={styles.buttonText}>Start Pickup</Text>
              </TouchableOpacity>
            )}

            {currentOrder.status === 'en_route_pickup' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => showOtpDialog('pickup')}
              >
                <Text style={styles.buttonText}>Arrived at Restaurant</Text>
              </TouchableOpacity>
            )}

            {currentOrder.status === 'picked_up' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => updateDeliveryStatus('en_route_delivery')}
              >
                <Text style={styles.buttonText}>Start Delivery</Text>
              </TouchableOpacity>
            )}

            {currentOrder.status === 'en_route_delivery' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => showOtpDialog('delivery')}
              >
                <Text style={styles.buttonText}>Delivered</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.noOrderCard}>
          <Text style={styles.noOrderText}>
            {isOnline ? 'Waiting for orders...' : 'Go online to receive orders'}
          </Text>
        </View>
      )}

      {/* OTP Modal */}
      <Modal visible={showOtpModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Enter {otpType === 'pickup' ? 'Pickup' : 'Delivery'} OTP
            </Text>
            <TextInput
              style={styles.otpInput}
              value={otpInput}
              onChangeText={setOtpInput}
              placeholder="Enter 4-digit OTP"
              keyboardType="numeric"
              maxLength={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowOtpModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={verifyOTP}
              >
                <Text style={styles.buttonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  earningsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  earningsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 4,
  },
  earningsTotal: {
    fontSize: 14,
    color: '#666',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noOrderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noOrderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 14,
    color: '#f59e0b',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
});
