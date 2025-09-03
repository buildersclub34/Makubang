
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { deliveryAPI } from '../services/api';

interface HistoryOrder {
  id: string;
  customerName: string;
  restaurantName: string;
  amount: number;
  commission: number;
  distance: number;
  rating: number;
  completedAt: string;
  deliveryTime: number;
  status: 'delivered' | 'cancelled';
}

interface FilterOptions {
  period: 'today' | 'week' | 'month' | 'all';
  status: 'all' | 'delivered' | 'cancelled';
  minAmount: string;
  maxAmount: string;
}

const OrderHistoryScreen: React.FC = () => {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<HistoryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    period: 'month',
    status: 'all',
    minAmount: '',
    maxAmount: '',
  });
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalOrders: 0,
    avgRating: 0,
    totalDistance: 0,
  });

  useEffect(() => {
    loadOrderHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, searchQuery, filters]);

  const loadOrderHistory = async () => {
    try {
      setIsLoading(true);
      const [historyData, earningsData] = await Promise.all([
        deliveryAPI.getOrderHistory(),
        deliveryAPI.getEarningsHistory(),
      ]);

      setOrders(historyData.orders || []);
      setStats(historyData.stats || {
        totalEarnings: 0,
        totalOrders: 0,
        avgRating: 0,
        totalDistance: 0,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load order history');
      console.error('Order history load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrderHistory();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.restaurantName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Period filter
    const now = new Date();
    const periodStart = new Date();
    
    switch (filters.period) {
      case 'today':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      default:
        periodStart.setFullYear(2000); // All time
    }

    if (filters.period !== 'all') {
      filtered = filtered.filter(order =>
        new Date(order.completedAt) >= periodStart
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Amount filters
    if (filters.minAmount) {
      filtered = filtered.filter(order => order.amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(order => order.amount <= parseFloat(filters.maxAmount));
    }

    setFilteredOrders(filtered);
  };

  const renderOrderItem = ({ item: order }: { item: HistoryOrder }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderCustomer}>{order.customerName}</Text>
          <Text style={styles.orderRestaurant}>{order.restaurantName}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.completedAt).toLocaleDateString('en-IN')}
          </Text>
        </View>
        <View style={styles.orderMetrics}>
          <Text style={styles.orderAmount}>₹{order.amount}</Text>
          <Text style={styles.orderCommission}>+₹{order.commission}</Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{order.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.orderStats}>
          <View style={styles.statItem}>
            <Icon name="location-on" size={16} color="#666" />
            <Text style={styles.statText}>{order.distance.toFixed(1)} km</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="access-time" size={16} color="#666" />
            <Text style={styles.statText}>{order.deliveryTime} min</Text>
          </View>
          <View style={[styles.statusBadge, 
            { backgroundColor: order.status === 'delivered' ? '#4CAF50' : '#F44336' }
          ]}>
            <Text style={styles.statusText}>
              {order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFilterRow = (label: string, children: React.ReactNode) => (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filterContent}>{children}</View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading order history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <TouchableOpacity 
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name="tune" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{stats.totalEarnings}</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalDistance.toFixed(0)}</Text>
          <Text style={styles.statLabel}>KM Traveled</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer or restaurant..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {renderFilterRow('Period', (
            <View style={styles.periodButtons}>
              {(['today', 'week', 'month', 'all'] as const).map(period => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    filters.period === period && styles.periodButtonActive
                  ]}
                  onPress={() => setFilters(f => ({ ...f, period }))}
                >
                  <Text style={[
                    styles.periodButtonText,
                    filters.period === period && styles.periodButtonTextActive
                  ]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {renderFilterRow('Status', (
            <View style={styles.statusButtons}>
              {(['all', 'delivered', 'cancelled'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    filters.status === status && styles.statusButtonActive
                  ]}
                  onPress={() => setFilters(f => ({ ...f, status }))}
                >
                  <Text style={[
                    styles.statusButtonText,
                    filters.status === status && styles.statusButtonTextActive
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {renderFilterRow('Amount Range', (
            <View style={styles.amountInputs}>
              <TextInput
                style={styles.amountInput}
                placeholder="Min ₹"
                value={filters.minAmount}
                onChangeText={(text) => setFilters(f => ({ ...f, minAmount: text }))}
                keyboardType="numeric"
              />
              <Text style={styles.amountSeparator}>-</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Max ₹"
                value={filters.maxAmount}
                onChangeText={(text) => setFilters(f => ({ ...f, maxAmount: text }))}
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>
      )}

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.ordersList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="history" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No orders found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search or filters' : 'Complete deliveries will appear here'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterToggle: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterContent: {
    // Container for filter controls
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#4CAF50',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  amountInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  amountSeparator: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 8,
  },
  ordersList: {
    padding: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  orderMetrics: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderCommission: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  orderStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 40,
  },
});

export default OrderHistoryScreen;
