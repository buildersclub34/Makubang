
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { deliveryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  rating: number;
  totalDeliveries: number;
  verificationStatus: string;
  isAvailable: boolean;
  bankDetails: any;
}

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
    rating: 0,
    totalDeliveries: 0,
    verificationStatus: 'pending',
    isAvailable: false,
    bankDetails: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profileData = await deliveryAPI.getProfile();
      setProfile(profileData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile data');
      console.error('Profile load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      await deliveryAPI.updateProfile(profile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const renderVerificationBadge = () => {
    const getStatusColor = () => {
      switch (profile.verificationStatus) {
        case 'verified': return '#4CAF50';
        case 'pending': return '#FF9800';
        case 'rejected': return '#F44336';
        default: return '#666';
      }
    };

    const getStatusText = () => {
      switch (profile.verificationStatus) {
        case 'verified': return 'Verified';
        case 'pending': return 'Pending';
        case 'rejected': return 'Rejected';
        default: return 'Unknown';
      }
    };

    return (
      <View style={[styles.verificationBadge, { backgroundColor: getStatusColor() }]}>
        <Icon name="verified-user" size={16} color="#fff" />
        <Text style={styles.verificationText}>{getStatusText()}</Text>
      </View>
    );
  };

  if (isLoading && !profile.name) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Icon name="person" size={40} color="#666" />
            </View>
          )}
        </View>
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileRole}>Delivery Partner</Text>
        {renderVerificationBadge()}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map(star => (
              <Icon
                key={star}
                name="star"
                size={12}
                color={star <= profile.rating ? '#FFD700' : '#ddd'}
              />
            ))}
          </View>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.totalDeliveries}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {profile.isAvailable ? 'Online' : 'Offline'}
          </Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            style={styles.editButton}
          >
            <Icon name={isEditing ? 'check' : 'edit'} size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={profile.name}
                onChangeText={(value) => setProfile(p => ({ ...p, name: value }))}
              />
            ) : (
              <Text style={styles.infoValue}>{profile.name}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={profile.email}
                onChangeText={(value) => setProfile(p => ({ ...p, email: value }))}
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.infoValue}>{profile.email}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Vehicle Type</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={profile.vehicleType}
                onChangeText={(value) => setProfile(p => ({ ...p, vehicleType: value }))}
              />
            ) : (
              <Text style={styles.infoValue}>{profile.vehicleType}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Vehicle Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={profile.vehicleNumber}
                onChangeText={(value) => setProfile(p => ({ ...p, vehicleNumber: value }))}
              />
            ) : (
              <Text style={styles.infoValue}>{profile.vehicleNumber}</Text>
            )}
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProfile}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionItem}>
          <Icon name="account-balance" size={24} color="#4CAF50" />
          <Text style={styles.actionText}>Bank Details</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Icon name="insert-drive-file" size={24} color="#4CAF50" />
          <Text style={styles.actionText}>Upload Documents</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Icon name="support-agent" size={24} color="#4CAF50" />
          <Text style={styles.actionText}>Support</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Icon name="privacy-tip" size={24} color="#4CAF50" />
          <Text style={styles.actionText}>Privacy Policy</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Icon name="gavel" size={24} color="#4CAF50" />
          <Text style={styles.actionText}>Terms & Conditions</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  verificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 8,
    paddingVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ratingStars: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
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
  editButton: {
    padding: 8,
  },
  infoGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  infoItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  infoInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
  },
  saveButton: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#F44336',
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default ProfileScreen;
