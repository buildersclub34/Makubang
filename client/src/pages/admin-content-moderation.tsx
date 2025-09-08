import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, XCircle, AlertTriangle, Eye, User, Clock, Flag, 
  FileText, TrendingUp, Users, Play, Pause, Volume2, VolumeX,
  MoreHorizontal, Ban, UserX, MessageSquare
} from 'lucide-react';

interface Video {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  ownerId: string;
  ownerName: string;
  moderationStatus: string;
  flagCount: number;
  createdAt: string;
  tags: string[];
}

interface ContentReport {
  _id: string;
  videoId: string;
  reportedBy: string;
  reporterName: string;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  video: Video;
}

interface UserAction {
  _id: string;
  userId: string;
  userName: string;
  action: 'warn' | 'suspend' | 'ban';
  reason: string;
  duration?: number;
  createdAt: string;
}

export default function AdminContentModeration() {
  const [pendingVideos, setPendingVideos] = useState<Video[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [userActionType, setUserActionType] = useState<'warn' | 'suspend' | 'ban'>('warn');
  const [suspensionDuration, setSuspensionDuration] = useState('7');
  const [userActionReason, setUserActionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadModerationData();
  }, []);

  const loadModerationData = async () => {
    setLoading(true);
    try {
      const [videosRes, reportsRes, actionsRes, statsRes] = await Promise.all([
        fetch('/api/admin/moderation/pending-videos', { credentials: 'include' }),
        fetch('/api/admin/moderation/reports', { credentials: 'include' }),
        fetch('/api/admin/moderation/user-actions', { credentials: 'include' }),
        fetch('/api/admin/moderation/stats', { credentials: 'include' }),
      ]);

      if (videosRes.ok) {
        const data = await videosRes.json();
        setPendingVideos(data.videos || []);
      }

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }

      if (actionsRes.ok) {
        const data = await actionsRes.json();
        setUserActions(data.actions || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load moderation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveVideo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/admin/moderation/videos/${videoId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: moderationNotes }),
      });

      if (response.ok) {
        setPendingVideos(prev => prev.filter(v => v._id !== videoId));
        setSelectedVideo(null);
        setModerationNotes('');
        loadModerationData();
      }
    } catch (error) {
      console.error('Failed to approve video:', error);
    }
  };

  const rejectVideo = async (videoId: string) => {
    if (!rejectionReason) {
      alert('Please select a rejection reason');
      return;
    }

    try {
      const response = await fetch(`/api/admin/moderation/videos/${videoId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason: rejectionReason,
          notes: moderationNotes 
        }),
      });

      if (response.ok) {
        setPendingVideos(prev => prev.filter(v => v._id !== videoId));
        setSelectedVideo(null);
        setModerationNotes('');
        setRejectionReason('');
        loadModerationData();
      }
    } catch (error) {
      console.error('Failed to reject video:', error);
    }
  };

  const resolveReport = async (reportId: string, action: 'keep' | 'remove') => {
    try {
      const response = await fetch(`/api/admin/moderation/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setReports(prev => prev.filter(r => r._id !== reportId));
        loadModerationData();
      }
    } catch (error) {
      console.error('Failed to resolve report:', error);
    }
  };

  const takeUserAction = async (userId: string) => {
    if (!userActionReason.trim()) {
      alert('Please provide a reason for this action');
      return;
    }

    try {
      const response = await fetch(`/api/admin/moderation/users/${userId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: userActionType,
          reason: userActionReason,
          duration: userActionType === 'suspend' ? parseInt(suspensionDuration) : undefined,
        }),
      });

      if (response.ok) {
        setUserActionReason('');
        loadModerationData();
        alert(`User ${userActionType} action completed`);
      }
    } catch (error) {
      console.error('Failed to take user action:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <Button onClick={loadModerationData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.content?.pendingModeration || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reports</p>
                  <p className="text-2xl font-bold text-red-600">{stats.reports?.pendingReports || 0}</p>
                </div>
                <Flag className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Auto-flagged</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.content?.autoFlagged || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.users?.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Videos</p>
                  <p className="text-2xl font-bold">{stats.content?.totalVideos || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending Videos ({pendingVideos.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="actions">User Actions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Pending Videos Tab */}
        <TabsContent value="pending" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video List */}
            <Card>
              <CardHeader>
                <CardTitle>Videos Awaiting Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-auto">
                {pendingVideos.map((video) => (
                  <div
                    key={video._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedVideo?._id === video._id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className="flex items-start gap-3">
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
          <div className="flex-1">
                        <h3 className="font-medium">{video.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            {new Date(video.createdAt).toLocaleDateString()}
                          </Badge>
                          <Badge variant="secondary">
                            by {video.ownerName}
                          </Badge>
                          {video.flagCount > 0 && (
                            <Badge variant="destructive">
                              {video.flagCount} flags
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingVideos.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No videos pending review
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video Review Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Review Video</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedVideo ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">{selectedVideo.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        by {selectedVideo.ownerName}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedVideo.description}
                      </p>
                    </div>

                    {selectedVideo.videoUrl && (
                      <video
                        src={selectedVideo.videoUrl}
                        controls
                        className="w-full rounded-lg"
                        style={{ maxHeight: '300px' }}
                      />
                    )}

                    {/* Tags */}
                    {selectedVideo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedVideo.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium">Moderation Notes</Label>
                      <Textarea
                        value={moderationNotes}
                        onChange={(e) => setModerationNotes(e.target.value)}
                        placeholder="Add notes about your decision..."
                        className="mt-1"
            />
          </div>

                    <div>
                      <Label className="text-sm font-medium">Rejection Reason (if rejecting)</Label>
                      <Select value={rejectionReason} onValueChange={setRejectionReason}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
                          <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                          <SelectItem value="copyright_violation">Copyright Violation</SelectItem>
                          <SelectItem value="spam">Spam</SelectItem>
                          <SelectItem value="misleading">Misleading Information</SelectItem>
                          <SelectItem value="poor_quality">Poor Quality</SelectItem>
                          <SelectItem value="violence">Violence</SelectItem>
                          <SelectItem value="harassment">Harassment</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveVideo(selectedVideo._id)}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => rejectVideo(selectedVideo._id)}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>

                    {/* User Actions */}
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium">User Action</Label>
                      <div className="flex gap-2 mt-2">
                        <Select value={userActionType} onValueChange={(value: any) => setUserActionType(value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="warn">Warn</SelectItem>
                            <SelectItem value="suspend">Suspend</SelectItem>
                            <SelectItem value="ban">Ban</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {userActionType === 'suspend' && (
                          <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 day</SelectItem>
                              <SelectItem value="3">3 days</SelectItem>
                              <SelectItem value="7">7 days</SelectItem>
                              <SelectItem value="30">30 days</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      
                      <Input
                        placeholder="Reason for user action"
                        value={userActionReason}
                        onChange={(e) => setUserActionReason(e.target.value)}
                        className="mt-2"
                      />
                      
                      <Button
                        onClick={() => takeUserAction(selectedVideo.ownerId)}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Take Action
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a video to review
            </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report._id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">
                            {report.video?.title || 'Video not found'}
                          </h3>
                          <Badge variant="destructive">{report.reason}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          Reported by: {report.reporterName}
                        </p>
                        
                        {report.details && (
                          <p className="text-sm mb-2">
                            <strong>Details:</strong> {report.details}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </Badge>
                          {report.video?.thumbnailUrl && (
                            <img
                              src={report.video.thumbnailUrl}
                              alt="Video thumbnail"
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => resolveReport(report._id, 'keep')}
                        >
                          Keep Video
                        </Button>
                          <Button 
                            size="sm"
                          variant="destructive"
                          onClick={() => resolveReport(report._id, 'remove')}
                          >
                          Remove Video
                          </Button>
                                    </div>
                                      </div>
                                    </div>
                ))}
                {reports.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No pending reports
                                    </div>
                                  )}
                                    </div>
                                </CardContent>
                              </Card>
        </TabsContent>

        {/* User Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
                                <Card>
                                  <CardHeader>
              <CardTitle>Recent User Actions</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                      <div className="space-y-4">
                {userActions.map((action) => (
                  <div key={action._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        action.action === 'warn' ? 'bg-yellow-100 text-yellow-600' :
                        action.action === 'suspend' ? 'bg-orange-100 text-orange-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {action.action === 'warn' ? <AlertTriangle className="w-4 h-4" /> :
                         action.action === 'suspend' ? <Clock className="w-4 h-4" /> :
                         <Ban className="w-4 h-4" />}
                      </div>
                      
                                          <div>
                        <p className="font-medium">
                          {action.action.charAt(0).toUpperCase() + action.action.slice(1)} - {action.userName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {action.reason}
                          {action.duration && ` (${action.duration} days)`}
                        </p>
                                          </div>
                                          </div>
                    
                    <Badge variant="outline">
                      {new Date(action.createdAt).toLocaleDateString()}
                    </Badge>
                                            </div>
                ))}
                {userActions.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No user actions taken recently
                                          </div>
                                        )}
                                      </div>
                                  </CardContent>
                                </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                  <CardHeader>
                  <CardTitle>Content Statistics</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Videos</span>
                    <Badge>{stats.content?.totalVideos || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Approved</span>
                    <Badge variant="secondary">{stats.content?.approvedVideos || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Rejected</span>
                    <Badge variant="destructive">{stats.content?.rejectedVideos || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-flagged</span>
                    <Badge variant="outline">{stats.content?.autoFlagged || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <Badge className="bg-orange-100 text-orange-800">{stats.content?.pendingModeration || 0}</Badge>
                                    </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Users</span>
                    <Badge>{stats.users?.totalUsers || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Users</span>
                    <Badge variant="secondary">{stats.users?.activeUsers || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Suspended</span>
                    <Badge variant="destructive">{stats.users?.suspendedUsers || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Banned</span>
                    <Badge variant="destructive">{stats.users?.bannedUsers || 0}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reports & Flags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Pending Reports</span>
                    <Badge className="bg-red-100 text-red-800">{stats.reports?.pendingReports || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolved Reports</span>
                    <Badge variant="secondary">{stats.reports?.resolvedReports || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto Flags</span>
                    <Badge variant="outline">{stats.reports?.autoFlags || 0}</Badge>
                                    </div>
                                  </CardContent>
                                </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Content Approval Rate</span>
                    <Badge variant="secondary">
                      {stats.content?.approvalRate ? `${stats.content.approvalRate.toFixed(1)}%` : 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Review Time</span>
                    <Badge variant="outline">
                      {stats.moderation?.avgReviewTime || 'N/A'}
                    </Badge>
                            </div>
                  <div className="flex justify-between">
                    <span>Community Reports</span>
                    <Badge>{stats.reports?.totalReports || 0}</Badge>
                    </div>
                  </CardContent>
                </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}