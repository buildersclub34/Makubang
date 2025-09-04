
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Alert,
  RefreshControl,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { websocketService } from '../services/websocket';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface VideoData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    profilePicture?: string;
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
    image?: string;
  }>;
}

interface FeedScreenProps {
  route?: {
    params?: {
      initialVideoId?: string;
    };
  };
}

export default function FeedScreen({ route }: FeedScreenProps) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<{ [key: string]: Video }>({});
  const swipeGesture = useRef(new Animated.Value(0)).current;

  // Pan responder for swipe gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 50;
    },
    onPanResponderMove: (_, gestureState) => {
      swipeGesture.setValue(gestureState.dx);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 100) {
        // Swipe right - show order modal
        handleSwipeRight(videos[currentVideoIndex]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (gestureState.dx < -100) {
        // Swipe left - add to cart
        handleSwipeLeft(videos[currentVideoIndex]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      Animated.spring(swipeGesture, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  });

  useEffect(() => {
    loadVideos();
    setupWebSocket();
    
    return () => {
      // Pause all videos on unmount
      Object.values(videoRefs.current).forEach(video => {
        video?.pauseAsync();
      });
    };
  }, []);

  useEffect(() => {
    // Handle deep link to specific video
    if (route?.params?.initialVideoId && videos.length > 0) {
      const videoIndex = videos.findIndex(v => v.id === route.params.initialVideoId);
      if (videoIndex !== -1) {
        setCurrentVideoIndex(videoIndex);
        flatListRef.current?.scrollToIndex({ index: videoIndex, animated: false });
      }
    }
  }, [videos, route?.params?.initialVideoId]);

  const setupWebSocket = () => {
    if (user) {
      websocketService.connect();
      
      // Listen for real-time updates
      websocketService.on('video_liked', (data) => {
        setVideos(prev => prev.map(video => 
          video.id === data.videoId 
            ? { ...video, likeCount: data.likeCount }
            : video
        ));
      });

      websocketService.on('new_video', (data) => {
        // Add new video to feed if it matches user's preferences
        setVideos(prev => [data.video, ...prev]);
      });
    }
  };

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/videos?type=trending&limit=20');
      
      if (response.data?.videos) {
        setVideos(response.data.videos);
        
        // Load user's liked videos
        if (user) {
          const likedResponse = await api.get('/users/profile/liked-videos');
          if (likedResponse.data?.likedVideoIds) {
            setLikedVideos(new Set(likedResponse.data.likedVideoIds));
          }
        }
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  };

  const handleVideoPress = async (videoId: string) => {
    try {
      // Track video view
      await api.post(`/videos/${videoId}/view`);
      
      // Update view count in local state
      setVideos(prev => prev.map(video => 
        video.id === videoId 
          ? { ...video, viewCount: video.viewCount + 1 }
          : video
      ));
    } catch (error) {
      console.error('Error tracking video view:', error);
    }
  };

  const handleLikePress = async (videoId: string) => {
    try {
      const isLiked = likedVideos.has(videoId);
      
      // Optimistic update
      setLikedVideos(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(videoId);
        } else {
          newSet.add(videoId);
        }
        return newSet;
      });

      setVideos(prev => prev.map(video => 
        video.id === videoId 
          ? { 
              ...video, 
              likeCount: video.likeCount + (isLiked ? -1 : 1)
            }
          : video
      ));

      await api.post(`/videos/${videoId}/like`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error liking video:', error);
      // Revert optimistic update
      setLikedVideos(prev => {
        const newSet = new Set(prev);
        const isLiked = likedVideos.has(videoId);
        if (isLiked) {
          newSet.add(videoId);
        } else {
          newSet.delete(videoId);
        }
        return newSet;
      });
    }
  };

  const handleSwipeLeft = async (video: VideoData) => {
    if (video.menuItems && video.menuItems.length > 0) {
      try {
        // Add first menu item to cart (simplified)
        const menuItem = video.menuItems[0];
        await api.post('/cart/add', {
          menuItemId: menuItem.id,
          quantity: 1,
          restaurantId: video.restaurant?.id,
        });
        
        Alert.alert('Added to Cart', `${menuItem.name} has been added to your cart!`);
      } catch (error) {
        console.error('Error adding to cart:', error);
        Alert.alert('Error', 'Failed to add item to cart');
      }
    }
  };

  const handleSwipeRight = (video: VideoData) => {
    if (video.menuItems && video.menuItems.length > 0) {
      setSelectedVideo(video);
      setShowOrderModal(true);
    } else {
      Alert.alert('No Menu Available', 'This video does not have any menu items linked.');
    }
  };

  const handleShare = async (video: VideoData) => {
    try {
      // Implement sharing functionality
      const shareUrl = `https://makubang.com/videos/${video.id}`;
      
      // Update share count
      await api.post(`/videos/${video.id}/share`);
      setVideos(prev => prev.map(v => 
        v.id === video.id 
          ? { ...v, shareCount: v.shareCount + 1 }
          : v
      ));
      
      // Open share dialog (platform specific)
      Alert.alert('Share Video', `Share this video: ${shareUrl}`);
    } catch (error) {
      console.error('Error sharing video:', error);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const currentIndex = viewableItems[0].index;
      setCurrentVideoIndex(currentIndex);
      
      // Pause all videos except the current one
      Object.entries(videoRefs.current).forEach(([videoId, video]) => {
        if (videos[currentIndex]?.id === videoId) {
          video?.playAsync();
        } else {
          video?.pauseAsync();
        }
      });
    }
  }).current;

  const renderVideoItem = ({ item, index }: { item: VideoData; index: number }) => {
    const isLiked = likedVideos.has(item.id);

    return (
      <View style={styles.videoContainer} {...panResponder.panHandlers}>
        <Animated.View 
          style={[
            styles.videoWrapper,
            {
              transform: [
                {
                  translateX: currentVideoIndex === index ? swipeGesture : 0
                }
              ]
            }
          ]}
        >
          <Video
            ref={(ref) => {
              if (ref) videoRefs.current[item.id] = ref;
            }}
            style={styles.video}
            source={{ uri: item.videoUrl }}
            shouldPlay={currentVideoIndex === index}
            isLooping
            isMuted={muted}
            resizeMode="cover"
            posterSource={{ uri: item.thumbnailUrl }}
            onLoad={() => handleVideoPress(item.id)}
          />
          
          {/* Video overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.overlay}
          />
          
          {/* Content info */}
          <View style={styles.contentInfo}>
            <View style={styles.creatorInfo}>
              <TouchableOpacity style={styles.creatorProfile}>
                {item.creator.profilePicture ? (
                  <Image 
                    source={{ uri: item.creator.profilePicture }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.defaultProfile}>
                    <Text style={styles.defaultProfileText}>
                      {item.creator.name[0]}
                    </Text>
                  </View>
                )}
                {item.creator.isVerified && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={16} 
                    color="#3B82F6" 
                    style={styles.verifiedIcon}
                  />
                )}
              </TouchableOpacity>
              
              <View style={styles.creatorDetails}>
                <Text style={styles.creatorName}>{item.creator.name}</Text>
                {item.restaurant && (
                  <Text style={styles.restaurantInfo}>
                    {item.restaurant.name} • {item.restaurant.cuisine}
                  </Text>
                )}
              </View>
            </View>
            
            <Text style={styles.videoTitle}>{item.title}</Text>
            <Text style={styles.videoDescription} numberOfLines={2}>
              {item.description}
            </Text>
            
            {item.menuItems && item.menuItems.length > 0 && (
              <View style={styles.menuPreview}>
                <Text style={styles.menuPreviewText}>
                  🍽️ {item.menuItems.length} item{item.menuItems.length > 1 ? 's' : ''} available
                </Text>
                <Text style={styles.swipeHint}>
                  ← Swipe to order • Add to cart →
                </Text>
              </View>
            )}
          </View>
          
          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setMuted(!muted)}
            >
              <Ionicons 
                name={muted ? "volume-mute" : "volume-high"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleLikePress(item.id)}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={28} 
                color={isLiked ? "#FF6B6B" : "white"} 
              />
              <Text style={styles.actionButtonText}>
                {item.likeCount > 0 ? item.likeCount : ''}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Comments', { videoId: item.id })}
            >
              <Ionicons name="chatbubble-outline" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleShare(item)}
            >
              <Ionicons name="share-outline" size={24} color="white" />
              <Text style={styles.actionButtonText}>
                {item.shareCount > 0 ? item.shareCount : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  };

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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="white"
          />
        }
        getItemLayout={(data, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
      />
      
      {/* Order Modal would go here */}
      {/* Implement order modal component */}
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
    fontSize: 16,
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight,
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  contentInfo: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 80,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorProfile: {
    position: 'relative',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  defaultProfile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  defaultProfileText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  verifiedIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  creatorDetails: {
    marginLeft: 12,
  },
  creatorName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  restaurantInfo: {
    color: '#CCC',
    fontSize: 12,
  },
  videoTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoDescription: {
    color: '#CCC',
    fontSize: 14,
    lineHeight: 18,
  },
  menuPreview: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
  },
  menuPreviewText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  swipeHint: {
    color: '#CCC',
    fontSize: 10,
    marginTop: 2,
  },
  actionButtons: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
  },
});
