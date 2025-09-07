
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { deliveryAPI } from '../services/api';

interface EarningsData {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  pendingAmount: number;
  totalEarnings: number;
  avgOrderValue: number;
  avgDeliveryTime: number;
  completionRate: number;
}

interface EarningsHistory {
  date: string;
  amount: number;
  orders: number;
  tips: number;
  bonus: number;
}

const EarningsScreen: React.FC = () => {
  const [earningsData, setEarningsData] = useState<EarningsData>({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    pendingAmount: 0,
    totalEarnings: 0,
    avgOrderValue: 0,
    avgDeliveryTime: 0,
    completionRate: 0,
  });
  const [earningsHistory, setEarningsHistory] = useState<EarningsHistory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadEarningsData();
  }, [selectedPeriod]);

  const loadEarningsData = async () => {
    try {
      setIsLoading(true);
      const [statsData, historyData] = await Promise.all([
        deliveryAPI.getEarningsStats(),
        deliveryAPI.getEarningsHistory(selectedPeriod),
      ]);

      setEarningsData(statsData);
      setEarningsHistory(historyData);
    } catch (error) {
      console.error('Earnings load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarningsData();
    setRefreshing(false);
  };

  const renderEarningsChart = () => {
    const chartData = {
      labels: earningsHistory.map(item => {
        const date = new Date(item.date);
        return selectedPeriod === 'week' 
          ? date.toLocaleDateString('en-IN', { weekday: 'short' })
          : selectedPeriod === 'month'
          ? date.getDate().toString()
          : date.toLocaleDateString('en-IN', { month: 'short' });
      }),
      datasets: [{
        data: earningsHistory.map(item => item.amount),
        strokeWidth: 3,
      }],
    };

    return (
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#4CAF50',
          },
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  const renderBreakdownChart = () => {
    const chartData = {
      labels: ['Base Pay', 'Tips', 'Bonus', 'Incentives'],
      datasets: [{
        data: [
          earningsData.todayEarnings * 0.7,
          earningsData.todayEarnings * 0.15,
          earningsData.todayEarnings * 0.1,
          earningsData.todayEarnings * 0.05,
        ],
      }],
    };

    return (
      <BarChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: { borderRadius: 16 },
        }}
        style={styles.chart}
      />
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading earnings data...</Text>
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
        <Text style={styles.headerTitle}>Earnings</Text>
        <TouchableOpacity style={styles.withdrawButton}>
          <Icon name="account-balance-wallet" size={16} color="#fff" />
          <Text style={styles.withdrawButtonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* Earnings Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.mainEarning}>
          <Text style={styles.mainEarningLabel}>Today's Earnings</Text>
          <Text style={styles.mainEarningValue}>₹{earningsData.todayEarnings}</Text>
          <Text style={styles.mainEarningSubtext}>Available for withdrawal</Text>
        </View>

        <View style={styles.earningsGrid}>
          <View style={styles.earningCard}>
            <Text style={styles.earningValue}>₹{earningsData.weekEarnings}</Text>
            <Text style={styles.earningLabel}>This Week</Text>
          </View>
          <View style={styles.earningCard}>
            <Text style={styles.earningValue}>₹{earningsData.monthEarnings}</Text>
            <Text style={styles.earningLabel}>This Month</Text>
          </View>
          <View style={styles.earningCard}>
            <Text style={styles.earningValue}>₹{earningsData.pendingAmount}</Text>
            <Text style={styles.earningLabel}>Pending</Text>
          </View>
          <View style={styles.earningCard}>
            <Text style={styles.earningValue}>₹{earningsData.totalEarnings}</Text>
            <Text style={styles.earningLabel}>Total Earned</Text>
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <View style={styles.metricIcon}>
              <Icon name="attach-money" size={20} color="#4CAF50" />
            </View>
            <View style={styles.metricInfo}>
              <Text style={styles.metricValue}>₹{earningsData.avgOrderValue}</Text>
              <Text style={styles.metricLabel}>Avg Order Value</Text>
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricIcon}>
              <Icon name="access-time" size={20} color="#2196F3" />
            </View>
            <View style={styles.metricInfo}>
              <Text style={styles.metricValue}>{earningsData.avgDeliveryTime} min</Text>
              <Text style={styles.metricLabel}>Avg Delivery Time</Text>
            </View>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricIcon}>
              <Icon name="check-circle" size={20} color="#FF9800" />
            </View>
            <View style={styles.metricInfo}>
              <Text style={styles.metricValue}>{earningsData.completionRate}%</Text>
              <Text style={styles.metricLabel}>Completion Rate</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Earnings Trend</Text>
          <View style={styles.periodSelector}>
            {(['week', 'month', 'year'] as const).map(period => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive
                ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {earningsHistory.length > 0 && renderEarningsChart()}
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Breakdown</Text>
        {renderBreakdownChart()}
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatCard}>
            <Icon name="local-shipping" size={24} color="#4CAF50" />
            <Text style={styles.quickStatValue}>12</Text>
            <Text style={styles.quickStatLabel}>Deliveries Today</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Icon name="schedule" size={24} color="#2196F3" />
            <Text style={styles.quickStatValue}>8.2h</Text>
            <Text style={styles.quickStatLabel}>Active Time</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Icon name="trending-up" size={24} color="#FF9800" />
            <Text style={styles.quickStatValue}>+15%</Text>
            <Text style={styles.quickStatLabel}>vs Yesterday</Text>
          </View>
        </View>
      </View>

      {/* Earning Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earning Tips</Text>
        <View style={styles.tipsContainer}>
          <View style={styles.tipItem}>
            <Icon name="lightbulb-outline" size={20} color="#FFD700" />
            <Text style={styles.tipText}>
              Work during peak hours (12-2 PM, 7-9 PM) for higher earnings
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="lightbulb-outline" size={20} color="#FFD700" />
            <Text style={styles.tipText}>
              Maintain high ratings to get priority on premium orders
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="lightbulb-outline" size={20} color="#FFD700" />
            <Text style={styles.tipText}>
              Complete orders faster to increase your earnings per hour
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainEarning: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mainEarningLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mainEarningValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  mainEarningSubtext: {
    fontSize: 12,
    color: '#999',
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  earningCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  earningValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  earningLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
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
  chart: {
    borderRadius: 16,
    marginHorizontal: -10,
  },
  metricsContainer: {
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricInfo: {
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  tipsContainer: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff9c4',
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default EarningsScreen;
