import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, Heart, TrendingUp, DollarSign, Video } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import { useState } from "react";

export default function CreatorProfile() {
  const { id } = useParams();
  const [currentSection, setCurrentSection] = useState("creator");

  const { data: creator } = useQuery({
    queryKey: ["/api/users", id],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/creator/analytics"],
    enabled: !!id,
  });

  const { data: videos } = useQuery({
    queryKey: ["/api/creator/videos"],
    enabled: !!id,
  });

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Creator Not Found</h2>
          <p className="text-muted-foreground">The creator you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary">Creator Profile</h1>
          <Button variant="ghost" onClick={() => window.history.back()}>
            ← Back
          </Button>
        </div>
      </header>

      <main className="pt-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Creator Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                <img 
                  src={creator.profileImageUrl || "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&h=150&fit=crop&crop=face"} 
                  alt={`${creator.firstName} ${creator.lastName}`} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-accent"
                />
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-2xl font-bold mb-2">
                    {creator.firstName} {creator.lastName}
                  </h2>
                  <p className="text-muted-foreground mb-3">
                    {creator.bio || "Food content creator passionate about authentic cuisine"}
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-lg">{creator.followersCount || 0}</p>
                      <p className="text-muted-foreground">Followers</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg">{videos?.length || 0}</p>
                      <p className="text-muted-foreground">Videos</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg">12</p>
                      <p className="text-muted-foreground">Restaurant Partners</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Button className="bg-primary hover:bg-primary/90">
                    Follow
                  </Button>
                  <Button variant="outline">
                    Message
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Creator Stats */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Content Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Views</span>
                    <span className="font-semibold">{analytics.videos?.totalViews || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Likes</span>
                    <span className="font-semibold text-accent">{analytics.videos?.totalLikes || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders Generated</span>
                    <span className="font-semibold">{analytics.videos?.totalOrdersGenerated || 0}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Earnings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Earned</span>
                    <span className="font-semibold text-primary">₹{analytics.earnings?.totalEarnings || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Payouts</span>
                    <span className="font-semibold">₹{analytics.earnings?.pendingPayouts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission Rate</span>
                    <span className="font-semibold">15%</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Partner Restaurants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <img 
                        src="https://images.unsplash.com/photo-1601050690597-df0568f70950?w=32&h=32&fit=crop" 
                        alt="Restaurant" 
                        className="w-8 h-8 rounded-full object-cover" 
                      />
                      <span className="text-sm font-medium">Tokyo Ramen House</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <img 
                        src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=32&h=32&fit=crop" 
                        alt="Restaurant" 
                        className="w-8 h-8 rounded-full object-cover" 
                      />
                      <span className="text-sm font-medium">Bella Italia</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Videos */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Videos</CardTitle>
            </CardHeader>
            <CardContent>
              {videos && videos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {videos.map((video: any) => (
                    <div key={video.id} className="relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                      <img 
                        src={video.thumbnailUrl || "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=500&fit=crop"} 
                        alt={video.title} 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-medium line-clamp-2">{video.title}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-white text-xs">{video.views} views</span>
                          <span className="text-white text-xs">
                            {new Date(video.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Video className="absolute top-2 right-2 w-4 h-4 text-white" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No videos available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation currentSection={currentSection} onSectionChange={setCurrentSection} />
    </div>
  );
}
