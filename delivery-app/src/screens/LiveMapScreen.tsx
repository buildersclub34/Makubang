
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { deliveryAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

interface ActiveOrder {
  id: string;
  orderId: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  customerName: string;
  customerPhone: string;
  restaurant: {
    name: string;
    phone: string;
  };
  total: number;
  estimatedTime: number;
}

export default function LiveMapScreen() {
  const { user } = useAuth();
  const { location, startTracking } = useLocation();
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [navigationStarted, setNavigationStarted] = useState(false);
  const mapRef = useRef<any>(null);
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ['active-orders'],
    queryFn: deliveryAPI.getActiveOrders,
    refetchInterval: 10000,
  });

  const statusMutation = useMutation({
    mutationFn: (data: { status: string; notes?: string }) =>
      deliveryAPI.updateOrderStatus(activeOrder!.id, data.status, location, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      Alert.alert('Success', 'Order status updated successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update order status');
    },
  });

  useEffect(() => {
    if (orders && orders.length > 0) {
      setActiveOrder(orders[0]);
    }
  }, [orders]);

  useEffect(() => {
    startTracking();
  }, []);

  const handleStatusUpdate = (status: string, requiresNotes: boolean = false) => {
    if (requiresNotes) {
      setShowNotesModal(true);
      return;
    }
    statusMutation.mutate({ status });
  };

  const handleNotesSubmit = (status: string) => {
    statusMutation.mutate({ status, notes });
    setShowNotesModal(false);
    setNotes('');
  };

  const openGoogleMaps = (lat: number, lng: number, address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    // In real app, use Linking.openURL(url)
    console.log('Opening Google Maps:', url);
    setNavigationStarted(true);
  };

  const makePhoneCall = (phone: string) => {
    // In real app, use Linking.openURL(`tel:${phone}`)
    Alert.alert('Call', `Calling ${phone}`);
  };

  if (!activeOrder) {
    return (
      <View style={styles.noOrderContainer}>
        <Icon name="local-shipping" size={80} color="#e0e0e0" />
        <Text style={styles.noOrderTitle}>No Active Deliveries</Text>
        <Text style={styles.noOrderSubtitle}>
          You'll receive notifications when new orders are assigned
        </Text>
      </View>
    );
  }

  const getNextAction = () => {
    switch (activeOrder.status) {
      case 'assigned':
        return {
          text: 'Arrive at Restaurant',
          icon: 'restaurant',
          action: () => handleStatusUpdate('picked_up'),
          color: '#FF9800',
        };
      case 'picked_up':
        return {
          text: 'Start Delivery',
          icon: 'navigation',
          action: () => handleStatusUpdate('in_transit'),
          color: '#2196F3',
        };
      case 'in_transit':
        return {
          text: 'Mark Delivered',
          icon: 'check-circle',
          action: () => handleStatusUpdate('delivered', true),
          color: '#4CAF50',
        };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();
  const isPickupPhase = activeOrder.status === 'assigned';
  const targetLocation = isPickupPhase 
    ? { lat: activeOrder.pickupLat, lng: activeOrder.pickupLng, address: activeOrder.pickupAddress }
    : { lat: activeOrder.dropoffLat, lng: activeOrder.dropoffLng, address: activeOrder.deliveryAddress };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        {/* In real implementation, integrate Google Maps or similar */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>Live Map View</Text>
          <Text style={styles.mapSubtext}>
            {isPickupPhase ? 'Navigate to Restaurant' : 'Navigate to Customer'}
          </Text>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => openGoogleMaps(targetLocation.lat, targetLocation.lng, targetLocation.address)}
          >
            <Icon name="navigation" size={20} color="#fff" />
            <Text style={styles.navigateButtonText}>Open Navigation</Text>
          </TouchableOpacity>
        </View>

        {/* Current location indicator */}
        {location && (
          <View style={styles.locationIndicator}>
            <Icon name="my-location" size={16} color="#2196F3" />
            <Text style={styles.locationText}>
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      {/* Order Details Card */}
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle}>Order #{activeOrder.orderId.slice(-8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeOrder.status) }]}>
            <Text style={styles.statusText}>{activeOrder.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Location Details */}
        <View style={styles.locationDetails}>
          <View style={styles.locationCard}>
            <Icon 
              name={isPickupPhase ? "restaurant" : "location-on"} 
              size={20} 
              color={isPickupPhase ? "#FF9800" : "#4CAF50"} 
            />
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>
                {isPickupPhase ? activeOrder.restaurant.name : activeOrder.customerName}
              </Text>
              <Text style={styles.locationAddress}>{targetLocation.address}</Text>
            </View>
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={() => makePhoneCall(isPickupPhase ? activeOrder.restaurant.phone : activeOrder.customerPhone)}
            >
              <Icon name="phone" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Value and ETA */}
        <View style={styles.orderMeta}>
          <View style={styles.metaItem}>
            <Icon name="account-balance-wallet" size={16} color="#4CAF50" />
            <Text style={styles.metaText}>₹{activeOrder.total.toFixed(2)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="access-time" size={16} color="#FF9800" />
            <Text style={styles.metaText}>ETA: {activeOrder.estimatedTime} min</Text>
          </View>
        </View>

        {/* Action Button */}
        {nextAction && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: nextAction.color }]}
            onPress={nextAction.action}
            disabled={statusMutation.isPending}
          >
            <Icon name={nextAction.icon} size={24} color="#fff" />
            <Text style={styles.actionButtonText}>
              {statusMutation.isPending ? 'Updating...' : nextAction.text}
            </Text>
          </TouchableOpacity>
        )}

        {/* Emergency Actions */}
        <View style={styles.emergencyActions}>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => Alert.alert('Emergency', 'Emergency support contacted')}
          >
            <Icon name="warning" size={20} color="#F44336" />
            <Text style={styles.emergencyText}>Emergency</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => Alert.alert('Issue', 'Report an issue with this delivery')}
          >
            <Icon name="report-problem" size={20} color="#FF9800" />
            <Text style={styles.emergencyText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delivery Notes Modal */}
      <Modal
        visible={showNotesModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delivery Completion</Text>
            <Text style={styles.modalSubtitle}>Add any notes about the delivery:</Text>
            
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Left at door, handed to customer, etc."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNotesModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => handleNotesSubmit('delivered')}
              >
                <Text style={styles.completeButtonText}>Mark Delivered</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'assigned': return '#FF9800';
    case 'picked_up': return '#2196F3';
    case 'in_transit': return '#9C27B0';
    case 'delivered': return '#4CAF50';
    default: return '#757575';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  noOrderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noOrderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  noOrderSubtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
  },
  mapContainer: {
    flex: 2,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mapSubtext: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
  },
  orderCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 5,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  locationDetails: {
    marginBottom: 16,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationAddress: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  phoneButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emergencyActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emergencyText: {
    fontSize: 12,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#757575',
    fontSize: 16,
  },
  completeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  completeButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
