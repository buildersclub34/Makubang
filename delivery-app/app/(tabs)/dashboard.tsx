
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [isOnline, setIsOnline] = useState(false);

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderColor: color }]}>
      <LinearGradient
        colors={['#2A2A2A', '#1A1A1A']}
        style={styles.statCardGradient}
      >
        <Ionicons name={icon} size={32} color={color} />
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </LinearGradient>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Partner!</Text>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineText, { color: isOnline ? '#4CAF50' : '#FF5722' }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: '#FF5722', true: '#4CAF50' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Today's Earnings"
          value="₹1,240"
          icon="wallet"
          color="#4CAF50"
        />
        <StatCard
          title="Orders Completed"
          value="12"
          icon="checkmark-circle"
          color="#2196F3"
        />
        <StatCard
          title="Distance Covered"
          value="45.2 km"
          icon="bicycle"
          color="#FF9800"
        />
        <StatCard
          title="Rating"
          value="4.8 ⭐"
          icon="star"
          color="#FFD700"
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <LinearGradient
            colors={['#4CAF50', '#45A049']}
            style={styles.actionGradient}
          >
            <Ionicons name="location" size={24} color="#FFFFFF" />
            <Text style={styles.actionText}>VIEW ACTIVE ORDERS</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.actionGradient}
          >
            <Ionicons name="map" size={24} color="#FFFFFF" />
            <Text style={styles.actionText}>OPEN LIVE MAP</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.actionGradient}
          >
            <Ionicons name="analytics" size={24} color="#FFFFFF" />
            <Text style={styles.actionText}>VIEW EARNINGS</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Order Delivered</Text>
            <Text style={styles.activitySubtitle}>Pizza Corner • ₹156 earned</Text>
            <Text style={styles.activityTime}>2 minutes ago</Text>
          </View>
        </View>

        <View style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <Ionicons name="bicycle" size={24} color="#2196F3" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Order Picked Up</Text>
            <Text style={styles.activitySubtitle}>Burger House • On the way</Text>
            <Text style={styles.activityTime}>15 minutes ago</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlineText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 16,
  },
  statCard: {
    width: (width - 56) / 2,
    borderWidth: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statTitle: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  recentActivity: {
    padding: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#888888',
  },
});
