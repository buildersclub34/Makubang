
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CheckCircle, XCircle, AlertTriangle, Eye, Search, Filter } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

interface ContentReport {
  id: string;
  contentType: 'video' | 'comment' | 'profile';
  contentId: string;
  reporterId: string;
  reason: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  severity: 'low' | 'medium' | 'high';
  autoFlagged: boolean;
  createdAt: string;
  content?: {
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    text?: string;
  };
  reporter?: {
    name: string;
    email: string;
  };
}

export default function AdminContentModeration() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/content/reports?status=${filter}&search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
      } else {
        throw new Error('Failed to fetch reports');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load content reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch(`/api/admin/content/reports/${reportId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Content ${action}d successfully`,
        });
        fetchReports();
        setSelectedReport(null);
      } else {
        throw new Error(`Failed to ${action} content`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} content`,
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getReasonColor = (reason: string) => {
    if (reason.includes('hate') || reason.includes('violence')) return 'destructive';
    if (reason.includes('spam') || reason.includes('inappropriate')) return 'default';
    return 'secondary';
  };

  const filteredReports = reports.filter(report =>
    report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.content?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All Reports</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.status === 'rejected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">High Severity</p>
                <p className="text-2xl font-bold">
                  {reports.filter(r => r.severity === 'high').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Content Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(report.severity)}>
                          {report.severity.toUpperCase()}
                        </Badge>
                        <Badge variant={getReasonColor(report.reason)}>
                          {report.reason}
                        </Badge>
                        <Badge variant="outline">
                          {report.contentType}
                        </Badge>
                        {report.autoFlagged && (
                          <Badge variant="secondary">AUTO-FLAGGED</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        {report.content?.thumbnailUrl && (
                          <img
                            src={report.content.thumbnailUrl}
                            alt="Content preview"
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {report.content?.title || 'Untitled Content'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {report.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Reported by: {report.reporter?.name} • {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      
                      {report.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAction(report.id, 'approve')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(report.id, 'reject')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle>Review Content Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Report Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Type:</strong> {selectedReport.contentType}</p>
                    <p><strong>Reason:</strong> {selectedReport.reason}</p>
                    <p><strong>Severity:</strong> {selectedReport.severity}</p>
                    <p><strong>Auto-flagged:</strong> {selectedReport.autoFlagged ? 'Yes' : 'No'}</p>
                    <p><strong>Reporter:</strong> {selectedReport.reporter?.name}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Content Preview</h4>
                  {selectedReport.content?.videoUrl && (
                    <video
                      src={selectedReport.content.videoUrl}
                      controls
                      className="w-full max-h-64 rounded-lg"
                    />
                  )}
                  {selectedReport.content?.title && (
                    <p className="mt-2 font-medium">{selectedReport.content.title}</p>
                  )}
                  {selectedReport.content?.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.content.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Report Description</h4>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  {selectedReport.description}
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </Button>
                {selectedReport.status === 'pending' && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => handleAction(selectedReport.id, 'approve')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve Content
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleAction(selectedReport.id, 'reject')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Remove Content
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
