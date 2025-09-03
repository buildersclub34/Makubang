
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { deliveryAPI } from '../services/api';

interface DashboardStats {
  todaysEarnings: number;
  totalOrders: number;
  activeOrders: number;
  rating: number;
  completionRate: number;
  avgDeliveryTime: number;
}

interface ActiveOrder {
  id: string;
  customerName: string;
  restaurantName: string;
  pickupAddress: string;
  deliveryAddress: string;
  amount: number;
  status: 'assigned' | 'picked_up' | 'out_for_delivery';
  estimatedDelivery: string;
}

const DashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todaysEarnings: 0,
    totalOrders: 0,
    activeOrders: 0,
    rating: 0,
    completionRate: 0,
    avgDeliveryTime: 0,
  });
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, ordersData] = await Promise.all([
        deliveryAPI.getDashboardStats(),
        deliveryAPI.getActiveOrders(),
      ]);

      setStats(statsData);
      setActiveOrders(ordersData);
      setIsOnline(statsData.isOnline || false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
      console.error('Dashboard load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleOnlineToggle = async (value: boolean) => {
    try {
      await deliveryAPI.updateOnlineStatus(value);
      setIsOnline(value);
      Alert.alert(
        value ? 'You are now online' : 'You are now offline',
        value ? 'You will receive delivery requests' : 'You will not receive delivery requests'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update online status');
    }
  };

  const handleOrderAction = (orderId: string, action: string) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateOrderStatus(orderId, action),
        },
      ]
    );
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await deliveryAPI.updateOrderStatus(orderId, status);
      await loadDashboardData();
      Alert.alert('Success', 'Order status updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const renderEarningsChart = () => {
    const chartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [320, 450, 280, 390, 520, 680, 420],
        strokeWidth: 3,
      }],
    };

    return (
      <LineChart
        data={chartData}
        width={screenWidth - 60}
        height={200}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          style: { borderRadius: 16 },
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  const renderPerformanceChart = () => {
    const data = [
      {
        name: 'On-time',
        population: stats.completionRate,
        color: '#4CAF50',
        legendFontColor: '#666',
      },
      {
        name: 'Delayed',
        population: 100 - stats.completionRate,
        color: '#FF9800',
        legendFontColor: '#666',
      },
    ];

    return (
      <PieChart
        data={data}
        width={screenWidth - 60}
        height={180}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
      />
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good Morning!</Text>
            <Text style={styles.partnerName}>Delivery Partner</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.onlineToggle}>
              <Text style={[styles.onlineText, { color: isOnline ? '#4CAF50' : '#666' }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={handleOnlineToggle}
                thumbColor={isOnline ? '#4CAF50' : '#ccc'}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
              />
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.earningsCard]}>
              <Icon name="account-balance-wallet" size={24} color="#fff" />
              <Text style={styles.statValue}>₹{stats.todaysEarnings}</Text>
              <Text style={styles.statLabel}>Today's Earnings</Text>
            </View>
            <View style={[styles.statCard, styles.ordersCard]}>
              <Icon name="local-shipping" size={24} color="#fff" />
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.ratingCard]}>
              <Icon name="star" size={24} color="#fff" />
              <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={[styles.statCard, styles.activeCard]}>
              <Icon name="access-time" size={24} color="#fff" />
              <Text style={styles.statValue}>{stats.avgDeliveryTime}min</Text>
              <Text style={styles.statLabel}>Avg Time</Text>
            </View>
          </View>
        </View>

        {/* Active Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            <Text style={styles.sectionSubtitle}>{activeOrders.length} orders</Text>
          </View>

          {activeOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="local-shipping" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No active orders</Text>
              <Text style={styles.emptyStateSubtext}>
                {isOnline ? 'Orders will appear here when assigned' : 'Go online to receive orders'}
              </Text>
            </View>
          ) : (
            activeOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderCustomer}>{order.customerName}</Text>
                    <Text style={styles.orderRestaurant}>{order.restaurantName}</Text>
                  </View>
                  <View style={styles.orderAmount}>
                    <Text style={styles.orderValue}>₹{order.amount}</Text>
                    <Text style={styles.orderStatus}>{order.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.orderAddresses}>
                  <View style={styles.addressRow}>
                    <Icon name="restaurant" size={16} color="#666" />
                    <Text style={styles.addressText} numberOfLines={1}>{order.pickupAddress}</Text>
                  </View>
                  <View style={styles.addressRow}>
                    <Icon name="home" size={16} color="#666" />
                    <Text style={styles.addressText} numberOfLines={1}>{order.deliveryAddress}</Text>
                  </View>
                </View>

                <View style={styles.orderActions}>
                  {order.status === 'assigned' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleOrderAction(order.id, 'picked_up')}
                    >
                      <Text style={styles.actionButtonText}>Accept & Pickup</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'picked_up' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deliverButton]}
                      onPress={() => handleOrderAction(order.id, 'out_for_delivery')}
                    >
                      <Text style={styles.actionButtonText}>Start Delivery</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleOrderAction(order.id, 'delivered')}
                    >
                      <Text style={styles.actionButtonText}>Mark Delivered</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Performance Charts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Earnings</Text>
          {renderEarningsChart()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Performance</Text>
          {renderPerformanceChart()}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Icon name="support-agent" size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Icon name="assessment" size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Icon name="settings" size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Icon name="help" size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  partnerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    alignItems: 'center',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 20,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsCard: {
    backgroundColor: '#4CAF50',
  },
  ordersCard: {
    backgroundColor: '#2196F3',
  },
  ratingCard: {
    backgroundColor: '#FF9800',
  },
  activeCard: {
    backgroundColor: '#9C27B0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    marginTop: 8,
    backgroundColor: '#fff',
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  orderCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderCustomer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderRestaurant: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  orderAmount: {
    alignItems: 'flex-end',
  },
  orderValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  orderStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  orderAddresses: {
    gap: 8,
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  deliverButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  chart: {
    marginHorizontal: 20,
    borderRadius: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    minWidth: 70,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DashboardScreen;
