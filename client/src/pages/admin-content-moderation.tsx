
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Eye, Flag, Search, Filter, Calendar, User, Video, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ContentItem {
  id: string;
  type: 'video' | 'comment' | 'review';
  title?: string;
  content: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  creator: {
    id: string;
    name: string;
    profilePicture?: string;
  };
  restaurant?: {
    id: string;
    name: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  reportCount: number;
  reportReasons: string[];
  moderationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminContentModeration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [moderationNotes, setModerationNotes] = useState("");

  // Fetch content items for moderation
  const { data: contentItems, isLoading } = useQuery({
    queryKey: ["/api/admin/content-moderation", selectedTab, searchTerm, filterType],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: selectedTab,
        search: searchTerm,
        type: filterType,
      });
      const response = await fetch(`/api/admin/content-moderation?${params}`);
      if (!response.ok) throw new Error('Failed to fetch content');
      return response.json();
    },
  });

  // Moderation action mutation
  const moderationMutation = useMutation({
    mutationFn: async ({ itemId, action, notes }: { itemId: string; action: 'approve' | 'reject' | 'flag'; notes?: string }) => {
      const response = await fetch(`/api/admin/content-moderation/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      if (!response.ok) throw new Error('Failed to moderate content');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-moderation"] });
      toast({
        title: "Action completed",
        description: `Content has been ${variables.action}d successfully.`,
      });
      setSelectedItem(null);
      setModerationNotes("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to perform moderation action. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleModeration = (action: 'approve' | 'reject' | 'flag') => {
    if (!selectedItem) return;
    
    moderationMutation.mutate({
      itemId: selectedItem.id,
      action,
      notes: moderationNotes,
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'flagged': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'comment': return <MessageSquare className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Content Moderation</h1>
          <p className="text-muted-foreground">Review and moderate platform content</p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Content Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="comment">Comments</SelectItem>
                  <SelectItem value="review">Reviews</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content Moderation Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              Pending ({contentItems?.filter((item: ContentItem) => item.status === 'pending').length || 0})
            </TabsTrigger>
            <TabsTrigger value="flagged">
              Flagged ({contentItems?.filter((item: ContentItem) => item.status === 'flagged').length || 0})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({contentItems?.filter((item: ContentItem) => item.status === 'approved').length || 0})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({contentItems?.filter((item: ContentItem) => item.status === 'rejected').length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-32 bg-muted rounded-lg mb-4"></div>
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contentItems?.map((item: ContentItem) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Content Preview */}
                      {item.type === 'video' && item.thumbnailUrl && (
                        <div className="relative h-48 bg-muted">
                          <img 
                            src={item.thumbnailUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2">
                            <Badge variant={getStatusBadgeVariant(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                          {item.reportCount > 0 && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <Flag className="w-3 h-3" />
                                {item.reportCount}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-4">
                        {/* Content Info */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getContentTypeIcon(item.type)}
                            <span className="capitalize">{item.type}</span>
                          </div>
                        </div>

                        <h3 className="font-semibold mb-2 line-clamp-2">
                          {item.title || item.content.substring(0, 50) + '...'}
                        </h3>

                        {/* Creator Info */}
                        <div className="flex items-center gap-2 mb-3">
                          <img 
                            src={item.creator.profilePicture || '/placeholder-avatar.jpg'} 
                            alt={item.creator.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm text-muted-foreground">
                            {item.creator.name}
                          </span>
                        </div>

                        {/* Restaurant Info */}
                        {item.restaurant && (
                          <p className="text-sm text-muted-foreground mb-3">
                            Restaurant: {item.restaurant.name}
                          </p>
                        )}

                        {/* Report Reasons */}
                        {item.reportReasons.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-destructive mb-1">
                              Report Reasons:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {item.reportReasons.map((reason, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setSelectedItem(item)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Content Review</DialogTitle>
                              </DialogHeader>
                              
                              {selectedItem && (
                                <div className="space-y-6">
                                  {/* Content Display */}
                                  {selectedItem.type === 'video' && selectedItem.videoUrl && (
                                    <video 
                                      controls 
                                      className="w-full max-h-96 rounded-lg"
                                      poster={selectedItem.thumbnailUrl}
                                    >
                                      <source src={selectedItem.videoUrl} type="video/mp4" />
                                    </video>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Content Details */}
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="font-semibold">Title/Content</Label>
                                        <p className="text-sm mt-1">{selectedItem.title || selectedItem.content}</p>
                                      </div>
                                      
                                      <div>
                                        <Label className="font-semibold">Creator</Label>
                                        <p className="text-sm mt-1">{selectedItem.creator.name}</p>
                                      </div>

                                      {selectedItem.restaurant && (
                                        <div>
                                          <Label className="font-semibold">Restaurant</Label>
                                          <p className="text-sm mt-1">{selectedItem.restaurant.name}</p>
                                        </div>
                                      )}

                                      <div>
                                        <Label className="font-semibold">Created</Label>
                                        <p className="text-sm mt-1">
                                          {new Date(selectedItem.createdAt).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Moderation Section */}
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="font-semibold">Current Status</Label>
                                        <Badge 
                                          variant={getStatusBadgeVariant(selectedItem.status)}
                                          className="mt-1"
                                        >
                                          {selectedItem.status}
                                        </Badge>
                                      </div>

                                      {selectedItem.reportReasons.length > 0 && (
                                        <div>
                                          <Label className="font-semibold">Report Reasons</Label>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedItem.reportReasons.map((reason, index) => (
                                              <Badge key={index} variant="destructive" className="text-xs">
                                                {reason}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {selectedItem.moderationNotes && (
                                        <div>
                                          <Label className="font-semibold">Previous Notes</Label>
                                          <p className="text-sm mt-1 bg-muted p-2 rounded">
                                            {selectedItem.moderationNotes}
                                          </p>
                                        </div>
                                      )}

                                      <div>
                                        <Label htmlFor="notes" className="font-semibold">
                                          Moderation Notes
                                        </Label>
                                        <Textarea
                                          id="notes"
                                          placeholder="Add notes about your decision..."
                                          value={moderationNotes}
                                          onChange={(e) => setModerationNotes(e.target.value)}
                                          className="mt-1"
                                        />
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => handleModeration('approve')}
                                          disabled={moderationMutation.isPending}
                                          className="flex-1"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Approve
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => handleModeration('reject')}
                                          disabled={moderationMutation.isPending}
                                          className="flex-1"
                                        >
                                          <XCircle className="w-4 h-4 mr-1" />
                                          Reject
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => handleModeration('flag')}
                                          disabled={moderationMutation.isPending}
                                        >
                                          <Flag className="w-4 h-4 mr-1" />
                                          Flag
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
