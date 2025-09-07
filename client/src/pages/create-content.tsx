
import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Video, Camera, Mic, MicOff, Play, Pause, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

export default function CreateContentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<'upload' | 'details' | 'review' | 'publishing'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [videoDetails, setVideoDetails] = useState({
    title: '',
    description: '',
    restaurantId: '',
    tags: [] as string[],
    category: '',
    isPublic: true,
    enableComments: true,
    monetizationEnabled: false
  });

  const [moderationResult, setModerationResult] = useState<any>(null);
  const [currentTag, setCurrentTag] = useState('');

  const { data: restaurants = [] } = useQuery({
    queryKey: ['/api/restaurants'],
    queryFn: () => fetch('/api/restaurants').then(res => res.json())
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('video', file);
      
      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data) => {
      setVideoUrl(data.url);
      setStep('details');
      toast({
        title: "Upload Successful",
        description: "Your video has been uploaded successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload video",
        variant: "destructive"
      });
    }
  });

  const createVideoMutation = useMutation({
    mutationFn: async (videoData: any) => {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData)
      });
      
      if (!response.ok) throw new Error('Failed to create video');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Video Published!",
        description: "Your video has been published successfully!"
      });
      // Reset form
      setStep('upload');
      setVideoFile(null);
      setVideoUrl('');
      setVideoDetails({
        title: '',
        description: '',
        restaurantId: '',
        tags: [],
        category: '',
        isPublic: true,
        enableComments: true,
        monetizationEnabled: false
      });
    },
    onError: (error: any) => {
      toast({
        title: "Publishing Failed",
        description: error.message || "Failed to publish video",
        variant: "destructive"
      });
    }
  });

  const moderationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/content/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          title: videoDetails.title,
          description: videoDetails.description
        })
      });
      
      if (!response.ok) throw new Error('Moderation failed');
      return response.json();
    },
    onSuccess: (result) => {
      setModerationResult(result);
      setStep('review');
    }
  });

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith('video/')) {
      setVideoFile(file);
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid video file",
        variant: "destructive"
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setIsRecording(true);
      // Implementation would use MediaRecorder API
      toast({
        title: "Recording Started",
        description: "Video recording feature coming soon!"
      });
    } catch (error) {
      toast({
        title: "Permission Denied",
        description: "Please allow camera and microphone access",
        variant: "destructive"
      });
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !videoDetails.tags.includes(currentTag.trim())) {
      setVideoDetails(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setVideoDetails(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handlePublish = () => {
    if (!moderationResult?.isApproved) {
      toast({
        title: "Content Review Required",
        description: "Your content needs review before publishing",
        variant: "destructive"
      });
      return;
    }

    setStep('publishing');
    createVideoMutation.mutate({
      ...videoDetails,
      videoUrl,
      creatorId: user?.id
    });
  };

  const categories = [
    'Mukbang', 'Recipe', 'Restaurant Review', 'Street Food', 
    'Cooking Tutorial', 'Food Challenge', 'Desserts', 'Healthy Eating'
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Content</h1>
          <p className="text-muted-foreground">
            Share your food journey with the community
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {['Upload', 'Details', 'Review', 'Publish'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${index <= ['upload', 'details', 'review', 'publishing'].indexOf(step) 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
                }
              `}>
                {index + 1}
              </div>
              <span className="ml-2 text-sm font-medium">{stepName}</span>
              {index < 3 && <div className="w-8 h-px bg-border mx-4" />}
            </div>
          ))}
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Your Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Upload Video File</h3>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop or click to select (Max 500MB)
                  </p>
                  <Button>Select Video</Button>
                </label>
              </div>

              <div className="text-center text-muted-foreground">or</div>

              {/* Record Video */}
              <div className="text-center">
                <Button
                  onClick={startRecording}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Record Video</span>
                </Button>
              </div>

              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Details Step */}
        {step === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Video Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <Input
                      value={videoDetails.title}
                      onChange={(e) => setVideoDetails(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter an engaging title..."
                      maxLength={100}
                    />
                    <div className="text-right text-xs text-muted-foreground mt-1">
                      {videoDetails.title.length}/100
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={videoDetails.description}
                      onChange={(e) => setVideoDetails(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your video..."
                      rows={4}
                      maxLength={500}
                    />
                    <div className="text-right text-xs text-muted-foreground mt-1">
                      {videoDetails.description.length}/500
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Restaurant</label>
                    <Select 
                      value={videoDetails.restaurantId} 
                      onValueChange={(value) => setVideoDetails(prev => ({ ...prev, restaurantId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select restaurant (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {restaurants.map((restaurant: any) => (
                          <SelectItem key={restaurant.id} value={restaurant.id}>
                            {restaurant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <Select 
                      value={videoDetails.category} 
                      onValueChange={(value) => setVideoDetails(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category.toLowerCase().replace(' ', '_')}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tags</label>
                    <div className="flex space-x-2 mb-2">
                      <Input
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        placeholder="Add tags..."
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <Button onClick={addTag} type="button">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {videoDetails.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                          #{tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button 
                  onClick={() => moderationMutation.mutate()}
                  disabled={!videoDetails.title || !videoDetails.category}
                >
                  Continue to Review
                </Button>
              </div>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {videoUrl && (
                    <video 
                      src={videoUrl} 
                      controls 
                      className="w-full rounded-lg"
                      style={{ aspectRatio: '9/16' }}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && moderationResult && (
          <Card>
            <CardHeader>
              <CardTitle>Content Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`p-4 rounded-lg border ${
                moderationResult.isApproved 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {moderationResult.isApproved ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                  <h3 className="font-medium">
                    {moderationResult.isApproved 
                      ? 'Content Approved' 
                      : 'Content Needs Review'
                    }
                  </h3>
                </div>
                <p className="text-sm mt-2">
                  Confidence Score: {(moderationResult.confidenceScore * 100).toFixed(1)}%
                </p>
                {moderationResult.flaggedReasons.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">Flagged Issues:</p>
                    <div className="flex flex-wrap gap-1">
                      {moderationResult.flaggedReasons.map((reason: string) => (
                        <Badge key={reason} variant="destructive" className="text-xs">
                          {reason.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Video Summary</h4>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Title:</strong> {videoDetails.title}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Category:</strong> {videoDetails.category}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Tags:</strong> {videoDetails.tags.join(', ')}
                  </p>
                </div>
                <div>
                  {videoUrl && (
                    <video 
                      src={videoUrl} 
                      controls 
                      className="w-full rounded-lg"
                      style={{ aspectRatio: '16/9' }}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('details')}>
                  Edit Details
                </Button>
                <Button 
                  onClick={handlePublish}
                  disabled={!moderationResult.isApproved}
                >
                  {moderationResult.isApproved ? 'Publish Video' : 'Submit for Review'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Publishing Step */}
        {step === 'publishing' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Publishing Your Video...</h3>
              <p className="text-muted-foreground">
                Please wait while we process and publish your content.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
