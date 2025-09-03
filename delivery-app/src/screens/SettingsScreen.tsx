
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

interface Settings {
  notifications: {
    newOrders: boolean;
    payments: boolean;
    promotions: boolean;
    systemUpdates: boolean;
  };
  availability: {
    autoAcceptOrders: boolean;
    workingHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  privacy: {
    shareLocation: boolean;
    showRatings: boolean;
  };
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      newOrders: true,
      payments: true,
      promotions: false,
      systemUpdates: true,
    },
    availability: {
      autoAcceptOrders: false,
      workingHours: {
        enabled: false,
        start: '09:00',
        end: '22:00',
      },
    },
    privacy: {
      shareLocation: true,
      showRatings: true,
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/delivery/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSetting = async (path: string, value: any) => {
    try {
      const response = await fetch('/api/delivery/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [path]: value }),
      });

      if (response.ok) {
        // Update local state
        const pathParts = path.split('.');
        setSettings(prev => {
          const newSettings = { ...prev };
          let current: any = newSettings;
          
          for (let i = 0; i < pathParts.length - 1; i++) {
            current = current[pathParts[i]];
          }
          
          current[pathParts[pathParts.length - 1]] = value;
          return newSettings;
        });
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const openSupport = () => {
    Linking.openURL('tel:+919876543210');
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://makubang.com/privacy');
  };

  const openTerms = () => {
    Linking.openURL('https://makubang.com/terms');
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingItem = ({ 
    title, 
    subtitle, 
    icon, 
    value, 
    onToggle, 
    onPress, 
    showArrow = false 
  }: {
    title: string;
    subtitle?: string;
    icon: string;
    value?: boolean;
    onToggle?: (value: boolean) => void;
    onPress?: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress && !onToggle}
    >
      <View style={styles.settingLeft}>
        <Icon name={icon} size={24} color="#666" style={styles.settingIcon} />
        <View>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      {onToggle && value !== undefined && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
          thumbColor={value ? '#ffffff' : '#ffffff'}
        />
      )}
      
      {showArrow && (
        <Icon name="chevron-right" size={24} color="#ccc" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <SettingSection title="Notifications">
        <SettingItem
          title="New Orders"
          subtitle="Get notified when new orders are available"
          icon="notifications"
          value={settings.notifications.newOrders}
          onToggle={(value) => updateSetting('notifications.newOrders', value)}
        />
        <SettingItem
          title="Payments"
          subtitle="Notifications about payments and earnings"
          icon="payment"
          value={settings.notifications.payments}
          onToggle={(value) => updateSetting('notifications.payments', value)}
        />
        <SettingItem
          title="Promotions"
          subtitle="Special offers and bonuses"
          icon="local-offer"
          value={settings.notifications.promotions}
          onToggle={(value) => updateSetting('notifications.promotions', value)}
        />
        <SettingItem
          title="System Updates"
          subtitle="App updates and maintenance notifications"
          icon="system-update"
          value={settings.notifications.systemUpdates}
          onToggle={(value) => updateSetting('notifications.systemUpdates', value)}
        />
      </SettingSection>

      {/* Availability */}
      <SettingSection title="Availability">
        <SettingItem
          title="Auto-accept Orders"
          subtitle="Automatically accept orders that match your preferences"
          icon="check-circle"
          value={settings.availability.autoAcceptOrders}
          onToggle={(value) => updateSetting('availability.autoAcceptOrders', value)}
        />
        <SettingItem
          title="Working Hours"
          subtitle="Set your preferred working hours"
          icon="schedule"
          value={settings.availability.workingHours.enabled}
          onToggle={(value) => updateSetting('availability.workingHours.enabled', value)}
        />
      </SettingSection>

      {/* Privacy */}
      <SettingSection title="Privacy">
        <SettingItem
          title="Share Location"
          subtitle="Allow customers to track your location during delivery"
          icon="location-on"
          value={settings.privacy.shareLocation}
          onToggle={(value) => updateSetting('privacy.shareLocation', value)}
        />
        <SettingItem
          title="Show Ratings"
          subtitle="Display your ratings to customers"
          icon="star"
          value={settings.privacy.showRatings}
          onToggle={(value) => updateSetting('privacy.showRatings', value)}
        />
      </SettingSection>

      {/* Support & Legal */}
      <SettingSection title="Support & Legal">
        <SettingItem
          title="Help & Support"
          subtitle="Get help or report issues"
          icon="help"
          onPress={openSupport}
          showArrow
        />
        <SettingItem
          title="Privacy Policy"
          icon="privacy-tip"
          onPress={openPrivacyPolicy}
          showArrow
        />
        <SettingItem
          title="Terms of Service"
          icon="description"
          onPress={openTerms}
          showArrow
        />
      </SettingSection>

      {/* Account */}
      <SettingSection title="Account">
        <SettingItem
          title="Logout"
          icon="logout"
          onPress={handleLogout}
        />
      </SettingSection>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Makubang Delivery Partner</Text>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 15,
    width: 24,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
});
