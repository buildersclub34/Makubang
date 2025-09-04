
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface VideoItem {
  id: string;
  title: string;
  creator: string;
  restaurant: string;
  likes: number;
  views: number;
  duration: string;
}

const mockVideos: VideoItem[] = [
  {
    id: '1',
    title: 'Ultimate Cheese Burst Pizza',
    creator: '@foodielover',
    restaurant: 'Pizza Corner',
    likes: 2340,
    views: 12500,
    duration: '0:45',
  },
  {
    id: '2',
    title: 'Spicy Korean Ramen Challenge',
    creator: '@spicequeen',
    restaurant: 'Seoul Kitchen',
    likes: 5670,
    views: 28900,
    duration: '1:20',
  },
  {
    id: '3',
    title: 'Perfect Biryani Recipe',
    creator: '@biryanimaster',
    restaurant: 'Hyderabadi House',
    likes: 8920,
    views: 45600,
    duration: '2:15',
  },
];

export default function FeedScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState(new Set());

  const toggleLike = (videoId: string) => {
    const newLikedVideos = new Set(likedVideos);
    if (newLikedVideos.has(videoId)) {
      newLikedVideos.delete(videoId);
    } else {
      newLikedVideos.add(videoId);
    }
    setLikedVideos(newLikedVideos);
  };

  const renderVideoCard = ({ item }: { item: VideoItem }) => (
    <View style={styles.videoCard}>
      <LinearGradient
        colors={['#1A1A1A', '#0D0D0D']}
        style={styles.videoBackground}
      >
        <View style={styles.videoContent}>
          <Text style={styles.videoTitle}>{item.title}</Text>
          <Text style={styles.creatorName}>{item.creator}</Text>
          <Text style={styles.restaurantName}>{item.restaurant}</Text>
        </View>

        <View style={styles.videoActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleLike(item.id)}
          >
            <Ionicons
              name={likedVideos.has(item.id) ? 'heart' : 'heart-outline'}
              size={32}
              color={likedVideos.has(item.id) ? '#FF6B35' : '#FFFFFF'}
            />
            <Text style={styles.actionText}>{item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={32} color="#FFFFFF" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={32} color="#FFFFFF" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.orderButton}>
            <LinearGradient
              colors={['#00D4FF', '#0099CC']}
              style={styles.orderGradient}
            >
              <Text style={styles.orderText}>ORDER NOW</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.videoInfo}>
          <Text style={styles.viewCount}>{item.views.toLocaleString()} views</Text>
          <Text style={styles.duration}>{item.duration}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={mockVideos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height - 100}
        decelerationRate="fast"
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / (height - 100));
          setCurrentIndex(index);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  videoCard: {
    height: height - 100,
    width: width,
  },
  videoBackground: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  videoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  creatorName: {
    fontSize: 16,
    color: '#00D4FF',
    fontWeight: '600',
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  videoActions: {
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  orderButton: {
    marginTop: 20,
  },
  orderGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0099CC',
  },
  orderText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  videoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewCount: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  duration: {
    color: '#CCCCCC',
    fontSize: 12,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
