import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const useVideo = (videoId) => {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Fetch video data
  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/videos/${videoId}`, {
        headers: {
          Authorization: user ? `Bearer ${user.token}` : ''
        }
      });
      setVideo(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching video:', err);
      setError({
        message: err.response?.data?.message || 'Failed to load video. Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Like a video
  const likeVideo = async () => {
    try {
      await api.post(
        `/videos/${videoId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      return true;
    } catch (err) {
      console.error('Error liking video:', err);
      throw err;
    }
  };

  // Dislike a video
  const dislikeVideo = async () => {
    try {
      await api.post(
        `/videos/${videoId}/dislike`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      return true;
    } catch (err) {
      console.error('Error disliking video:', err);
      throw err;
    }
  };

  // Add a comment
  const addComment = async (commentText) => {
    try {
      const response = await api.post(
        `/videos/${videoId}/comments`,
        { text: commentText },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          }
        }
      );
      return response.data;
    } catch (err) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (videoId) {
      fetchVideo();
    }
  }, [videoId]);

  return {
    video,
    loading,
    error,
    likeVideo,
    dislikeVideo,
    addComment,
    refreshVideo: fetchVideo
  };
};

export default useVideo;
