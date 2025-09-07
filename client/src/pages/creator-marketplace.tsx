
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, Video, DollarSign, Star, Calendar, Clock, MapPin,
  Heart, Share2, MessageCircle, TrendingUp, Filter, Search,
  Plus, Camera, Play, Eye, ThumbsUp, Award, Briefcase
} from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio: string;
  specialties: string[];
  followers: number;
  totalVideos: number;
  averageRating: number;
  socialLinks: { [platform: string]: string };
  isVerified: boolean;
  location: {
    city: string;
    state: string;
  };
}

interface Collaboration {
  id: string;
  restaurantId: string;
  restaurantName: string;
  creatorId?: string;
  creatorName?: string;
  title: string;
  description: string;
  requirements: string[];
  deliverables: string[];
  budget: number;
  deadline: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  contractTerms: string;
  paymentStatus: 'pending' | 'paid' | 'on_hold';
  createdAt: string;
  rating?: number;
  feedback?: string;
}

interface Proposal {
  id: string;
  collaborationId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  message: string;
  proposedBudget: number;
  estimatedDuration: number;
  portfolio: string[];
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export default function CreatorMarketplace() {
  const [activeTab, setActiveTab] = useState('browse');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [myCollaborations, setMyCollaborations] = useState<Collaboration[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const fetchMarketplaceData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch creators
      const creatorsResponse = await fetch('/api/creators');
      if (creatorsResponse.ok) {
        const creatorsData = await creatorsResponse.json();
        setCreators(creatorsData);
      }

      // Fetch available collaborations
      const collaborationsResponse = await fetch('/api/collaborations');
      if (collaborationsResponse.ok) {
        const collaborationsData = await collaborationsResponse.json();
        setCollaborations(collaborationsData);
      }

      // Fetch my collaborations
      const myCollaborationsResponse = await fetch('/api/collaborations/my');
      if (myCollaborationsResponse.ok) {
        const myCollaborationsData = await myCollaborationsResponse.json();
        setMyCollaborations(myCollaborationsData);
      }

      // Fetch proposals
      const proposalsResponse = await fetch('/api/collaborations/proposals');
      if (proposalsResponse.ok) {
        const proposalsData = await proposalsResponse.json();
        setProposals(proposalsData);
      }

    } catch (error) {
      console.error('Error fetching marketplace data:', error);
      toast({
        title: "Error",
        description: "Failed to load marketplace data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendCollaborationRequest = async (creatorId: string, projectDetails: any) => {
    try {
      const response = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          ...projectDetails,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Collaboration request sent successfully",
        });
        fetchMarketplaceData();
      }
    } catch (error) {
      console.error('Error sending collaboration request:', error);
      toast({
        title: "Error",
        description: "Failed to send collaboration request",
        variant: "destructive",
      });
    }
  };

