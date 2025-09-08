import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import VideoActions from '../components/VideoActions';
import CommentModal from '../components/CommentModal';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface VideoItem {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  restaurant: {
    _id: string;
    name: string;
    rating: number;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  price: number;
  isLiked: boolean;
  tags: string[];
}

export default function VideoFeedScreen() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const queryClient = useQueryClient();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [swipeValue] = useState(new Animated.Value(0));
  
  const flatListRef = useRef<FlatList>(null);

  // Fetch personalized feed
  const { data: feedData, isLoading } = useQuery({
    queryKey: ['feed', 'personalized'],
    queryFn: async () => {
      const response = await fetch('/api/feed/personalized', {
        credentials: 'include',
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const videos = feedData?.items || [];

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await fetch(`/api/engagement/videos/${videoId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  // Handle swipe gestures
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: swipeValue } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (translationX > 100) {
        // Swipe right - instant buy
        handleInstantBuy(videos[currentIndex]);
      } else if (translationX < -100) {
        // Swipe left - add to cart
        handleAddToCart(videos[currentIndex]);
      }
      
      // Reset animation
      Animated.spring(swipeValue, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleLike = (video: VideoItem) => {
    likeMutation.mutate(video._id);
  };

  const handleComment = (video: VideoItem) => {
    setSelectedVideo(video);
    setShowComments(true);
  };

  const handleShare = (video: VideoItem) => {
    // Implement sharing functionality
    Alert.alert('Share', `Share ${video.title}`);
  };

  const handleAddToCart = (video: VideoItem) => {
    addToCart({
      menuItemId: video._id,
      name: video.title,
      price: video.price,
      restaurantId: video.restaurant._id,
      restaurantName: video.restaurant.name,
      image: video.thumbnailUrl,
    });
    
    Alert.alert('Added to Cart! 🛒', `${video.title} has been added to your cart`);
  };

  const handleInstantBuy = (video: VideoItem) => {
    // Navigate to instant checkout
    Alert.alert('Instant Buy! 🚀', `Quick order for ${video.title}`);
  };

  const renderVideoItem = ({ item, index }: { item: VideoItem; index: number }) => {
    const isActive = index === currentIndex;
    
    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.videoContainer,
            {
              transform: [
                {
                  translateX: swipeValue.interpolate({
                    inputRange: [-200, -100, 0, 100, 200],
                    outputRange: [-50, -25, 0, 25, 50],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          <Video
            source={{ uri: item.videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive}
            isLooping
            isMuted={false}
          />

          {/* Swipe Indicators */}
          <Animated.View
            style={[
              styles.swipeIndicatorLeft,
              {
                opacity: swipeValue.interpolate({
                  inputRange: [-100, 0],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <View style={styles.swipeIndicator}>
              <Ionicons name="cart" size={24} color="white" />
              <Text style={styles.swipeText}>Add to Cart</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.swipeIndicatorRight,
              {
                opacity: swipeValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <View style={styles.swipeIndicator}>
              <Ionicons name="flash" size={24} color="white" />
              <Text style={styles.swipeText}>Instant Buy</Text>
            </View>
          </Animated.View>

          {/* Video Info Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          >
            <View style={styles.videoInfo}>
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{item.restaurant.name}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.rating}>{item.restaurant.rating}</Text>
                </View>
              </View>
              
              <Text style={styles.videoTitle}>{item.title}</Text>
              <Text style={styles.videoDescription} numberOfLines={2}>
                {item.description}
              </Text>
              
              <View style={styles.priceContainer}>
                <Text style={styles.price}>₹{item.price}</Text>
                <TouchableOpacity
                  style={styles.orderButton}
                  onPress={() => handleInstantBuy(item)}
                >
                  <Text style={styles.orderButtonText}>Order Now</Text>
                </TouchableOpacity>
              </View>

              {/* Tags */}
              <View style={styles.tagsContainer}>
                {item.tags.slice(0, 3).map((tag, tagIndex) => (
                  <View key={tagIndex} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>

          {/* Action Buttons */}
          <VideoActions
            video={item}
            onLike={() => handleLike(item)}
            onComment={() => handleComment(item)}
            onShare={() => handleShare(item)}
            onAddToCart={() => handleAddToCart(item)}
          />

          {/* Swipe Hint */}
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>← Cart | Buy →</Text>
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading delicious videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item._id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / screenHeight);
          setCurrentIndex(index);
        }}
        getItemLayout={(data, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
      />

      {/* Comment Modal */}
      <CommentModal
        visible={showComments}
        video={selectedVideo}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoContainer: {
    height: screenHeight,
    width: screenWidth,
    position: 'relative',
  },
  video: {
    height: '100%',
    width: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: 'white',
    fontSize: 14,
    marginLeft: 4,
  },
  videoTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  price: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
  },
  orderButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  orderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: 'white',
    fontSize: 12,
  },
  swipeIndicatorLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -25 }],
  },
  swipeIndicatorRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -25 }],
  },
  swipeIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  swipeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
});
