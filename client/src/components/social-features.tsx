
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Heart, 
  MessageCircle, 
  Share2, 
  TrendingUp,
  Crown,
  MapPin,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  followers: number;
  following: number;
  bio?: string;
  location?: string;
  joinedDate: string;
  isFollowing?: boolean;
}

interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'like' | 'comment' | 'share' | 'order' | 'follow';
  targetType: 'video' | 'restaurant' | 'user';
  targetId: string;
  targetName: string;
  timestamp: string;
  content?: string;
}

interface TrendingItem {
  id: string;
  name: string;
  type: 'dish' | 'restaurant' | 'creator' | 'hashtag';
  mentions: number;
  growth: number;
  image?: string;
}

interface SocialFeaturesProps {
  currentUserId: string;
  className?: string;
}

export function SocialFeatures({ currentUserId, className }: SocialFeaturesProps) {
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSocialData();
  }, [currentUserId]);

  const fetchSocialData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockFollowers: User[] = [
        {
          id: '1',
          name: 'Priya Sharma',
          username: '@priyafoodie',
          avatar: '/api/placeholder/users/priya.jpg',
          isVerified: false,
          followers: 1200,
          following: 345,
          bio: 'Food lover from Bangalore',
          location: 'Bangalore',
          joinedDate: '2023-06-15',
          isFollowing: true
        },
        {
          id: '2',
          name: 'Ravi Kumar',
          username: '@ravieats',
          avatar: '/api/placeholder/users/ravi.jpg',
          isVerified: true,
          followers: 5600,
          following: 890,
          bio: 'Exploring street food across India',
          location: 'Mumbai',
          joinedDate: '2023-03-22',
          isFollowing: false
        }
      ];

      const mockActivities: Activity[] = [
        {
          id: '1',
          userId: '1',
          userName: 'Priya Sharma',
          userAvatar: '/api/placeholder/users/priya.jpg',
          type: 'like',
          targetType: 'video',
          targetId: 'v1',
          targetName: 'Butter Chicken Recipe',
          timestamp: '2024-01-20T14:30:00Z'
        },
        {
          id: '2',
          userId: '2',
          userName: 'Ravi Kumar',
          userAvatar: '/api/placeholder/users/ravi.jpg',
          type: 'order',
          targetType: 'restaurant',
          targetId: 'r1',
          targetName: 'Spice Garden',
          timestamp: '2024-01-20T12:15:00Z'
        }
      ];

      const mockTrending: TrendingItem[] = [
        {
          id: '1',
          name: 'Butter Chicken',
          type: 'dish',
          mentions: 2340,
          growth: 45,
          image: '/api/placeholder/dishes/butter-chicken.jpg'
        },
        {
          id: '2',
          name: '#BiryaniLovers',
          type: 'hashtag',
          mentions: 1890,
          growth: 32
        },
        {
          id: '3',
          name: 'Chef Sanjeev',
          type: 'creator',
          mentions: 1560,
          growth: 28,
          image: '/api/placeholder/creators/sanjeev.jpg'
        }
      ];

      setFollowers(mockFollowers);
      setFollowing(mockFollowers);
      setActivities(mockActivities);
      setTrending(mockTrending);
    } catch (error) {
      console.error('Failed to fetch social data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (userId: string) => {
    try {
      const target = followers.find(u => u.id === userId) || following.find(u => u.id === userId);
      const method = target?.isFollowing ? 'DELETE' : 'POST';
      await fetch(`/api/social/${userId}/follow`, { method, credentials: 'include' });
      setFollowers(prev => prev.map(user => user.id === userId ? { ...user, isFollowing: !user.isFollowing } : user));
      setFollowing(prev => prev.map(user => user.id === userId ? { ...user, isFollowing: !user.isFollowing } : user));
    } catch (error) {
      console.error('Follow toggle failed:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'share': return <Share2 className="w-4 h-4 text-green-500" />;
      case 'order': return <ShoppingCart className="w-4 h-4 text-orange-500" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'like': return `liked ${activity.targetName}`;
      case 'comment': return `commented on ${activity.targetName}`;
      case 'share': return `shared ${activity.targetName}`;
      case 'order': return `ordered from ${activity.targetName}`;
      case 'follow': return `started following ${activity.targetName}`;
      default: return `interacted with ${activity.targetName}`;
    }
  };

  const getTrendingIcon = (type: string) => {
    switch (type) {
      case 'dish': return '🍛';
      case 'restaurant': return '🏪';
      case 'creator': return '👨‍🍳';
      case 'hashtag': return '#';
      default: return '📈';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-20 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs defaultValue="activity" className="w-full">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Friend Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={activity.userAvatar} alt={activity.userName} />
                      <AvatarFallback>{activity.userName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.type)}
                        <span className="text-sm">
                          <span className="font-medium">{activity.userName}</span>
                          {' '}
                          {getActivityText(activity)}
                        </span>
                      </div>
                      
                      {activity.content && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.content}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Followers ({followers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {followers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm truncate">{user.name}</span>
                          {user.isVerified && <Crown className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{user.username}</span>
                          {user.location && (
                            <>
                              <span>•</span>
                              <MapPin className="w-3 h-3" />
                              <span>{user.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant={user.isFollowing ? "outline" : "default"}
                        onClick={() => handleFollowToggle(user.id)}
                      >
                        {user.isFollowing ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                      </Button>
                    </div>
                  ))}
                  
                  {followers.length > 5 && (
                    <Button variant="outline" className="w-full" size="sm">
                      View All Followers
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Following ({following.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {following.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm truncate">{user.name}</span>
                          {user.isVerified && <Crown className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{user.username}</span>
                      </div>
                      
                      <Button size="sm" variant="outline" onClick={() => handleFollowToggle(user.id)}>
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                What's Trending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trending.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                    <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                      #{idx + 1}
                    </Badge>
                    
                    {item.image ? (
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-lg">
                        {getTrendingIcon(item.type)}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-lg font-bold">
                        {getTrendingIcon(item.type)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{item.mentions.toLocaleString()} mentions</span>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            item.growth > 0 ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
                          )}
                        >
                          <TrendingUp className="w-2 h-2 mr-1" />
                          {item.growth > 0 ? '+' : ''}{item.growth}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
