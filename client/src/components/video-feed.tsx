import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import VideoCard from "./video-card";
import CommentsPanel from "./comments-panel";
import OrderModal from "./order-modal";
import NotificationPopup from "./notification-popup";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function VideoFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { data: feed = { items: [] }, isLoading } = useQuery({
    queryKey: ["/api/feed/personalized"],
    queryFn: async () => {
      const response = await fetch("/api/feed/personalized", { credentials: "include" });
      return response.json();
    },
  });
  const videos = feed?.items || [];

  const recordViewMutation = useMutation({
    mutationFn: async ({ videoId, restaurantId, watchTime }: any) => {
      return apiRequest("POST", `/api/videos/${videoId}/view`, {
        userId: user?.id,
        restaurantId,
        watchTime,
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async ({ videoId }: any) => {
      return apiRequest("POST", `/api/engagement/videos/${videoId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/personalized"] });
    },
  });

  // Handle scroll to track current video
  useEffect(() => {
    const handleScroll = () => {
      const viewportHeight = window.innerHeight;
      let currentIndex = 0;
      
      for (let i = 0; i < videoRefs.current.length; i++) {
        const videoElement = videoRefs.current[i];
        if (videoElement) {
          const rect = videoElement.getBoundingClientRect();
          const videoCenter = rect.top + rect.height / 2;
          
          if (videoCenter >= 0 && videoCenter <= viewportHeight) {
            currentIndex = i;
            break;
          }
        }
      }
      
      if (currentIndex !== currentVideoIndex) {
        setCurrentVideoIndex(currentIndex);
        const video = videos[currentIndex];
        if (video && user) {
          recordViewMutation.mutate({
            videoId: video.id,
            restaurantId: video.restaurantId,
            watchTime: 5, // Assume 5 seconds watch time for demo
          });
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentVideoIndex, videos, user, recordViewMutation]);

  const handleLike = (video: any) => {
    likeMutation.mutate({ videoId: video._id || video.id });
  };

  const handleOrder = (video: any) => {
    setSelectedVideo(video);
    setShowOrderModal(true);
  };

  const handleOrderComplete = () => {
    setShowOrderModal(false);
    setSelectedVideo(null);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[9/16] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-md mx-auto">
        {videos.map((video: any, index: number) => (
          <div
            key={video._id || video.id}
            ref={(el) => (videoRefs.current[index] = el)}
            className="mb-4"
          >
            <VideoCard
              video={video}
              onLike={() => handleLike(video)}
              onOrder={() => handleOrder(video)}
              isActive={index === currentVideoIndex}
            />
          </div>
          <CommentsPanel videoId={video._id || video.id} />
        ))}
      </div>

      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        video={selectedVideo}
        onOrderComplete={handleOrderComplete}
      />

      <NotificationPopup
        isVisible={showNotification}
        message="Order confirmed! Your food is being prepared."
        onClose={() => setShowNotification(false)}
      />
    </>
  );
}
