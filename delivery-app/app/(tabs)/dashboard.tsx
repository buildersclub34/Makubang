
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const colors = {
  background: {
    primary: '#1A1A1A',
    secondary: '#2A2A2A',
  },
  neon: {
    green: '#00FF88',
    pink: '#FF0080',
    blue: '#0080FF',
    yellow: '#FFFF00',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#CCCCCC',
  },
};

export default function DashboardScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState({
    today: 1250,
    week: 8750,
    month: 32500,
  });
  const [activeOrders, setActiveOrders] = useState(3);

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    Alert.alert(
      isOnline ? 'Going Offline' : 'Going Online',
      isOnline 
        ? 'You will stop receiving new orders' 
        : 'You are now available for deliveries'
    );
  };

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Delivery Dashboard</Text>
          <Text style={styles.headerSubtitle}>Makubang Partner</Text>
        </View>

        {/* Online Status Toggle */}
        <TouchableOpacity 
          style={styles.statusToggle} 
          onPress={toggleOnlineStatus}
        >
          <LinearGradient
            colors={isOnline 
              ? [colors.neon.green, colors.neon.blue] 
              : [colors.neon.pink, colors.neon.yellow]
            }
            style={styles.statusGradient}
          >
            <View style={styles.statusContent}>
              <Ionicons 
                name={isOnline ? 'checkmark-circle' : 'pause-circle'} 
                size={32} 
                color={colors.text.primary} 
              />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </Text>
                <Text style={styles.statusSubtitle}>
                  {isOnline ? 'Receiving Orders' : 'Tap to go online'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Earnings Cards */}
        <View style={styles.earningsSection}>
          <Text style={styles.sectionTitle}>Earnings Overview</Text>
          <View style={styles.earningsGrid}>
            <View style={styles.earningCard}>
              <LinearGradient
                colors={['rgba(0,255,136,0.1)', 'rgba(0,128,255,0.1)']}
                style={styles.cardGradient}
              >
                <Ionicons name="today" size={24} color={colors.neon.green} />
                <Text style={styles.earningAmount}>₹{earnings.today}</Text>
                <Text style={styles.earningLabel}>Today</Text>
              </LinearGradient>
            </View>

            <View style={styles.earningCard}>
              <LinearGradient
                colors={['rgba(255,0,128,0.1)', 'rgba(255,255,0,0.1)']}
                style={styles.cardGradient}
              >
                <Ionicons name="calendar" size={24} color={colors.neon.pink} />
                <Text style={styles.earningAmount}>₹{earnings.week}</Text>
                <Text style={styles.earningLabel}>This Week</Text>
              </LinearGradient>
            </View>

            <View style={styles.earningCard}>
              <LinearGradient
                colors={['rgba(0,128,255,0.1)', 'rgba(255,255,0,0.1)']}
                style={styles.cardGradient}
              >
                <Ionicons name="stats-chart" size={24} color={colors.neon.blue} />
                <Text style={styles.earningAmount}>₹{earnings.month}</Text>
                <Text style={styles.earningLabel}>This Month</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Active Orders */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>{activeOrders}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.orderCard}>
            <LinearGradient
              colors={['rgba(0,255,136,0.1)', 'rgba(255,0,128,0.1)']}
              style={styles.orderCardGradient}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderTitle}>Order #MK12345</Text>
                <Text style={styles.orderStatus}>Pickup Ready</Text>
              </View>
              <Text style={styles.orderRestaurant}>Pizza Corner</Text>
              <Text style={styles.orderAddress}>123 Main St, Sector 15</Text>
              <View style={styles.orderFooter}>
                <Text style={styles.orderAmount}>₹450</Text>
                <TouchableOpacity style={styles.orderAction}>
                  <Text style={styles.orderActionText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={[colors.neon.green, colors.neon.blue]}
                style={styles.actionGradient}
              >
                <Ionicons name="map" size={24} color={colors.text.primary} />
                <Text style={styles.actionText}>Live Map</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={[colors.neon.pink, colors.neon.yellow]}
                style={styles.actionGradient}
              >
                <Ionicons name="wallet" size={24} color={colors.text.primary} />
                <Text style={styles.actionText}>Wallet</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={[colors.neon.blue, colors.neon.green]}
                style={styles.actionGradient}
              >
                <Ionicons name="time" size={24} color={colors.text.primary} />
                <Text style={styles.actionText}>History</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <LinearGradient
                colors={[colors.neon.yellow, colors.neon.pink]}
                style={styles.actionGradient}
              >
                <Ionicons name="settings" size={24} color={colors.text.primary} />
                <Text style={styles.actionText}>Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    textShadowColor: colors.neon.green,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 8,
  },
  statusToggle: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusGradient: {
    padding: 20,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statusSubtitle: {
    fontSize: 14,
    color: colors.text.primary,
    opacity: 0.8,
  },
  earningsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  earningCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 8,
  },
  earningLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  ordersSection: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderBadge: {
    backgroundColor: colors.neon.green,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  orderBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
  },
  orderCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  orderCardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  orderStatus: {
    fontSize: 12,
    color: colors.neon.green,
    fontWeight: '600',
  },
  orderRestaurant: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  orderAddress: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  orderAction: {
    backgroundColor: colors.neon.blue,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  orderActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  actionsSection: {
    margin: 16,
    marginBottom: 32,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 56) / 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
  },
});
