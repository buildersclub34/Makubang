
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';

const { width } = Dimensions.get('window');

interface FoodVideo {
  id: string;
  title: string;
  thumbnail: string;
  restaurant: string;
  price: number;
  likes: number;
  views: number;
}

export default function FeedScreen() {
  const [videos, setVideos] = useState<FoodVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVideos([
        {
          id: '1',
          title: 'Spicy Butter Chicken',
          thumbnail: 'https://via.placeholder.com/300x400?text=Food+Video',
          restaurant: 'Delhi Darbar',
          price: 299,
          likes: 1.2,
          views: 5.4,
        },
        {
          id: '2',
          title: 'Margherita Pizza',
          thumbnail: 'https://via.placeholder.com/300x400?text=Pizza+Video',
          restaurant: 'Pizza Corner',
          price: 450,
          likes: 2.1,
          views: 8.7,
        },
        {
          id: '3',
          title: 'Biryani Special',
          thumbnail: 'https://via.placeholder.com/300x400?text=Biryani+Video',
          restaurant: 'Hyderabad House',
          price: 350,
          likes: 3.5,
          views: 12.3,
        },
      ]);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.neon.green} />
        <Text style={styles.loadingText}>Loading delicious content...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[theme.colors.background.primary, theme.colors.background.secondary]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Makubang</Text>
          <Text style={styles.headerSubtitle}>Feed Your Cravings</Text>
        </View>

        <View style={styles.videoGrid}>
          {videos.map((video) => (
            <TouchableOpacity key={video.id} style={styles.videoCard}>
              <LinearGradient
                colors={['rgba(0,255,136,0.1)', 'rgba(255,0,128,0.1)']}
                style={styles.cardGradient}
              >
                <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
                
                <View style={styles.videoOverlay}>
                  <TouchableOpacity style={styles.playButton}>
                    <Ionicons name="play" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text style={styles.restaurantName}>
                    {video.restaurant}
                  </Text>
                  
                  <View style={styles.priceContainer}>
                    <LinearGradient
                      colors={[theme.colors.neon.green, theme.colors.neon.blue]}
                      style={styles.priceGradient}
                    >
                      <Text style={styles.priceText}>₹{video.price}</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Ionicons name="heart" size={16} color={theme.colors.neon.pink} />
                      <Text style={styles.statText}>{formatNumber(video.likes)}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="eye" size={16} color={theme.colors.neon.blue} />
                      <Text style={styles.statText}>{formatNumber(video.views)}</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.loadMoreButton}>
          <LinearGradient
            colors={[theme.colors.neon.green, theme.colors.neon.blue]}
            style={styles.loadMoreGradient}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
            <Ionicons name="refresh" size={20} color={theme.colors.text.primary} />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
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
    textShadowColor: theme.colors.neon.green,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
  },
  videoGrid: {
    paddingHorizontal: theme.spacing.md,
  },
  videoCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,255,136,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.neon.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  videoInfo: {
    padding: theme.spacing.md,
  },
  videoTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  restaurantName: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  priceContainer: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  priceGradient: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  priceText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  loadMoreButton: {
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  loadMoreGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  loadMoreText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
  },
});
