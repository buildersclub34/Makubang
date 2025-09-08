import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type FeedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FeedScreen() {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  useEffect(() => {
    // Simulate fetching videos
    setTimeout(() => {
      setVideos([
        { id: '1', title: 'Delicious Pasta', creator: 'Italian Chef' },
        { id: '2', title: 'Sushi Masterclass', creator: 'Sushi Expert' },
        { id: '3', title: 'Burger Special', creator: 'Burger Joint' },
      ]);
      setLoading(false);
    }, 1500);
  }, []);

  const renderItem = ({ item, index }) => (
    <View style={styles.videoContainer}>
      <View style={styles.videoPlaceholder}>
        <Text style={styles.videoTitle}>{item.title}</Text>
        <Text style={styles.videoCreator}>By {item.creator}</Text>
        
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
            onPress={() => {
              navigation.navigate('Comments', { videoId: item.id });
            }}
          >
            <Ionicons name="chatbubble-outline" size={24} color="white" />
            <Text style={styles.actionText}>Comments</Text>
            </TouchableOpacity>
            
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={24} color="white" />
            <Text style={styles.actionText}>Like</Text>
            </TouchableOpacity>
            
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="cart-outline" size={24} color="white" />
            <Text style={styles.actionText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
      </View>
      </View>
    );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading delicious content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={screenHeight}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  videoTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  videoCreator: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 32,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 40,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    marginTop: 8,
  },
});