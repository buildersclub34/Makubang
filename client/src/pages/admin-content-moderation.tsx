
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, XCircle, Eye, Flag, Clock, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ModerationReport {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  severity: 'low' | 'medium' | 'high';
  autoFlagged: boolean;
  createdAt: string;
  reporter?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ContentDetails {
  id: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  creator?: {
    id: string;
    name: string;
    profilePicture?: string;
  };
}

export default function AdminContentModeration() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [contentDetails, setContentDetails] = useState<ContentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [moderatorNotes, setModeratorNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/content/reports?status=${activeTab}&page=1&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        console.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContentDetails = async (contentType: string, contentId: string) => {
    try {
      const endpoint = contentType === 'video' 
        ? `/api/videos/${contentId}`
        : `/api/${contentType}s/${contentId}`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContentDetails(data.video || data);
      }
    } catch (error) {
      console.error('Error fetching content details:', error);
    }
  };

  const handleReportAction = async (reportId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/content/reports/${reportId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moderatorNotes: notes,
        }),
      });

      if (response.ok) {
        await fetchReports(); // Refresh the list
        setSelectedReport(null);
        setModeratorNotes("");
      } else {
        console.error(`Failed to ${action} report`);
      }
    } catch (error) {
      console.error(`Error ${action}ing report:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const openReportDetails = (report: ModerationReport) => {
    setSelectedReport(report);
    setModeratorNotes("");
    fetchContentDetails(report.contentType, report.contentId);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Flag className="w-4 h-4" />;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm || 
      report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.contentId.includes(searchTerm) ||
      report.reporter?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filterSeverity === 'all' || report.severity === filterSeverity;
    
    return matchesSearch && matchesSeverity;
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <p className="text-muted-foreground">
          Review and moderate flagged content to maintain platform quality
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <div className="flex gap-4 my-4">
          <div className="flex-1">
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No {activeTab} reports found
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getSeverityColor(report.severity)} text-white`}>
                            {getSeverityIcon(report.severity)}
                            <span className="ml-1 capitalize">{report.severity}</span>
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {report.contentType}
                          </Badge>
                          {report.autoFlagged && (
                            <Badge variant="secondary">Auto-flagged</Badge>
                          )}
                        </div>
                        
                        <h3 className="font-semibold mb-1">
                          {report.reason}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          Content ID: {report.contentId}
                        </p>
                        
                        {report.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {report.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            Reported {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                          {report.reporter && (
                            <span>by {report.reporter.name}</span>
                          )}
                        </div>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openReportDetails(report)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Content Moderation Review</DialogTitle>
                          </DialogHeader>
                          
                          {selectedReport && (
                            <div className="space-y-6">
                              {/* Report Details */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Report Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Content Type</label>
                                      <p className="capitalize">{selectedReport.contentType}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Severity</label>
                                      <div className="flex items-center gap-1">
                                        <Badge className={`${getSeverityColor(selectedReport.severity)} text-white`}>
                                          {getSeverityIcon(selectedReport.severity)}
                                          <span className="ml-1 capitalize">{selectedReport.severity}</span>
                                        </Badge>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Reason</label>
                                      <p>{selectedReport.reason}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Reported Date</label>
                                      <p>{new Date(selectedReport.createdAt).toLocaleString()}</p>
                                    </div>
                                  </div>
                                  
                                  {selectedReport.description && (
                                    <div>
                                      <label className="text-sm font-medium">Description</label>
                                      <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
                                    </div>
                                  )}
                                  
                                  {selectedReport.reporter && (
                                    <div>
                                      <label className="text-sm font-medium">Reported By</label>
                                      <p>{selectedReport.reporter.name} ({selectedReport.reporter.email})</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Content Preview */}
                              {contentDetails && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Content Preview</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    {selectedReport.contentType === 'video' && (
                                      <div className="space-y-4">
                                        {contentDetails.videoUrl && (
                                          <video
                                            controls
                                            className="w-full max-w-md mx-auto rounded-lg"
                                            poster={contentDetails.thumbnailUrl}
                                          >
                                            <source src={contentDetails.videoUrl} type="video/mp4" />
                                            Your browser does not support the video tag.
                                          </video>
                                        )}
                                        
                                        {contentDetails.title && (
                                          <div>
                                            <label className="text-sm font-medium">Title</label>
                                            <p>{contentDetails.title}</p>
                                          </div>
                                        )}
                                        
                                        {contentDetails.description && (
                                          <div>
                                            <label className="text-sm font-medium">Description</label>
                                            <p className="text-sm text-muted-foreground">{contentDetails.description}</p>
                                          </div>
                                        )}
                                        
                                        {contentDetails.creator && (
                                          <div>
                                            <label className="text-sm font-medium">Creator</label>
                                            <div className="flex items-center gap-2">
                                              {contentDetails.creator.profilePicture && (
                                                <img
                                                  src={contentDetails.creator.profilePicture}
                                                  alt={contentDetails.creator.name}
                                                  className="w-8 h-8 rounded-full"
                                                />
                                              )}
                                              <span>{contentDetails.creator.name}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}

                              {/* Moderation Actions */}
                              {activeTab === 'pending' && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Moderation Decision</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">Moderator Notes</label>
                                      <Textarea
                                        placeholder="Add notes about your decision..."
                                        value={moderatorNotes}
                                        onChange={(e) => setModeratorNotes(e.target.value)}
                                        rows={3}
                                      />
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleReportAction(selectedReport.id, 'approve', moderatorNotes)}
                                        disabled={actionLoading}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Approve Content
                                      </Button>
                                      
                                      <Button
                                        onClick={() => handleReportAction(selectedReport.id, 'reject', moderatorNotes)}
                                        disabled={actionLoading}
                                        variant="destructive"
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Remove Content
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
