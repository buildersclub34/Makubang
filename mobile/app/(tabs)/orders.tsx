import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';

interface Order {
  id: string;
  restaurant: string;
  items: string[];
  total: number;
  status: 'preparing' | 'on_way' | 'delivered' | 'cancelled';
  date: string;
}

export default function OrdersScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      restaurant: 'Delhi Darbar',
      items: ['Butter Chicken', 'Naan', 'Rice'],
      total: 450,
      status: 'on_way',
      date: '2025-09-04',
    },
    {
      id: '2',
      restaurant: 'Pizza Corner',
      items: ['Margherita Pizza', 'Garlic Bread'],
      total: 320,
      status: 'delivered',
      date: '2025-09-03',
    },
    {
      id: '3',
      restaurant: 'Burger King',
      items: ['Whopper', 'Fries', 'Coke'],
      total: 280,
      status: 'preparing',
      date: '2025-09-04',
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'preparing':
        return theme.colors.neon.blue;
      case 'on_way':
        return '#FFD700';
      case 'delivered':
        return theme.colors.neon.green;
      case 'cancelled':
        return '#FF4444';
      default:
        return theme.colors.text.secondary;
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'preparing':
        return 'Preparing';
      case 'on_way':
        return 'On the way';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'preparing':
        return 'restaurant';
      case 'on_way':
        return 'bicycle';
      case 'delivered':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <LinearGradient
      colors={[theme.colors.background.primary, theme.colors.background.secondary]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSubtitle}>Track your food orders</Text>
        </View>

        <View style={styles.ordersContainer}>
          {orders.map((order) => (
            <TouchableOpacity key={order.id} style={styles.orderCard}>
              <LinearGradient
                colors={['rgba(0,255,136,0.1)', 'rgba(255,0,128,0.1)']}
                style={styles.orderGradient}
              >
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.restaurantName}>{order.restaurant}</Text>
                    <Text style={styles.orderDate}>{order.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Ionicons
                      name={getStatusIcon(order.status) as any}
                      size={16}
                      color={getStatusColor(order.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderItems}>
                  <Text style={styles.itemsText}>
                    {order.items.join(', ')}
                  </Text>
                </View>

                <View style={styles.orderFooter}>
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>₹{order.total}</Text>
                  </View>
                  
                  {order.status === 'on_way' && (
                    <TouchableOpacity style={styles.trackButton}>
                      <LinearGradient
                        colors={[theme.colors.neon.green, theme.colors.neon.blue]}
                        style={styles.trackGradient}
                      >
                        <Ionicons name="location" size={16} color={theme.colors.text.primary} />
                        <Text style={styles.trackText}>Track Order</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {order.status === 'delivered' && (
                    <TouchableOpacity style={styles.reorderButton}>
                      <LinearGradient
                        colors={[theme.colors.neon.pink, theme.colors.neon.green]}
                        style={styles.reorderGradient}
                      >
                        <Ionicons name="repeat" size={16} color={theme.colors.text.primary} />
                        <Text style={styles.reorderText}>Reorder</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {orders.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="receipt" size={64} color={theme.colors.text.secondary} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Your order history will appear here</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
  },
  ordersContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  orderCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  orderGradient: {
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  restaurantName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
  },
  orderDate: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  orderItems: {
    marginBottom: theme.spacing.md,
  },
  itemsText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  totalLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
  },
  totalAmount: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
  },
  trackButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  trackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  trackText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
  },
  reorderButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  reorderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  reorderText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});