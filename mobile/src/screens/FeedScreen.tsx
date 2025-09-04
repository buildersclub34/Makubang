
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  creator: {
    id: string;
    name: string;
    profilePicture: string;
    isVerified: boolean;
  };
  restaurant?: {
    id: string;
    name: string;
    cuisine: string;
  };
  menuItems?: Array<{
    id: string;
    name: string;
    price: number;
    image: string;
  }>;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export default function FeedScreen() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/videos?type=trending&limit=20');
      setVideos(response.data.videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (videoId: string) => {
    try {
      await api.post(`/videos/${videoId}/like`);
      
      setLiked(prev => {
        const newLiked = new Set(prev);
        if (newLiked.has(videoId)) {
          newLiked.delete(videoId);
        } else {
          newLiked.add(videoId);
        }
        return newLiked;
      });

      // Update video like count locally
      setVideos(prev => prev.map(video => 
        video.id === videoId 
          ? { 
              ...video, 
              likeCount: liked.has(videoId) 
                ? video.likeCount - 1 
                : video.likeCount + 1 
            }
          : video
      ));
    } catch (error) {
      console.error('Error liking video:', error);
      Alert.alert('Error', 'Failed to like video');
    }
  };

  const handleAddToCart = (menuItem: any) => {
    Alert.alert(
      'Add to Cart',
      `Add ${menuItem.name} (₹${menuItem.price}) to cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add', 
          onPress: () => {
            // Implement add to cart logic
            console.log('Adding to cart:', menuItem);
          }
        },
      ]
    );
  };

  const handleInstantOrder = (video: VideoItem) => {
    if (!video.menuItems || video.menuItems.length === 0) {
      Alert.alert('No Menu', 'This video doesn\'t have any menu items linked');
      return;
    }

    Alert.alert(
      'Instant Order',
      `Order ${video.menuItems[0].name} from ${video.restaurant?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Order Now', 
          onPress: () => {
            // Implement instant order logic
            console.log('Instant order:', video.menuItems[0]);
          }
        },
      ]
    );
  };

  const renderVideoItem = ({ item }: { item: VideoItem }) => (
    <View style={styles.videoContainer}>
      <Video
        source={{ uri: item.videoUrl }}
        style={styles.video}
        shouldPlay={videos.indexOf(item) === currentIndex}
        isLooping
        resizeMode="cover"
        useNativeControls={false}
      />
      
      {/* Video Info Overlay */}
      <View style={styles.overlay}>
        <View style={styles.leftContent}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.creator}>@{item.creator.name}</Text>
          {item.restaurant && (
            <Text style={styles.restaurant}>📍 {item.restaurant.name}</Text>
          )}
        </View>
        
        {/* Action Buttons */}
        <View style={styles.rightActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Ionicons 
              name={liked.has(item.id) ? "heart" : "heart-outline"} 
              size={32} 
              color={liked.has(item.id) ? "#ff4757" : "white"} 
            />
            <Text style={styles.actionText}>{item.likeCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={32} color="white" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={32} color="white" />
            <Text style={styles.actionText}>{item.shareCount}</Text>
          </TouchableOpacity>
          
          {item.menuItems && item.menuItems.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.cartButton}
                onPress={() => handleAddToCart(item.menuItems![0])}
              >
                <Ionicons name="basket-outline" size={24} color="white" />
                <Text style={styles.cartText}>Add</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.orderButton}
                onPress={() => handleInstantOrder(item)}
              >
                <Ionicons name="flash" size={24} color="white" />
                <Text style={styles.orderText}>Order</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      {/* Menu Items Preview */}
      {item.menuItems && item.menuItems.length > 0 && (
        <View style={styles.menuPreview}>
          <Text style={styles.menuTitle}>Available Items:</Text>
          {item.menuItems.slice(0, 2).map((menuItem, index) => (
            <View key={menuItem.id} style={styles.menuItem}>
              <Text style={styles.menuItemName}>{menuItem.name}</Text>
              <Text style={styles.menuItemPrice}>₹{menuItem.price}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading delicious content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        getItemLayout={(data, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
  },
  videoContainer: {
    height: screenHeight,
    width: screenWidth,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  creator: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  restaurant: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '500',
  },
  rightActions: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  cartButton: {
    backgroundColor: 'rgba(255, 165, 0, 0.8)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderButton: {
    backgroundColor: 'rgba(255, 69, 87, 0.8)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuPreview: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 12,
  },
  menuTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuItemName: {
    color: 'white',
    fontSize: 12,
    flex: 1,
  },
  menuItemPrice: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
