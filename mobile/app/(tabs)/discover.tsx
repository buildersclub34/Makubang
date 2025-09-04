
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../src/theme';

const { width } = Dimensions.get('window');

interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  cuisine: string;
  distance: string;
  promoted?: boolean;
}

interface FoodCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);

  useEffect(() => {
    // Mock data - replace with API calls
    setCategories([
      { id: 'all', name: 'All', icon: 'restaurant', color: theme.colors.primary },
      { id: 'indian', name: 'Indian', icon: 'leaf', color: '#FF9500' },
      { id: 'chinese', name: 'Chinese', icon: 'restaurant', color: '#FF3B30' },
      { id: 'italian', name: 'Italian', icon: 'pizza', color: '#34C759' },
      { id: 'fastfood', name: 'Fast Food', icon: 'fast-food', color: '#007AFF' },
    ]);

    setRestaurants([
      {
        id: '1',
        name: 'Spice Garden',
        image: 'https://via.placeholder.com/300x200',
        rating: 4.5,
        deliveryTime: '25-35 min',
        cuisine: 'Indian',
        distance: '1.2 km',
        promoted: true,
      },
      {
        id: '2',
        name: 'Dragon Palace',
        image: 'https://via.placeholder.com/300x200',
        rating: 4.3,
        deliveryTime: '30-40 min',
        cuisine: 'Chinese',
        distance: '2.1 km',
      },
      {
        id: '3',
        name: 'Pizza Corner',
        image: 'https://via.placeholder.com/300x200',
        rating: 4.7,
        deliveryTime: '20-30 min',
        cuisine: 'Italian',
        distance: '0.8 km',
      },
    ]);
  }, []);

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           restaurant.cuisine.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderRestaurantCard = (restaurant: Restaurant) => (
    <TouchableOpacity key={restaurant.id} style={styles.restaurantCard}>
      {restaurant.promoted && (
        <View style={styles.promotedBadge}>
          <Text style={styles.promotedText}>PROMOTED</Text>
        </View>
      )}
      <Image source={{ uri: restaurant.image }} style={styles.restaurantImage} />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
        <View style={styles.restaurantMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>{restaurant.rating}</Text>
          </View>
          <Text style={styles.metaText}>• {restaurant.deliveryTime}</Text>
          <Text style={styles.metaText}>• {restaurant.distance}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants or cuisines..."
          placeholderTextColor={theme.colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: selectedCategory === category.id ? category.color : theme.colors.surface }
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={selectedCategory === category.id ? '#FFFFFF' : category.color}
                />
                <Text
                  style={[
                    styles.categoryName,
                    { color: selectedCategory === category.id ? '#FFFFFF' : theme.colors.text }
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Restaurants */}
        <View style={styles.restaurantsContainer}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'Featured Restaurants' : `${categories.find(c => c.id === selectedCategory)?.name || ''} Restaurants`}
          </Text>
          {filteredRestaurants.map(renderRestaurantCard)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
  },
  filterButton: {
    padding: theme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  categoriesContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  categoriesScroll: {
    paddingLeft: theme.spacing.md,
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    minWidth: 80,
  },
  categoryName: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    marginTop: theme.spacing.xs,
  },
  restaurantsContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  restaurantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  promotedBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    zIndex: 1,
  },
  promotedText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold as any,
  },
  restaurantImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  restaurantInfo: {
    padding: theme.spacing.md,
  },
  restaurantName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  restaurantCuisine: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  metaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
});
