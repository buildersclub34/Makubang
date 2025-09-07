
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Star, 
  Users, 
  PlayCircle, 
  TrendingUp, 
  DollarSign,
  MessageCircle,
  Heart,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  videos: number;
  avgViews: number;
  avgEngagement: number;
  categories: string[];
  rating: number;
  priceRange: {
    min: number;
    max: number;
  };
  isVerified: boolean;
  responseTime: string;
  completedCollabs: number;
}

interface CollaborationRequest {
  id: string;
  creatorId: string;
  restaurantId: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requirements: string[];
  deliverables: string[];
  createdAt: string;
}

interface CreatorMarketplaceProps {
  userRole: 'restaurant' | 'creator' | 'admin';
  userId: string;
}

export function CreatorMarketplace({ userRole, userId }: CreatorMarketplaceProps) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreators();
    if (userRole === 'restaurant') {
      fetchCollaborations();
    }
  }, [userRole]);

  const fetchCreators = async () => {
    try {
      // Fetch creators from API
      const mockCreators: Creator[] = [
        {
          id: '1',
          name: 'Foodie Sarah',
          username: '@foodiesarah',
          avatar: '/api/placeholder/creators/sarah.jpg',
          bio: 'Food enthusiast sharing the best local eats and hidden gems',
          followers: 125000,
          videos: 340,
          avgViews: 25000,
          avgEngagement: 8.5,
          categories: ['Street Food', 'Local Cuisine', 'Food Reviews'],
          rating: 4.9,
          priceRange: { min: 5000, max: 15000 },
          isVerified: true,
          responseTime: '< 2 hours',
          completedCollabs: 45
        },
        {
          id: '2',
          name: 'Chef Rajesh',
          username: '@chefrajesh',
          avatar: '/api/placeholder/creators/rajesh.jpg',
          bio: 'Professional chef showcasing traditional and fusion recipes',
          followers: 89000,
          videos: 180,
          avgViews: 35000,
          avgEngagement: 12.3,
          categories: ['Cooking', 'Recipes', 'Chef Tips'],
          rating: 4.8,
          priceRange: { min: 8000, max: 25000 },
          isVerified: true,
          responseTime: '< 4 hours',
          completedCollabs: 32
        }
      ];
      setCreators(mockCreators);
    } catch (error) {
      console.error('Failed to fetch creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborations = async () => {
    try {
      // Fetch user's collaboration requests
      const mockCollabs: CollaborationRequest[] = [
        {
          id: '1',
          creatorId: '1',
          restaurantId: userId,
          title: 'Showcase Our New Menu Items',
          description: 'Create engaging video content featuring our latest dishes',
          budget: 12000,
          deadline: '2024-02-15',
          status: 'in_progress',
          requirements: ['3-5 minute video', 'Include restaurant branding', 'Mention special offers'],
          deliverables: ['Final edited video', 'Behind-the-scenes content', 'Social media posts'],
          createdAt: '2024-01-15T10:30:00Z'
        }
      ];
      setCollaborations(mockCollabs);
    } catch (error) {
      console.error('Failed to fetch collaborations:', error);
    }
  };

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         creator.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || creator.categories.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'Street Food', 'Local Cuisine', 'Food Reviews', 'Cooking', 'Recipes', 'Chef Tips'];

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Creator Marketplace</h2>
          <p className="text-muted-foreground">
            {userRole === 'restaurant' 
              ? 'Find creators to showcase your food'
              : 'Discover collaboration opportunities'
            }
          </p>
        </div>
        
        {userRole === 'restaurant' && (
          <Button onClick={() => setShowCreateRequest(true)}>
            Post Collaboration
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search creators by name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category === 'all' ? 'All Categories' : category}
            </Button>
          ))}
        </div>
      </div>

      {userRole === 'restaurant' && (
        <Tabs defaultValue="discover" className="w-full">
          <TabsList>
            <TabsTrigger value="discover">Discover Creators</TabsTrigger>
            <TabsTrigger value="collaborations">My Collaborations</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <CreatorGrid creators={filteredCreators} onHire={(creatorId) => {
              // Handle hiring logic
              console.log('Hiring creator:', creatorId);
            }} />
          </TabsContent>

          <TabsContent value="collaborations" className="space-y-4">
            <CollaborationsList collaborations={collaborations} />
          </TabsContent>
        </Tabs>
      )}

      {userRole === 'creator' && (
        <CreatorGrid creators={filteredCreators} showStats />
      )}
    </div>
  );
}

function CreatorGrid({ creators, onHire, showStats }: {
  creators: Creator[];
  onHire?: (creatorId: string) => void;
  showStats?: boolean;
}) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {creators.map((creator) => (
        <Card key={creator.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback>{creator.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{creator.name}</h3>
                  {creator.isVerified && <Star className="w-4 h-4 text-yellow-500" />}
                </div>
                <p className="text-sm text-muted-foreground">{creator.username}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs">{creator.rating}</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground line-clamp-2">{creator.bio}</p>
            
            <div className="flex flex-wrap gap-1">
              {creator.categories.slice(0, 2).map(category => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
              {creator.categories.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{creator.categories.length - 2}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{(creator.followers / 1000).toFixed(0)}K followers</span>
              </div>
              <div className="flex items-center gap-1">
                <PlayCircle className="w-3 h-3" />
                <span>{creator.videos} videos</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{(creator.avgViews / 1000).toFixed(0)}K avg views</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span>{creator.avgEngagement}% engagement</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center text-sm">
                <span>Starting from:</span>
                <span className="font-semibold">₹{creator.priceRange.min.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Response time: {creator.responseTime}</span>
                <span>{creator.completedCollabs} projects</span>
              </div>
            </div>

            {onHire && (
              <Button onClick={() => onHire(creator.id)} className="w-full" size="sm">
                Contact Creator
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CollaborationsList({ collaborations }: { collaborations: CollaborationRequest[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {collaborations.map((collab) => (
        <Card key={collab.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{collab.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{collab.description}</p>
              </div>
              <Badge className={getStatusColor(collab.status)}>
                {collab.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Budget:</span>
                <div className="flex items-center gap-1 mt-1">
                  <DollarSign className="w-3 h-3" />
                  <span>₹{collab.budget.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <span className="font-medium">Deadline:</span>
                <div className="mt-1">{new Date(collab.deadline).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <div className="mt-1">{new Date(collab.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div>
              <span className="font-medium text-sm">Requirements:</span>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                {collab.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                View Details
              </Button>
              <Button size="sm">
                <MessageCircle className="w-3 h-3 mr-1" />
                Message
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {collaborations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Collaborations Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start working with creators to showcase your food!
            </p>
            <Button>Post Your First Collaboration</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
