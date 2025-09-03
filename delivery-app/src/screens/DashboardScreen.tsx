
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { deliveryAPI } from '../services/api';

interface DashboardStats {
  todayEarnings: number;
  todayDeliveries: number;
  weeklyEarnings: number;
  rating: number;
  completionRate: number;
  isOnline: boolean;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { location, startTracking, stopTracking } = useLocation();
  const [isOnline, setIsOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: deliveryAPI.getDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activeOrders } = useQuery({
    queryKey: ['active-orders'],
    queryFn: deliveryAPI.getActiveOrders,
    enabled: isOnline,
    refetchInterval: 10000, // Refresh every 10 seconds when online
  });

  const toggleOnlineMutation = useMutation({
    mutationFn: (online: boolean) => deliveryAPI.updateOnlineStatus(online, location),
    onSuccess: (data) => {
      setIsOnline(data.isOnline);
      if (data.isOnline) {
        startTracking();
      } else {
        stopTracking();
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to update online status');
      console.error('Toggle online error:', error);
    },
  });

  const handleToggleOnline = (value: boolean) => {
    if (value && !location) {
      Alert.alert(
        'Location Required',
        'Please enable location services to go online',
        [{ text: 'OK' }]
      );
      return;
    }
    toggleOnlineMutation.mutate(value);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}!</Text>
          <Text style={styles.subtitle}>Ready to earn today?</Text>
        </View>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineText, { color: isOnline ? '#4CAF50' : '#757575' }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={isOnline ? '#fff' : '#f4f3f4'}
            disabled={toggleOnlineMutation.isPending}
          />
        </View>
      </View>

      {/* Today's Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Today's Performance</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="account-balance-wallet" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{formatCurrency(stats?.todayEarnings || 0)}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="local-shipping" size={24} color="#FF6B35" />
            <Text style={styles.statValue}>{stats?.todayDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="star" size={24} color="#FFD700" />
            <Text style={styles.statValue}>{stats?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="check-circle" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{stats?.completionRate || 0}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>
      </View>

      {/* Active Orders */}
      {isOnline && activeOrders && activeOrders.length > 0 && (
        <View style={styles.activeOrdersContainer}>
          <Text style={styles.sectionTitle}>Active Orders</Text>
          {activeOrders.map((order: any) => (
            <TouchableOpacity key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status.replace('_', ' ')}</Text>
                </View>
              </View>
              
              <View style={styles.orderDetails}>
                <View style={styles.locationRow}>
                  <Icon name="restaurant" size={16} color="#757575" />
                  <Text style={styles.locationText}>{order.restaurant?.name}</Text>
                </View>
                <View style={styles.locationRow}>
                  <Icon name="location-on" size={16} color="#757575" />
                  <Text style={styles.locationText}>{order.deliveryAddress}</Text>
                </View>
                <View style={styles.locationRow}>
                  <Icon name="access-time" size={16} color="#757575" />
                  <Text style={styles.locationText}>ETA: {order.estimatedDelivery}</Text>
                </View>
              </View>
              
              <View style={styles.orderFooter}>
                <Text style={styles.orderAmount}>{formatCurrency(order.total)}</Text>
                <Icon name="chevron-right" size={24} color="#757575" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="history" size={32} color="#4CAF50" />
            <Text style={styles.actionText}>Order History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="support" size={32} color="#FF6B35" />
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="receipt" size={32} color="#2196F3" />
            <Text style={styles.actionText}>Weekly Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="settings" size={32} color="#757575" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekly Earnings Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Weekly Earnings</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartValue}>{formatCurrency(stats?.weeklyEarnings || 0)}</Text>
          <Text style={styles.chartLabel}>This Week</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'assigned': return '#FF9800';
    case 'picked_up': return '#2196F3';
    case 'out_for_delivery': return '#9C27B0';
    case 'delivered': return '#4CAF50';
    default: return '#757575';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginTop: 4,
  },
  onlineToggle: {
    alignItems: 'center',
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  activeOrdersContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  chartPlaceholder: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  chartValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  chartLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
});
