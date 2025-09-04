import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: '1', name: 'Indian', icon: '🍛', color: '#FF6B35' },
    { id: '2', name: 'Chinese', icon: '🥢', color: '#00D4FF' },
    { id: '3', name: 'Italian', icon: '🍕', color: '#FF0080' },
    { id: '4', name: 'Fast Food', icon: '🍔', color: '#00FF88' },
  ];

  const popularRestaurants = [
    { id: '1', name: 'Delhi Darbar', cuisine: 'Indian', rating: 4.5, image: 'https://via.placeholder.com/150x100?text=Restaurant' },
    { id: '2', name: 'Pizza Corner', cuisine: 'Italian', rating: 4.2, image: 'https://via.placeholder.com/150x100?text=Pizza' },
    { id: '3', name: 'Burger King', cuisine: 'Fast Food', rating: 4.0, image: 'https://via.placeholder.com/150x100?text=Burger' },
  ];

  return (
    <LinearGradient
      colors={[theme.colors.background.primary, theme.colors.background.secondary]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>Find amazing food around you</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={theme.colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants, dishes..."
              placeholderTextColor={theme.colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoriesContainer}>
              {categories.map((category) => (
                <TouchableOpacity key={category.id} style={styles.categoryCard}>
                  <LinearGradient
                    colors={[category.color + '20', category.color + '10']}
                    style={styles.categoryGradient}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Restaurants</Text>
          {popularRestaurants.map((restaurant) => (
            <TouchableOpacity key={restaurant.id} style={styles.restaurantCard}>
              <LinearGradient
                colors={['rgba(0,255,136,0.1)', 'rgba(255,0,128,0.1)']}
                style={styles.restaurantGradient}
              >
                <Image source={{ uri: restaurant.image }} style={styles.restaurantImage} />
                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{restaurant.rating}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
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
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: theme.typography.sizes.md,
    marginLeft: theme.spacing.sm,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  categoryCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  categoryGradient: {
    width: 100,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.lg,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.sm,
  },
  categoryName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.weights.medium,
  },
  restaurantCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  restaurantGradient: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.lg,
  },
  restaurantImage: {
    width: 80,
    height: 60,
    borderRadius: theme.borderRadius.md,
  },
  restaurantInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'space-between',
  },
  restaurantName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
  },
  restaurantCuisine: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  ratingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.primary,
  },
});