import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, Video, DollarSign, Eye, Heart, MessageCircle, Share2,
  Clock, CheckCircle, XCircle, AlertTriangle, Calendar, TrendingUp,
  Play, Pause, Volume2, VolumeX, RotateCcw, Download, Tag,
  Camera, Edit3, Trash2, Settings, BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoContent {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  views: number;
  likes: number;
  comments: number;
  shares: number;
  earnings: number;
  tags: string[];
  restaurantId?: string;
  menuItemId?: string;
  createdAt: string;
  moderationNotes?: string;
}

interface Analytics {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalEarnings: number;
  avgEngagementRate: number;
  topPerformingVideos: VideoContent[];
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export default function CreatorStudio() {
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Video upload form state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [linkedRestaurant, setLinkedRestaurant] = useState('');
  const [linkedMenuItem, setLinkedMenuItem] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCreatorData();
  }, []);

  const loadCreatorData = async () => {
    try {
      const [videosRes, analyticsRes] = await Promise.all([
        fetch('/api/creator/videos', { credentials: 'include' }),
        fetch('/api/creator/analytics', { credentials: 'include' }),
      ]);

      if (videosRes.ok) {
        const data = await videosRes.json();
        setVideos(data.videos || []);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load creator data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your content data',
        variant: 'destructive',
      });
    }
  };

  const handleVideoUpload = async () => {
    if (!videoFile || !title.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select a video file and provide a title',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('tags', JSON.stringify(tags));
      formData.append('isPublic', isPublic.toString());
      if (linkedRestaurant) formData.append('restaurantId', linkedRestaurant);
      if (linkedMenuItem) formData.append('menuItemId', linkedMenuItem);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          toast({
            title: 'Upload Successful',
            description: 'Your video has been uploaded and is pending review',
          });
          resetUploadForm();
          loadCreatorData();
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Upload failed');
      });

      xhr.open('POST', '/api/videos/upload');
      xhr.setRequestHeader('credentials', 'include');
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload your video. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUploadForm = () => {
    setVideoFile(null);
    setThumbnailFile(null);
    setTitle('');
    setDescription('');
    setTags([]);
    setNewTag('');
    setLinkedRestaurant('');
    setLinkedMenuItem('');
    setIsPublic(true);
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setVideos(prev => prev.filter(v => v._id !== videoId));
        setSelectedVideo(null);
        toast({
          title: 'Video Deleted',
          description: 'Your video has been successfully deleted',
        });
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the video. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Creator Studio</h1>
        <Button onClick={loadCreatorData} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold">{formatNumber(analytics.totalViews)}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Likes</p>
                  <p className="text-2xl font-bold">{formatNumber(analytics.totalLikes)}</p>
                </div>
                <Heart className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comments</p>
                  <p className="text-2xl font-bold">{formatNumber(analytics.totalComments)}</p>
                </div>
                <MessageCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shares</p>
                  <p className="text-2xl font-bold">{formatNumber(analytics.totalShares)}</p>
                </div>
                <Share2 className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Earnings</p>
                  <p className="text-2xl font-bold">₹{analytics.totalEarnings}</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="upload">Upload Video</TabsTrigger>
          <TabsTrigger value="content">My Content</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.recentActivity?.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Performing Videos */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.topPerformingVideos?.slice(0, 5).map((video) => (
                    <div key={video._id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <img
                        src={video.thumbnailUrl || '/placeholder-video.png'}
                        alt={video.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{video.title}</h4>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {formatNumber(video.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {formatNumber(video.likes)}
                          </span>
                          <span>₹{video.earnings}</span>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-center py-4">
                      No videos yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Upload Video Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video File Upload */}
              <div>
                <Label>Video File</Label>
                <div className="mt-2">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {videoFile ? videoFile.name : 'Click to upload video or drag and drop'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, WebM, MOV up to 100MB
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div>
                <Label>Thumbnail (Optional)</Label>
                <div className="mt-2">
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  <label htmlFor="thumbnail-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                      <Camera className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {thumbnailFile ? thumbnailFile.name : 'Upload custom thumbnail'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Video Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter video title"
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {title.length}/100 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your video..."
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {description.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add tag"
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <Button onClick={addTag} size="sm">
                        <Tag className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          #{tag}
                          <button onClick={() => removeTag(tag)}>×</button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="restaurant">Link to Restaurant (Optional)</Label>
                    <Select value={linkedRestaurant} onValueChange={setLinkedRestaurant}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select restaurant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rest1">Sample Restaurant 1</SelectItem>
                        <SelectItem value="rest2">Sample Restaurant 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="menuitem">Link to Menu Item (Optional)</Label>
                    <Select value={linkedMenuItem} onValueChange={setLinkedMenuItem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select menu item" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="item1">Sample Dish 1</SelectItem>
                        <SelectItem value="item2">Sample Dish 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="public">Make Public</Label>
                    <Switch
                      id="public"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleVideoUpload}
                disabled={isUploading || !videoFile || !title.trim()}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Upload Video
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>My Videos ({videos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {videos.map((video) => (
                      <div
                        key={video._id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedVideo?._id === video._id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedVideo(video)}
                      >
                        <div className="flex gap-4">
                          <img
                            src={video.thumbnailUrl || '/placeholder-video.png'}
                            alt={video.title}
                            className="w-24 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h3 className="font-medium line-clamp-2">{video.title}</h3>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(video.status)}
                                <Badge className={getStatusColor(video.status)}>
                                  {video.status}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {video.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {formatNumber(video.views)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {formatNumber(video.likes)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {formatNumber(video.comments)}
                              </span>
                              <span>₹{video.earnings}</span>
                              <span>{formatDuration(video.duration)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {video.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {videos.length === 0 && (
                      <div className="text-center py-8">
                        <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">No videos yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Upload your first video to get started
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Video Details Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Video Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedVideo ? (
                  <div className="space-y-4">
                    <img
                      src={selectedVideo.thumbnailUrl || '/placeholder-video.png'}
                      alt={selectedVideo.title}
                      className="w-full aspect-video object-cover rounded"
                    />
                    
                    <div>
                      <h3 className="font-medium">{selectedVideo.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedVideo.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Views</p>
                        <p className="font-medium">{formatNumber(selectedVideo.views)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Likes</p>
                        <p className="font-medium">{formatNumber(selectedVideo.likes)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Comments</p>
                        <p className="font-medium">{formatNumber(selectedVideo.comments)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Earnings</p>
                        <p className="font-medium">₹{selectedVideo.earnings}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Status</p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedVideo.status)}
                        <Badge className={getStatusColor(selectedVideo.status)}>
                          {selectedVideo.status}
                        </Badge>
                      </div>
                      {selectedVideo.moderationNotes && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <p className="font-medium">Moderation Notes:</p>
                          <p>{selectedVideo.moderationNotes}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedVideo.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteVideo(selectedVideo._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a video to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Engagement Rate</span>
                    <span className="font-bold">
                      {analytics?.avgEngagementRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Content</span>
                    <span className="font-bold">{videos.length} videos</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Approved Content</span>
                    <span className="font-bold">
                      {videos.filter(v => v.status === 'approved').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pending Review</span>
                    <span className="font-bold">
                      {videos.filter(v => v.status === 'pending').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Earnings</span>
                    <span className="font-bold text-green-600">
                      ₹{analytics?.totalEarnings || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>This Month</span>
                    <span className="font-bold">₹0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average per Video</span>
                    <span className="font-bold">
                      ₹{videos.length > 0 ? ((analytics?.totalEarnings || 0) / videos.length).toFixed(2) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Next Payout</span>
                    <span className="font-bold">TBD</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
