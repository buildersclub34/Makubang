import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

// Mock data - replace with actual API data
const mockVideos = [
  {
    id: '1',
    uri: 'https://example.com/video1.mp4',
    thumbnail: 'https://example.com/thumbnail1.jpg',
    title: 'Delicious Pasta Carbonara',
    restaurant: 'Italian Bistro',
    likes: 1243,
    comments: 89,
    shares: 45,
  },
  // Add more mock videos as needed
];

const HomeScreen = () => {
  const theme = useTheme();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [videos, setVideos] = useState(mockVideos);
  const videoRefs = useRef({});

  // In a real app, you would fetch videos from your API
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        // const response = await api.get('/videos/feed');
        // setVideos(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching videos:', error);
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const currentIndex = viewableItems[0].index;
      setCurrentVideoIndex(currentIndex);
      
      // Pause all videos
      Object.values(videoRefs.current).forEach((video: any) => {
        if (video && typeof video.pauseAsync === 'function') {
          video.pauseAsync();
        }
      });
      
      // Play current video
      if (videoRefs.current[currentIndex]) {
        videoRefs.current[currentIndex].playAsync();
        setIsPlaying(true);
      }
    }
  }).current;

  const handleVideoPress = async () => {
    if (videoRefs.current[currentVideoIndex]) {
      if (isPlaying) {
        await videoRefs.current[currentVideoIndex].pauseAsync();
      } else {
        await videoRefs.current[currentVideoIndex].playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderVideoItem = ({ item, index }) => (
    <View style={styles.videoContainer}>
      <Video
        ref={(ref) => (videoRefs.current[index] = ref)}
        source={{ uri: item.uri }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={index === 0}
        isLooping
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={(error) => {
          console.error('Video error:', error);
          setIsLoading(false);
        }}
      />
      
      {isLoading && index === currentVideoIndex && (
        <ActivityIndicator 
          style={styles.loader} 
          size="large" 
          color={theme.colors.primary} 
        />
      )}
      
      {!isPlaying && index === currentVideoIndex && (
        <View style={styles.playButton}>
          <Ionicons name="play" size={48} color="white" />
        </View>
      )}
      
      <View style={styles.videoInfoContainer}>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{item.title}</Text>
          <Text style={styles.restaurantName}>{item.restaurant}</Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={32} color="white" />
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={32} color="white" />
            <Text style={styles.actionText}>{item.comments}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-social-outline" size={32} color="white" />
            <Text style={styles.actionText}>{item.shares}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading && videos.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        horizontal={false}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width,
    height,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  restaurantName: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  actionButtons: {
    alignItems: 'center',
    marginLeft: 16,
  },
  actionButton: {
    marginBottom: 20,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
});

export default HomeScreen;
