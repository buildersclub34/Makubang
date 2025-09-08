import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface VideoActionsProps {
  video: {
    _id: string;
    ownerId: string;
    ownerName: string;
    ownerAvatar: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isLiked: boolean;
  };
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onAddToCart: () => void;
}

export default function VideoActions({
  video,
  onLike,
  onComment,
  onShare,
  onAddToCart,
}: VideoActionsProps) {
  const likeScale = useSharedValue(1);

  const handleLike = () => {
    // Animate like button
    likeScale.value = withSpring(1.2, {}, () => {
      likeScale.value = withSpring(1);
    });
    onLike();
  };

  const animatedLikeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <View style={styles.container}>
      {/* Creator Avatar */}
      <TouchableOpacity style={styles.avatarContainer}>
        <Image
          source={{
            uri: video.ownerAvatar || 'https://via.placeholder.com/50x50?text=U',
          }}
          style={styles.avatar}
        />
        <View style={styles.followButton}>
          <Ionicons name="add" size={16} color="white" />
        </View>
      </TouchableOpacity>

      {/* Like Button */}
      <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
        <Animated.View style={animatedLikeStyle}>
          <Ionicons
            name={video.isLiked ? 'heart' : 'heart-outline'}
            size={32}
            color={video.isLiked ? '#FF3040' : 'white'}
          />
        </Animated.View>
        <Text style={styles.actionText}>{formatCount(video.likesCount)}</Text>
      </TouchableOpacity>

      {/* Comment Button */}
      <TouchableOpacity style={styles.actionButton} onPress={onComment}>
        <Ionicons name="chatbubble-outline" size={28} color="white" />
        <Text style={styles.actionText}>{formatCount(video.commentsCount)}</Text>
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity style={styles.actionButton} onPress={onShare}>
        <Ionicons name="paper-plane-outline" size={28} color="white" />
        <Text style={styles.actionText}>{formatCount(video.sharesCount)}</Text>
      </TouchableOpacity>

      {/* Add to Cart Button */}
      <TouchableOpacity style={styles.cartButton} onPress={onAddToCart}>
        <View style={styles.cartButtonContent}>
          <Ionicons name="cart" size={24} color="white" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 140,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  followButton: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  cartButton: {
    marginTop: 8,
  },
  cartButtonContent: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
