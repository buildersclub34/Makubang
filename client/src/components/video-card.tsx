import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share, ShoppingBag, Play } from "lucide-react";

interface VideoCardProps {
  video: any;
  onLike: () => void;
  onOrder: () => void;
  isActive: boolean;
}

export default function VideoCard({ video, onLike, onOrder, isActive }: VideoCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-gradient-to-br from-orange-400 to-red-600">
      {/* Video Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${video.thumbnailUrl || "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=700&fit=crop"})`
        }}
      />
      
      {/* Video Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      
      {/* Play Icon (when not active) */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 rounded-full p-4">
            <Play className="w-8 h-8 text-white fill-current" />
          </div>
        </div>
      )}
      
      {/* Video Controls */}
      <div className="absolute right-4 bottom-20 z-10">
        <div className="flex flex-col space-y-6 text-white">
          {/* Like Button */}
          <button 
            className="flex flex-col items-center space-y-1 transition-colors"
            onClick={handleLike}
            data-testid="button-like"
          >
            <Heart 
              className={`w-8 h-8 ${isLiked ? 'fill-current text-red-500' : 'text-white hover:text-red-500'}`} 
            />
            <span className="text-xs">{(video.likes || 0) + (isLiked ? 1 : 0)}</span>
          </button>
          
          {/* Comment Button */}
          <button 
            className="flex flex-col items-center space-y-1 text-white hover:text-accent transition-colors"
            data-testid="button-comment"
          >
            <MessageCircle className="w-8 h-8" />
            <span className="text-xs">{video.comments || 0}</span>
          </button>
          
          {/* Share Button */}
          <button 
            className="flex flex-col items-center space-y-1 text-white hover:text-accent transition-colors"
            onClick={handleShare}
            data-testid="button-share"
          >
            <Share className="w-8 h-8" />
            <span className="text-xs">Share</span>
          </button>
          
          {/* Order Now Button */}
          <Button 
            className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white px-4 py-3 rounded-full text-sm font-semibold shadow-lg transform transition-all hover:scale-105"
            onClick={onOrder}
            data-testid="button-order-now"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Order Now
          </Button>
        </div>
      </div>
      
      {/* Video Information */}
      <div className="absolute bottom-4 left-4 right-20 text-white">
        <div className="space-y-2">
          {/* Creator Info */}
          <div className="flex items-center space-x-3">
            <img 
              src={video.creator?.profileImageUrl || "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=40&h=40&fit=crop&crop=face"} 
              alt="Creator" 
              className="w-10 h-10 rounded-full border-2 border-white object-cover" 
            />
            <div>
              <p className="font-semibold text-sm">@{video.creator?.firstName || "creator"}</p>
              <p className="text-xs text-gray-300">{video.creator?.followersCount || 0} followers</p>
            </div>
            <Badge className="bg-gradient-to-r from-accent to-teal-400 text-accent-foreground px-2 py-1 rounded-full text-xs font-medium">
              Verified
            </Badge>
          </div>
          
          {/* Video Description */}
          <p className="text-sm line-clamp-2">{video.description}</p>
          
          {/* Restaurant Tag */}
          <div className="flex items-center space-x-2 bg-black/30 rounded-full px-3 py-1 w-fit">
            <span className="text-xs font-medium">{video.restaurant?.name || "Restaurant"}</span>
            <span className="text-xs text-accent">₹{video.price || "299"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
