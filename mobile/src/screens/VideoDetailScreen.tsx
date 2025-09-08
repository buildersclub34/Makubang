import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

type VideoDetailScreenRouteProp = RouteProp<RootStackParamList, 'VideoDetail'>;

export default function VideoDetailScreen() {
  const route = useRoute<VideoDetailScreenRouteProp>();
  const { videoId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Detail Screen</Text>
      <Text style={styles.subtitle}>Video ID: {videoId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
