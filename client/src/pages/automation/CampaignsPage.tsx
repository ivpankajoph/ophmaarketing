import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Copy, 
  Edit, 
  Search,
  Send,
  Eye,
  Users,
  CheckCircle2,
  TrendingUp,
  MessageSquare
} from "lucide-react";
import { Link } from "wouter";
import { getAuthHeaders } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DripCampaign {
  _id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  targetType: string;
  steps: any[];
  metrics: {
    totalEnrolled: number;
    activeContacts: number;
    completedContacts: number;
    exitedContacts: number;
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalReplied: number;
    totalConverted: number;
    totalFailed: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ 
    name: "", 
    description: "",
    targetType: "segment"
  });

  const queryClient = useQueryClient();

  const { data: campaignsData, isLoading } = useQuery<{ campaigns: DripCampaign[]; total: number }>({
    queryKey: ["/api/automation/campaigns", statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/automation/campaigns?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    }
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/automation/campaigns/stats"],
    queryFn: async () => {
      const res = await fetch("/api/automation/campaigns/stats", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const res = await fetch("/api/automation/campaigns", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/campaigns"] });
      setIsCreateOpen(false);
      setNewCampaign({ name: "", description: "", targetType: "segment" });
      toast.success("Campaign created successfully");
    },
    onError: () => toast.error("Failed to create campaign")
  });

  const launchMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/campaigns/${id}/launch`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to launch campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/campaigns"] });
      toast.success("Campaign launched");
    },
    onError: (error: Error) => toast.error(error.message)
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/campaigns/${id}/pause`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to pause campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/campaigns"] });
      toast.success("Campaign paused");
    }
  });

  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/campaigns/${id}/resume`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to resume campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/campaigns"] });
      toast.success("Campaign resumed");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/campaigns/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to delete campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/campaigns"] });
      toast.success("Campaign deleted");
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/campaigns/${id}/duplicate`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to duplicate campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/campaigns"] });
      toast.success("Campaign duplicated");
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const getDeliveryRate = (campaign: DripCampaign) => {
    if (campaign.metrics.totalSent === 0) return 0;
    return Math.round((campaign.metrics.totalDelivered / campaign.metrics.totalSent) * 100);
  };

  const getConversionRate = (campaign: DripCampaign) => {
    if (campaign.metrics.totalEnrolled === 0) return 0;
    return Math.round((campaign.metrics.totalConverted / campaign.metrics.totalEnrolled) * 100);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-green-500" />
              Drip Campaigns
            </h1>
            <p className="text-gray-500 mt-1">Create and manage WhatsApp drip campaign sequences</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Drip Campaign</DialogTitle>
                <DialogDescription>Set up a new message sequence campaign</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="e.g., Onboarding Sequence"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the campaign objective..."
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Type</Label>
                  <Select
                    value={newCampaign.targetType}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, targetType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="segment">Segment</SelectItem>
                      <SelectItem value="tag">Tag-based</SelectItem>
                      <SelectItem value="trigger">Trigger-based</SelectItem>
                      <SelectItem value="manual">Manual Selection</SelectItem>
                      <SelectItem value="imported">Imported List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate(newCampaign)} disabled={!newCampaign.name}>
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.totalCampaigns || 0}</div>
                  <div className="text-sm text-gray-500">Total Campaigns</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.activeCampaigns || 0}</div>
                  <div className="text-sm text-gray-500">Active</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.totalEnrolled || 0}</div>
                  <div className="text-sm text-gray-500">Enrolled</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.overallConversionRate || 0}%</div>
                  <div className="text-sm text-gray-500">Conversion Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Campaigns</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search campaigns..."
                    className="pl-9 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Conversion</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignsData?.campaigns?.map((campaign) => (
                  <TableRow key={campaign._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{campaign.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>{campaign.steps?.length || 0} steps</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{campaign.metrics.totalEnrolled}</span>
                        <span className="text-green-600 text-sm">({campaign.metrics.activeContacts} active)</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Delivery:</span>
                          <Progress value={getDeliveryRate(campaign)} className="w-20 h-2" />
                          <span>{getDeliveryRate(campaign)}%</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600">
                        {getConversionRate(campaign)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {campaign.status === 'draft' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => launchMutation.mutate(campaign._id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : campaign.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => pauseMutation.mutate(campaign._id)}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : campaign.status === 'paused' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resumeMutation.mutate(campaign._id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateMutation.mutate(campaign._id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(campaign._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!campaignsData?.campaigns || campaignsData.campaigns.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No campaigns found</p>
                      <p className="text-sm">Create your first drip campaign</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