  const submitProposal = async (collaborationId: string, proposalData: any) => {
    try {
      const response = await fetch(`/api/collaborations/${collaborationId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Proposal submitted successfully",
        });
        fetchMarketplaceData();
      }
    } catch (error) {
      console.error('Error submitting proposal:', error);
      toast({
        title: "Error",
        description: "Failed to submit proposal",
        variant: "destructive",
      });
    }
  };

  const acceptProposal = async (proposalId: string) => {
    try {
      const response = await fetch(`/api/collaborations/proposals/${proposalId}/accept`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Proposal accepted successfully",
        });
        fetchMarketplaceData();
      }
    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast({
        title: "Error",
        description: "Failed to accept proposal",
        variant: "destructive",
      });
    }
  };

  const filteredCreators = creators.filter(creator => {
    const matchesSearch = creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         creator.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = !filterSpecialty || creator.specialties.includes(filterSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'accepted': return 'bg-blue-500';
      case 'in_progress': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-purple-500 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Creator Marketplace</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Post Project
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="browse">Browse Creators</TabsTrigger>
            <TabsTrigger value="projects">Available Projects</TabsTrigger>
            <TabsTrigger value="my-collaborations">My Collaborations</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
          </TabsList>

          {/* Browse Creators Tab */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search creators..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Specialties</SelectItem>
                      <SelectItem value="indian">Indian Cuisine</SelectItem>
                      <SelectItem value="chinese">Chinese Cuisine</SelectItem>
                      <SelectItem value="italian">Italian Cuisine</SelectItem>
                      <SelectItem value="desserts">Desserts</SelectItem>
                      <SelectItem value="healthy">Healthy Food</SelectItem>
                      <SelectItem value="street_food">Street Food</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Creators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreators.map((creator) => (
                <Card key={creator.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={creator.avatar} alt={creator.name} />
                        <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">{creator.name}</h3>
                          {creator.isVerified && (
                            <Award className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{creator.followers.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Video className="h-4 w-4" />
                            <span>{creator.totalVideos}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>{creator.averageRating}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-3">{creator.bio}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {creator.specialties.slice(0, 3).map((specialty) => (
                        <Badge key={specialty} variant="secondary">
                          {specialty}
                        </Badge>
                      ))}
                      {creator.specialties.length > 3 && (
                        <Badge variant="outline">+{creator.specialties.length - 3} more</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />
                        <span>{creator.location.city}, {creator.location.state}</span>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm"
                            onClick={() => setSelectedCreator(creator)}
                          >
                            View Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <CreatorProfileDialog creator={selectedCreator} onCollaborate={sendCollaborationRequest} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Available Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {collaborations.filter(c => c.status === 'pending').map((collaboration) => (
                <Card key={collaboration.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{collaboration.title}</CardTitle>
                        <CardDescription>{collaboration.restaurantName}</CardDescription>
                      </div>
                      <Badge className="bg-green-500">₹{collaboration.budget}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">{collaboration.description}</p>
                    
                    <div>
                      <h4 className="font-medium mb-2">Requirements:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {collaboration.requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Deliverables:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {collaboration.deliverables.map((deliverable, index) => (
                          <li key={index}>{deliverable}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(collaboration.deadline).toLocaleDateString()}</span>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">Submit Proposal</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <ProposalDialog collaboration={collaboration} onSubmit={submitProposal} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* My Collaborations Tab */}
          <TabsContent value="my-collaborations" className="space-y-6">
            <div className="space-y-4">
              {myCollaborations.map((collaboration) => (
                <Card key={collaboration.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{collaboration.title}</CardTitle>
                        <CardDescription>
                          {collaboration.creatorName ? 
                            `Creator: ${collaboration.creatorName}` : 
                            `Restaurant: ${collaboration.restaurantName}`
                          }
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(collaboration.status)}>
                          {collaboration.status}
                        </Badge>
                        <Badge variant="outline">₹{collaboration.budget}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">{collaboration.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Deadline:</span>
                        <p className="text-gray-600">{new Date(collaboration.deadline).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">Payment Status:</span>
                        <p className="text-gray-600">{collaboration.paymentStatus}</p>
                      </div>
                    </div>

                    {collaboration.status === 'completed' && collaboration.rating && (
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Rating: {collaboration.rating}/5</span>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm">View Details</Button>
                      {collaboration.status === 'in_progress' && (
                        <Button size="sm">Upload Deliverables</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <Card key={proposal.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <Avatar>
                        <AvatarImage src={proposal.creatorAvatar} alt={proposal.creatorName} />
                        <AvatarFallback>{proposal.creatorName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{proposal.creatorName}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(proposal.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(proposal.status)}>
                              {proposal.status}
                            </Badge>
                            <Badge variant="outline">₹{proposal.proposedBudget}</Badge>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{proposal.message}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{proposal.estimatedDuration} days</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Camera className="h-4 w-4" />
                            <span>{proposal.portfolio.length} portfolio items</span>
                          </div>
                        </div>

                        {proposal.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => acceptProposal(proposal.id)}
                            >
                              Accept Proposal
                            </Button>
                            <Button variant="outline" size="sm">
                              Reject
                            </Button>
                            <Button variant="ghost" size="sm">
                              Message Creator
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Creator Profile Dialog Component
function CreatorProfileDialog({ creator, onCollaborate }: {
  creator: Creator | null;
  onCollaborate: (creatorId: string, projectDetails: any) => void;
}) {
  const [showCollaborateForm, setShowCollaborateForm] = useState(false);
  const [projectDetails, setProjectDetails] = useState({
    title: '',
    description: '',
    budget: 0,
    deadline: '',
    requirements: [''],
    deliverables: ['']
  });

  if (!creator) return null;

  const handleCollaborate = () => {
    onCollaborate(creator.id, projectDetails);
    setShowCollaborateForm(false);
  };

  const addRequirement = () => {
    setProjectDetails({
      ...projectDetails,
      requirements: [...projectDetails.requirements, '']
    });
  };

  const addDeliverable = () => {
    setProjectDetails({
      ...projectDetails,
      deliverables: [...projectDetails.deliverables, '']
    });
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Creator Profile</DialogTitle>
      </DialogHeader>
      
      {!showCollaborateForm ? (
        <div className="space-y-6">
          {/* Creator Info */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={creator.avatar} alt={creator.name} />
              <AvatarFallback>{creator.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold">{creator.name}</h2>
                {creator.isVerified && (
                  <Award className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div className="flex items-center space-x-4 text-gray-500">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{creator.followers.toLocaleString()} followers</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Video className="h-4 w-4" />
                  <span>{creator.totalVideos} videos</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>{creator.averageRating}/5</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">About</h3>
            <p className="text-gray-600">{creator.bio}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {creator.specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Social Links</h3>
            <div className="flex space-x-4">
              {Object.entries(creator.socialLinks).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {platform}
                </a>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline">Message</Button>
            <Button onClick={() => setShowCollaborateForm(true)}>
              Start Collaboration
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Create Collaboration</h3>
          
          <div>
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              value={projectDetails.title}
              onChange={(e) => setProjectDetails({ ...projectDetails, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={projectDetails.description}
              onChange={(e) => setProjectDetails({ ...projectDetails, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Budget (₹)</Label>
              <Input
                id="budget"
                type="number"
                value={projectDetails.budget}
                onChange={(e) => setProjectDetails({ ...projectDetails, budget: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={projectDetails.deadline}
                onChange={(e) => setProjectDetails({ ...projectDetails, deadline: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Requirements</Label>
            {projectDetails.requirements.map((req, index) => (
              <Input
                key={index}
                value={req}
                onChange={(e) => {
                  const newReqs = [...projectDetails.requirements];
                  newReqs[index] = e.target.value;
                  setProjectDetails({ ...projectDetails, requirements: newReqs });
                }}
                className="mt-2"
                placeholder="Enter requirement"
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRequirement} className="mt-2">
              Add Requirement
            </Button>
          </div>

          <div>
            <Label>Deliverables</Label>
            {projectDetails.deliverables.map((deliverable, index) => (
              <Input
                key={index}
                value={deliverable}
                onChange={(e) => {
                  const newDeliverables = [...projectDetails.deliverables];
                  newDeliverables[index] = e.target.value;
                  setProjectDetails({ ...projectDetails, deliverables: newDeliverables });
                }}
                className="mt-2"
                placeholder="Enter deliverable"
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addDeliverable} className="mt-2">
              Add Deliverable
            </Button>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCollaborateForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleCollaborate}>
              Send Collaboration Request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Proposal Dialog Component
function ProposalDialog({ collaboration, onSubmit }: {
  collaboration: Collaboration;
  onSubmit: (collaborationId: string, proposalData: any) => void;
}) {
  const [proposalData, setProposalData] = useState({
    message: '',
    proposedBudget: collaboration.budget,
    estimatedDuration: 7,
    portfolio: []
  });

  const handleSubmit = () => {
    onSubmit(collaboration.id, proposalData);
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Submit Proposal</DialogTitle>
        <DialogDescription>{collaboration.title}</DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="message">Cover Letter</Label>
          <Textarea
            id="message"
            value={proposalData.message}
            onChange={(e) => setProposalData({ ...proposalData, message: e.target.value })}
            rows={4}
            placeholder="Explain why you're the right fit for this project..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="budget">Proposed Budget (₹)</Label>
            <Input
              id="budget"
              type="number"
              value={proposalData.proposedBudget}
              onChange={(e) => setProposalData({ ...proposalData, proposedBudget: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="duration">Estimated Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              value={proposalData.estimatedDuration}
              onChange={(e) => setProposalData({ ...proposalData, estimatedDuration: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSubmit}>Submit Proposal</Button>
        </div>
      </div>
    </div>
  );
}
