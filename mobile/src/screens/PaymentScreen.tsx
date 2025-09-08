import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp, useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'Payment'>;
type PaymentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PaymentScreen() {
  const route = useRoute<PaymentScreenRouteProp>();
  const navigation = useNavigation<PaymentScreenNavigationProp>();
  const { order } = route.params;
  
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'card-outline' },
    { id: 'upi', name: 'UPI', icon: 'phone-portrait-outline' },
    { id: 'wallet', name: 'Wallet', icon: 'wallet-outline' },
    { id: 'cod', name: 'Cash on Delivery', icon: 'cash-outline' },
  ];
  
  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, you would:
      // 1. Call your payment API (Razorpay, etc.)
      // 2. Process the payment
      // 3. Create the order in your backend
      // 4. Navigate to order tracking
      
      // Simulate successful payment
      const orderId = 'ORD' + Math.floor(Math.random() * 1000000);
      
      Alert.alert(
        'Payment Successful',
        `Your order has been placed successfully!\nOrder ID: ${orderId}`,
        [
          {
            text: 'Track Order',
            onPress: () => {
              // Reset navigation and go to order tracking
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    { name: 'MainTabs' },
                    {
                      name: 'OrderTracking',
                      params: { orderId },
                    },
                  ],
                })
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.orderSummary}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Restaurant</Text>
          <Text style={styles.summaryValue}>{order.restaurantName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items</Text>
          <Text style={styles.summaryValue}>{order.items.length} items</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₹{order.total.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>₹40.00</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Taxes</Text>
          <Text style={styles.summaryValue}>₹{(order.total * 0.05).toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            ₹{(order.total + 40 + order.total * 0.05).toFixed(2)}
          </Text>
        </View>
      </View>
      
      <View style={styles.paymentMethods}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              selectedMethod === method.id && styles.selectedPaymentMethod,
            ]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <View style={styles.methodIcon}>
              <Ionicons
                name={method.icon as any}
                size={24}
                color={selectedMethod === method.id ? '#FF6B35' : '#666'}
              />
            </View>
            <Text
              style={[
                styles.methodName,
                selectedMethod === method.id && styles.selectedMethodName,
              ]}
            >
              {method.name}
            </Text>
            {selectedMethod === method.id && (
              <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.deliveryAddress}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Text style={styles.addressType}>Home</Text>
            <TouchableOpacity>
              <Text style={styles.changeAddress}>Change</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.addressLine}>{order.deliveryAddress.address}</Text>
          <Text style={styles.addressLine}>
            {order.deliveryAddress.city}, {order.deliveryAddress.zipCode}
          </Text>
          {order.deliveryAddress.instructions && (
            <Text style={styles.addressInstructions}>
              Note: {order.deliveryAddress.instructions}
            </Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.payButton, isProcessing && styles.disabledButton]}
        onPress={handlePayment}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.payButtonText}>
              Pay ₹{(order.total + 40 + order.total * 0.05).toFixed(2)}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
  },
  orderSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  paymentMethods: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedPaymentMethod: {
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  selectedMethodName: {
    fontWeight: '600',
    color: '#FF6B35',
  },
  deliveryAddress: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  addressCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addressType: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeAddress: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  addressLine: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  addressInstructions: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  payButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});