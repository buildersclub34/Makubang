import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';

interface OrderRequest {
  _id: string;
  orderId: string;
  restaurant: {
    name: string;
    address: string;
    phone: string;
    location: {
      latitude: number;
      longitude: number;
    };
    image: string;
  };
  customer: {
    name: string;
    address: string;
    phone: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  deliveryFee: number;
  distance: number;
  estimatedTime: number;
  pickupOTP: string;
  deliveryOTP: string;
  createdAt: string;
}

export default function OrderAcceptanceScreen() {
  const { user } = useAuth();
  const { socket } = useWebSocket();
  const [pendingOrders, setPendingOrders] = useState<OrderRequest[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('new_order_request', handleNewOrderRequest);
      socket.on('order_request_cancelled', handleOrderCancelled);
      
      return () => {
        socket.off('new_order_request');
        socket.off('order_request_cancelled');
      };
    }
  }, [socket]);

  const handleNewOrderRequest = (orderData: OrderRequest) => {
    setPendingOrders(prev => [...prev, orderData]);
    
    // Show local notification
    Alert.alert(
      'New Order Request!',
      `Order from ${orderData.restaurant.name}\nDistance: ${orderData.distance.toFixed(1)} km\nEarnings: ₹${orderData.deliveryFee}`,
      [
        { text: 'View', onPress: () => setSelectedOrder(orderData) },
        { text: 'Later', style: 'cancel' },
      ]
    );
  };

  const handleOrderCancelled = (data: { orderId: string }) => {
    setPendingOrders(prev => prev.filter(order => order._id !== data.orderId));
    if (selectedOrder?._id === data.orderId) {
      setSelectedOrder(null);
    }
  };

  const acceptOrder = async (order: OrderRequest) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/delivery-partners/assignments/${order._id}/accept`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setPendingOrders(prev => prev.filter(o => o._id !== order._id));
        setSelectedOrder(null);
        Alert.alert('Success', 'Order accepted! Navigate to restaurant for pickup.');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to accept order');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept order');
    } finally {
      setLoading(false);
    }
  };

  const rejectOrder = async (order: OrderRequest) => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please select a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/delivery-partners/assignments/${order._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        setPendingOrders(prev => prev.filter(o => o._id !== order._id));
        setSelectedOrder(null);
        setShowRejectModal(false);
        setRejectionReason('');
      } else {
        Alert.alert('Error', 'Failed to reject order');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject order');
    } finally {
      setLoading(false);
    }
  };

  const renderOrderCard = (order: OrderRequest) => (
    <TouchableOpacity
      key={order._id}
      style={styles.orderCard}
      onPress={() => setSelectedOrder(order)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.restaurantInfo}>
          <Image
            source={{ uri: order.restaurant.image || 'https://via.placeholder.com/50x50?text=R' }}
            style={styles.restaurantImage}
          />
          <View style={styles.restaurantDetails}>
            <Text style={styles.restaurantName}>{order.restaurant.name}</Text>
            <Text style={styles.restaurantAddress} numberOfLines={1}>
              {order.restaurant.address}
            </Text>
          </View>
        </View>
        
        <View style={styles.orderMeta}>
          <Text style={styles.deliveryFee}>₹{order.deliveryFee}</Text>
          <Text style={styles.distance}>{order.distance.toFixed(1)} km</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.itemCount}>
          {order.items.length} item{order.items.length > 1 ? 's' : ''} • ₹{order.totalAmount}
        </Text>
        <Text style={styles.estimatedTime}>
          {order.estimatedTime} mins delivery
        </Text>
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => {
            setSelectedOrder(order);
            setShowRejectModal(true);
          }}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => acceptOrder(order)}
          disabled={loading}
        >
          <Text style={styles.acceptButtonText}>
            {loading ? 'Accepting...' : 'Accept'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (pendingOrders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bicycle-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>No pending orders</Text>
        <Text style={styles.emptySubtitle}>
          New order requests will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>
          Pending Orders ({pendingOrders.length})
        </Text>
        
        {pendingOrders.map(renderOrderCard)}
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal
        visible={!!selectedOrder && !showRejectModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedOrder && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Order Details</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Map */}
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: selectedOrder.restaurant.location.latitude,
                    longitude: selectedOrder.restaurant.location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={selectedOrder.restaurant.location}
                    title="Restaurant"
                    pinColor="#FF6B35"
                  />
                  <Marker
                    coordinate={selectedOrder.customer.location}
                    title="Customer"
                    pinColor="#4CAF50"
                  />
                </MapView>
              </View>

              {/* Restaurant Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pickup Location</Text>
                <View style={styles.locationInfo}>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationName}>{selectedOrder.restaurant.name}</Text>
                    <Text style={styles.locationAddress}>{selectedOrder.restaurant.address}</Text>
                  </View>
                  <TouchableOpacity style={styles.callButton}>
                    <Ionicons name="call" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Customer Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Delivery Location</Text>
                <View style={styles.locationInfo}>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationName}>{selectedOrder.customer.name}</Text>
                    <Text style={styles.locationAddress}>{selectedOrder.customer.address}</Text>
                  </View>
                  <TouchableOpacity style={styles.callButton}>
                    <Ionicons name="call" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                {selectedOrder.items.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <Text style={styles.itemName}>
                      {item.quantity}x {item.name}
                    </Text>
                    <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>₹{selectedOrder.totalAmount}</Text>
                </View>
              </View>

              {/* Earnings */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Earnings</Text>
                <View style={styles.earningsContainer}>
                  <Text style={styles.earningsAmount}>₹{selectedOrder.deliveryFee}</Text>
                  <Text style={styles.earningsLabel}>Delivery Fee</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectModalButton]}
                onPress={() => setShowRejectModal(true)}
              >
                <Text style={styles.rejectModalButtonText}>Reject</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.acceptModalButton]}
                onPress={() => acceptOrder(selectedOrder)}
                disabled={loading}
              >
                <Text style={styles.acceptModalButtonText}>
                  {loading ? 'Accepting...' : 'Accept Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>Reason for Rejection</Text>
            
            {['Too far', 'Traffic issue', 'Personal emergency', 'Vehicle problem', 'Other'].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  rejectionReason === reason && styles.selectedReason,
                ]}
                onPress={() => setRejectionReason(reason)}
              >
                <Text
                  style={[
                    styles.reasonText,
                    rejectionReason === reason && styles.selectedReasonText,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.rejectModalButton, { backgroundColor: '#f1f3f4' }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                <Text style={{ color: '#333' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.rejectModalButton, { backgroundColor: '#FF3040' }]}
                onPress={() => selectedOrder && rejectOrder(selectedOrder)}
                disabled={loading || !rejectionReason}
              >
                <Text style={{ color: 'white' }}>
                  {loading ? 'Rejecting...' : 'Reject Order'}
                </Text>
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
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  orderMeta: {
    alignItems: 'flex-end',
  },
  deliveryFee: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  distance: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  orderDetails: {
    marginBottom: 16,
  },
  itemCount: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  estimatedTime: {
    fontSize: 14,
    color: '#666',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3040',
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FF3040',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
  },
  mapContainer: {
    height: 200,
  },
  map: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  earningsContainer: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  earningsLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectModalButton: {
    borderWidth: 1,
    borderColor: '#FF3040',
  },
  rejectModalButtonText: {
    color: '#FF3040',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptModalButton: {
    backgroundColor: '#4CAF50',
  },
  acceptModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  reasonOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  selectedReason: {
    borderColor: '#FF3040',
    backgroundColor: '#fff5f5',
  },
  reasonText: {
    fontSize: 16,
    color: '#333',
  },
  selectedReasonText: {
    color: '#FF3040',
    fontWeight: '600',
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  rejectModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
