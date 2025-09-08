import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../src/theme';

export default function ProfileScreen() {
  const menuItems = [
    { id: '1', title: 'Edit Profile', icon: 'person-outline', onPress: () => {} },
    { id: '2', title: 'Payment Methods', icon: 'card-outline', onPress: () => {} },
    { id: '3', title: 'Addresses', icon: 'location-outline', onPress: () => {} },
    { id: '4', title: 'Notifications', icon: 'notifications-outline', onPress: () => {} },
    { id: '5', title: 'Favorites', icon: 'heart-outline', onPress: () => {} },
    { id: '6', title: 'Help & Support', icon: 'help-circle-outline', onPress: () => {} },
    { id: '7', title: 'Settings', icon: 'settings-outline', onPress: () => {} },
  ];

  const handleLogout = () => {
    // TODO: Implement logout logic
    router.replace('/login');
  };

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <LinearGradient
              colors={[theme.colors.neon.green, theme.colors.neon.blue]}
              style={styles.profileImageGradient}
            >
              <Image
                source={{ uri: 'https://via.placeholder.com/120x120?text=User' }}
                style={styles.profileImage}
              />
            </LinearGradient>
          </View>
          <Text style={styles.userName}>John Doe</Text>
          <Text style={styles.userEmail}>john.doe@example.com</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>₹2,450</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
              <LinearGradient
                colors={['rgba(0,255,136,0.1)', 'rgba(255,0,128,0.1)']}
                style={styles.menuItemGradient}
              >
                <View style={styles.menuItemContent}>
                  <View style={styles.menuItemLeft}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name={item.icon as any}
                        size={24}
                        color={theme.colors.neon.green}
                      />
                    </View>
                    <Text style={styles.menuItemText}>{item.title}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient
              colors={[theme.colors.neon.pink, '#FF4444']}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={24} color={theme.colors.text} />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Makubang v1.0.0</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for food lovers</Text>
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
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  profileImageContainer: {
    marginBottom: theme.spacing.md,
  },
  profileImageGradient: {
    padding: 4,
    borderRadius: 64,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
  },
  userName: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.neon.green,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  menuContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  menuItem: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  menuItemGradient: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  menuItemText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  logoutContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  logoutButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  logoutText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  footer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  footerSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});