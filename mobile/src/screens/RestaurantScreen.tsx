import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme, Button, Divider } from 'react-native-paper';
import { Video } from 'expo-av';
import MapView, { Marker } from 'react-native-maps';
import { restaurants } from '../services/api';

const { width } = Dimensions.get('window');

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

interface Restaurant {
  id: string;
  name: string;
  description: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  cuisine: string[];
  address: string;
  phone: string;
  openingHours: string;
  images: string[];
  menu: MenuItem[];
  location: {
    latitude: number;
    longitude: number;
  };
  isOpen: boolean;
  isFavorite: boolean;
}

const RestaurantScreen = () => {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('menu');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<{item: MenuItem; quantity: number}[]>([]);
  
  const categories = ['all', 'popular', 'main', 'sides', 'drinks', 'desserts'];

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        // In a real app, you would fetch the restaurant data from your API
        // const response = await restaurants.getById(id);
        // setRestaurant(response.data);
        
        // Mock data for now
        setRestaurant({
          id: '1',
          name: 'Burger Palace',
          description: 'Delicious burgers made with 100% organic beef and fresh ingredients. Our secret sauce will make you come back for more!',
          rating: 4.7,
          deliveryTime: '20-30 min',
          deliveryFee: 2.99,
          minOrder: 10,
          cuisine: ['Burgers', 'American', 'Fast Food'],
          address: '123 Food Street, Cuisine City',
          phone: '+1 234 567 8900',
          openingHours: '9:00 AM - 11:00 PM',
          isOpen: true,
          isFavorite: false,
          location: {
            latitude: 37.78825,
            longitude: -122.4324,
          },
          images: [
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
          ],
          menu: [
            {
              id: '101',
              name: 'Classic Burger',
              description: 'Beef patty with lettuce, tomato, onion, pickles, and special sauce',
              price: 8.99,
              image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
              category: 'popular'
            },
            // Add more menu items...
          ],
        });
      } catch (error) {
        console.error('Error fetching restaurant:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  const toggleFavorite = () => {
    if (restaurant) {
      setRestaurant({ ...restaurant, isFavorite: !restaurant.isFavorite });
    }
  };

  const shareRestaurant = async () => {
    try {
      await Share.share({
        message: `Check out ${restaurant?.name} on Makubang! ${restaurant?.description.substring(0, 100)}...`,
        url: `https://makubang.com/restaurants/${id}`,
        title: restaurant?.name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.item.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(cartItem =>
          cartItem.item.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prevCart.filter(cartItem => cartItem.item.id !== itemId);
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);

  if (loading || !restaurant) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: restaurant.images[0] }} 
            style={styles.headerImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          {/* Favorite Button */}
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={toggleFavorite}
          >
            <Ionicons 
              name={restaurant.isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={restaurant.isFavorite ? theme.colors.error : "white"} 
            />
          </TouchableOpacity>
          
          {/* Share Button */}
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={shareRestaurant}
          >
            <Ionicons name="share-social-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Restaurant Info */}
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{restaurant.rating}</Text>
            </View>
          </View>
          
          <Text style={styles.cuisineText}>{restaurant.cuisine.join(' • ')}</Text>
          
          <View style={styles.deliveryInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.infoText}>{restaurant.deliveryTime}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="bicycle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.infoText}>${restaurant.deliveryFee} delivery</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons 
                name={restaurant.isOpen ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={restaurant.isOpen ? theme.colors.success : theme.colors.error} 
              />
              <Text style={[
                styles.infoText, 
                { color: restaurant.isOpen ? theme.colors.success : theme.colors.error }
              ]}>
                {restaurant.isOpen ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.description}>{restaurant.description}</Text>
          
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {['menu', 'info', 'reviews'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text 
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Tab Content */}
          {activeTab === 'menu' && (
            <View style={styles.menuContainer}>
              {/* Category Tabs */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoryTabs}
                contentContainerStyle={styles.categoryTabsContent}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryTab,
                      selectedCategory === category && styles.selectedCategoryTab,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text 
                      style={[
                        styles.categoryTabText,
                        selectedCategory === category && styles.selectedCategoryTabText,
                      ]}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Menu Items */}
              {restaurant.menu.map((item) => (
                <View key={item.id} style={styles.menuItem}>
                  <Image 
                    source={{ uri: item.image }} 
                    style={styles.menuItemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    <Text style={styles.menuItemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => addToCart(item)}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          {activeTab === 'info' && (
            <View style={styles.infoTab}>
              <View style={styles.infoSection}>
                <Ionicons name="location-outline" size={24} color={theme.colors.primary} />
                <View style={styles.infoSectionText}>
                  <Text style={styles.infoSectionTitle}>Address</Text>
                  <Text style={styles.infoSectionContent}>{restaurant.address}</Text>
                </View>
              </View>
              
              <View style={styles.infoSection}>
                <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                <View style={styles.infoSectionText}>
                  <Text style={styles.infoSectionTitle}>Opening Hours</Text>
                  <Text style={styles.infoSectionContent}>{restaurant.openingHours}</Text>
                </View>
              </View>
              
              <View style={styles.infoSection}>
                <Ionicons name="call-outline" size={24} color={theme.colors.primary} />
                <View style={styles.infoSectionText}>
                  <Text style={styles.infoSectionTitle}>Phone</Text>
                  <Text style={styles.infoSectionContent}>{restaurant.phone}</Text>
                </View>
              </View>
              
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: restaurant.location.latitude,
                    longitude: restaurant.location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: restaurant.location.latitude,
                      longitude: restaurant.location.longitude,
                    }}
                    title={restaurant.name}
                    description={restaurant.address}
                  >
                    <View style={styles.marker}>
                      <Ionicons name="restaurant" size={24} color="white" />
                    </View>
                  </Marker>
                </MapView>
              </View>
            </View>
          )}
          
          {activeTab === 'reviews' && (
            <View style={styles.reviewsTab}>
              <View style={styles.ratingOverview}>
                <Text style={styles.overallRating}>{restaurant.rating}</Text>
                <View>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= Math.floor(restaurant.rating) ? 'star' : 'star-outline'}
                        size={20}
                        color="#FFD700"
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingCount}>Based on 128 reviews</Text>
                </View>
              </View>
              
              {/* Reviews list would go here */}
              <View style={styles.noReviews}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.colors.placeholder} />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>Be the first to review this restaurant</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Bottom spacing for the cart button */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Cart Button */}
      {totalItems > 0 && (
        <TouchableOpacity 
          style={[styles.cartButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push(`/checkout?restaurantId=${restaurant.id}`)}
        >
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{totalItems}</Text>
          </View>
          <Text style={styles.cartButtonText}>View Cart • ${subtotal.toFixed(2)}</Text>
          <Text style={styles.cartButtonSubtext}>{totalItems} {totalItems === 1 ? 'item' : 'items'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    padding: 16,
    marginTop: -20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '600',
    color: '#333',
  },
  cuisineText: {
    color: '#666',
    marginBottom: 12,
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  description: {
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  menuContainer: {
    paddingBottom: 24,
  },
  categoryTabs: {
    marginVertical: 12,
  },
  categoryTabsContent: {
    paddingHorizontal: 4,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  selectedCategoryTab: {
    backgroundColor: '#FF6B6B',
  },
  categoryTabText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedCategoryTabText: {
    color: 'white',
  },
  menuItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    alignItems: 'center',
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontWeight: '700',
    color: '#FF6B6B',
    fontSize: 16,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: -2,
  },
  infoTab: {
    paddingVertical: 8,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  infoSectionText: {
    marginLeft: 12,
    flex: 1,
  },
  infoSectionTitle: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  infoSectionContent: {
    color: '#666',
    lineHeight: 20,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 20,
  },
  reviewsTab: {
    paddingVertical: 8,
  },
  ratingOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  overallRating: {
    fontSize: 48,
    fontWeight: 'bold',
    marginRight: 16,
    color: '#333',
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ratingCount: {
    color: '#999',
    fontSize: 12,
  },
  noReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noReviewsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#333',
  },
  noReviewsSubtext: {
    color: '#999',
    marginTop: 4,
  },
  cartButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cartButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
});

export default RestaurantScreen;
