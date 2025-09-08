import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, XCircle, AlertTriangle, Eye, User, 
  Clock, Flag, FileText, TrendingUp, Users 
} from 'lucide-react';

export default function AdminModeration() {
  const [stats, setStats] = useState<any>(null);
  const [pendingVideos, setPendingVideos] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, videosRes, reportsRes] = await Promise.all([
        fetch('/api/admin/moderation/stats', { credentials: 'include' }),
        fetch('/api/admin/moderation/pending', { credentials: 'include' }),
        fetch('/api/admin/moderation/reports', { credentials: 'include' })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (videosRes.ok) setPendingVideos((await videosRes.json()).videos || []);
      if (reportsRes.ok) setReports((await reportsRes.json()).reports || []);
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
        body: JSON.stringify({ notes: moderationNotes })
      });

      if (response.ok) {
        setPendingVideos(prev => prev.filter(v => v._id !== videoId));
        setSelectedVideo(null);
        setModerationNotes('');
        loadData(); // Refresh stats
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
        })
      });

      if (response.ok) {
        setPendingVideos(prev => prev.filter(v => v._id !== videoId));
        setSelectedVideo(null);
        setModerationNotes('');
        setRejectionReason('');
        loadData(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to reject video:', error);
    }
  };

  const resolveReport = async (reportId: string, action: 'approved' | 'removed') => {
    try {
      const response = await fetch(`/api/admin/moderation/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        setReports(prev => prev.filter(r => r._id !== reportId));
        loadData(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to resolve report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <Button onClick={loadData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.content.pendingModeration}</p>
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
                  <p className="text-2xl font-bold text-red-600">{stats.reports.pendingReports}</p>
                </div>
                <Flag className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.users.totalUsers}</p>
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
                  <p className="text-2xl font-bold">{stats.content.totalVideos}</p>
                </div>
                <FileText className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Videos ({pendingVideos.length})</TabsTrigger>
          <TabsTrigger value="reports">User Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

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
                        {selectedVideo.description}
                      </p>
                    </div>

                    {selectedVideo.videoUrl && (
                      <video
                        src={selectedVideo.videoUrl}
                        controls
                        className="w-full rounded-lg"
                        style={{ maxHeight: '200px' }}
                      />
                    )}

                    <div>
                      <label className="text-sm font-medium">Moderation Notes</label>
                      <Textarea
                        value={moderationNotes}
                        onChange={(e) => setModerationNotes(e.target.value)}
                        placeholder="Add notes about your decision..."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Rejection Reason</label>
                      <Select value={rejectionReason} onValueChange={setRejectionReason}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select reason (if rejecting)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                          <SelectItem value="copyright_violation">Copyright Violation</SelectItem>
                          <SelectItem value="spam">Spam</SelectItem>
                          <SelectItem value="misleading">Misleading Information</SelectItem>
                          <SelectItem value="poor_quality">Poor Quality</SelectItem>
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
                        <h3 className="font-medium">
                          {report.video?.[0]?.title || 'Video not found'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Reported by: {report.reporter?.[0]?.name || 'Unknown'}
                        </p>
                        <p className="text-sm"><strong>Reason:</strong> {report.reason}</p>
                        {report.details && (
                          <p className="text-sm"><strong>Details:</strong> {report.details}</p>
                        )}
                        <Badge variant="outline" className="mt-2">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => resolveReport(report._id, 'approved')}
                        >
                          Keep Video
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => resolveReport(report._id, 'removed')}
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
                    <Badge>{stats.content.totalVideos}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Approved</span>
                    <Badge variant="secondary">{stats.content.approvedVideos}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Rejected</span>
                    <Badge variant="destructive">{stats.content.rejectedVideos}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-flagged</span>
                    <Badge variant="outline">{stats.content.autoFlagged}</Badge>
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
                    <Badge>{stats.users.totalUsers}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Users</span>
                    <Badge variant="secondary">{stats.users.activeUsers}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Suspended</span>
                    <Badge variant="destructive">{stats.users.suspendedUsers}</Badge>
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
