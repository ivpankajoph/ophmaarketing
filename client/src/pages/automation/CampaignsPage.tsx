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
import { Checkbox } from "@/components/ui/checkbox";
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
  MessageSquare,
  Bot,
  FileText,
  Zap,
  Facebook,
  ThumbsUp,
  ThumbsDown,
  Minus
} from "lucide-react";
import { Link } from "wouter";
import { getAuthHeaders } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  content: string;
  status: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

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

interface DripStep {
  id: string;
  name: string;
  order: number;
  messageType: 'template' | 'text' | 'ai_agent';
  templateId?: string;
  templateName?: string;
  aiAgentId?: string;
  aiAgentName?: string;
  textContent?: string;
  delayDays: number;
  delayHours: number;
  delayMinutes: number;
}

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStepsOpen, setIsStepsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<DripCampaign | null>(null);
  const [newStep, setNewStep] = useState<Partial<DripStep>>({
    name: "",
    messageType: "template",
    delayDays: 0,
    delayHours: 0,
    delayMinutes: 0
  });
  const [newCampaign, setNewCampaign] = useState({ 
    name: "", 
    description: "",
    targetType: "auto_trigger",
    deliveryMode: "template" as "template" | "ai_agent" | "mixed",
    defaultTemplateId: "",
    defaultTemplateName: "",
    defaultAiAgentId: "",
    defaultAiAgentName: "",
    autoTrigger: {
      enabled: true,
      sources: [] as string[],
      sendImmediately: true,
      initialMessage: ""
    }
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

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    }
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    }
  });

  const approvedTemplates = templates.filter(t => t.status === "approved");
  const activeAgents = agents.filter(a => a.isActive);

  const handleAutoTriggerSourceToggle = (source: string) => {
    const sources = newCampaign.autoTrigger.sources;
    const newSources = sources.includes(source) 
      ? sources.filter(s => s !== source)
      : [...sources, source];
    setNewCampaign({
      ...newCampaign,
      autoTrigger: { ...newCampaign.autoTrigger, sources: newSources }
    });
  };

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
      setNewCampaign({ 
        name: "", 
        description: "", 
        targetType: "auto_trigger",
        deliveryMode: "template",
        defaultTemplateId: "",
        defaultTemplateName: "",
        defaultAiAgentId: "",
        defaultAiAgentName: "",
        autoTrigger: {
          enabled: true,
          sources: [],
          sendImmediately: true,
          initialMessage: ""
        }
      });
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

  const addStepMutation = useMutation({
    mutationFn: async ({ campaignId, step }: { campaignId: string; step: Partial<DripStep> }) => {
      const stepData = {
        id: `step_${Date.now()}`,
        order: selectedCampaign?.steps?.length || 0,
        ...step
      };
      const res = await fetch(`/api/automation/campaigns/${campaignId}/steps`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(stepData)
      });
      if (!res.ok) throw new Error("Failed to add step");
      return res.json();
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/campaigns"] });
      setSelectedCampaign(campaign);
      setNewStep({ name: "", messageType: "template", delayDays: 0, delayHours: 0, delayMinutes: 0 });
      toast.success("Step added successfully");
    },
    onError: () => toast.error("Failed to add step")
  });

  const deleteStepMutation = useMutation({
    mutationFn: async ({ campaignId, stepId }: { campaignId: string; stepId: string }) => {
      const res = await fetch(`/api/automation/campaigns/${campaignId}/steps/${stepId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to delete step");
      return res.json();
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/campaigns"] });
      setSelectedCampaign(campaign);
      toast.success("Step removed");
    },
    onError: () => toast.error("Failed to remove step")
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Drip Campaign</DialogTitle>
                <DialogDescription>Set up an auto-triggered message sequence</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input
                      placeholder="e.g., Initial Trigger Sequence"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
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
                        <SelectItem value="auto_trigger">Auto Trigger</SelectItem>
                        <SelectItem value="interest">Interest-based</SelectItem>
                        <SelectItem value="segment">Segment</SelectItem>
                        <SelectItem value="tag">Tag-based</SelectItem>
                        <SelectItem value="manual">Manual Selection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the campaign objective..."
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  />
                </div>

                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <Label className="flex items-center gap-2 text-base font-semibold">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Auto-Trigger Settings
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Choose when this campaign should automatically trigger and send messages
                  </p>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="trigger-interested"
                        checked={newCampaign.autoTrigger.sources.includes('interest_interested')}
                        onCheckedChange={() => handleAutoTriggerSourceToggle('interest_interested')}
                      />
                      <label htmlFor="trigger-interested" className="flex items-center gap-2 text-sm cursor-pointer">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        User shows interest (interested)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="trigger-not-interested"
                        checked={newCampaign.autoTrigger.sources.includes('interest_not_interested')}
                        onCheckedChange={() => handleAutoTriggerSourceToggle('interest_not_interested')}
                      />
                      <label htmlFor="trigger-not-interested" className="flex items-center gap-2 text-sm cursor-pointer">
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        User not interested (follow-up)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="trigger-neutral"
                        checked={newCampaign.autoTrigger.sources.includes('interest_neutral')}
                        onCheckedChange={() => handleAutoTriggerSourceToggle('interest_neutral')}
                      />
                      <label htmlFor="trigger-neutral" className="flex items-center gap-2 text-sm cursor-pointer">
                        <Minus className="h-4 w-4 text-yellow-600" />
                        User neutral (nurture)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="trigger-facebook"
                        checked={newCampaign.autoTrigger.sources.includes('facebook_new_lead')}
                        onCheckedChange={() => handleAutoTriggerSourceToggle('facebook_new_lead')}
                      />
                      <label htmlFor="trigger-facebook" className="flex items-center gap-2 text-sm cursor-pointer">
                        <Facebook className="h-4 w-4 text-blue-600" />
                        New Facebook lead
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="trigger-new-message"
                        checked={newCampaign.autoTrigger.sources.includes('new_message')}
                        onCheckedChange={() => handleAutoTriggerSourceToggle('new_message')}
                      />
                      <label htmlFor="trigger-new-message" className="flex items-center gap-2 text-sm cursor-pointer">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                        Any new message
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 border rounded-lg">
                  <Label className="text-base font-semibold">Message Delivery Mode</Label>
                  <Select
                    value={newCampaign.deliveryMode}
                    onValueChange={(value: "template" | "ai_agent" | "mixed") => 
                      setNewCampaign({ ...newCampaign, deliveryMode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="template">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Template Messages
                        </span>
                      </SelectItem>
                      <SelectItem value="ai_agent">
                        <span className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          AI Agent Responses
                        </span>
                      </SelectItem>
                      <SelectItem value="mixed">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Mixed (Template + AI)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {(newCampaign.deliveryMode === 'template' || newCampaign.deliveryMode === 'mixed') && (
                    <div className="space-y-2 pt-2">
                      <Label>Default Template</Label>
                      <Select
                        value={newCampaign.defaultTemplateId}
                        onValueChange={(value) => {
                          const template = approvedTemplates.find(t => t.id === value);
                          setNewCampaign({ 
                            ...newCampaign, 
                            defaultTemplateId: value,
                            defaultTemplateName: template?.name || ""
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(newCampaign.deliveryMode === 'ai_agent' || newCampaign.deliveryMode === 'mixed') && (
                    <div className="space-y-2 pt-2">
                      <Label>Default AI Agent</Label>
                      <Select
                        value={newCampaign.defaultAiAgentId}
                        onValueChange={(value) => {
                          const agent = activeAgents.find(a => a.id === value);
                          setNewCampaign({ 
                            ...newCampaign, 
                            defaultAiAgentId: value,
                            defaultAiAgentName: agent?.name || ""
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an AI agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeAgents.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              <span className="flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                {agent.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox 
                    id="send-immediately"
                    checked={newCampaign.autoTrigger.sendImmediately}
                    onCheckedChange={(checked) => 
                      setNewCampaign({
                        ...newCampaign,
                        autoTrigger: { ...newCampaign.autoTrigger, sendImmediately: checked === true }
                      })
                    }
                  />
                  <label htmlFor="send-immediately" className="text-sm cursor-pointer">
                    Send first message immediately when triggered (otherwise follow schedule)
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createMutation.mutate(newCampaign)} 
                  disabled={!newCampaign.name || newCampaign.autoTrigger.sources.length === 0}
                >
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setIsStepsOpen(true);
                          }}
                          title="Manage steps"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {campaign.status === 'draft' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => launchMutation.mutate(campaign._id)}
                            title="Launch campaign"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : campaign.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => pauseMutation.mutate(campaign._id)}
                            title="Pause campaign"
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : campaign.status === 'paused' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resumeMutation.mutate(campaign._id)}
                            title="Resume campaign"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateMutation.mutate(campaign._id)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(campaign._id)}
                          title="Delete"
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

        <Dialog open={isStepsOpen} onOpenChange={(open) => {
          setIsStepsOpen(open);
          if (!open) setSelectedCampaign(null);
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Steps - {selectedCampaign?.name}</DialogTitle>
              <DialogDescription>
                Add and configure message steps for this campaign. Each step sends a message after a delay.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {selectedCampaign?.steps && selectedCampaign.steps.length > 0 ? (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Current Steps ({selectedCampaign.steps.length})</Label>
                  {selectedCampaign.steps.map((step: DripStep, idx: number) => (
                    <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{step.name || `Step ${idx + 1}`}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {step.messageType === 'ai_agent' ? (
                              <><Bot className="h-3 w-3 mr-1" />AI Agent</>
                            ) : step.messageType === 'template' ? (
                              <><FileText className="h-3 w-3 mr-1" />Template</>
                            ) : (
                              <><MessageSquare className="h-3 w-3 mr-1" />Text</>
                            )}
                          </Badge>
                          <span>
                            Delay: {step.delayDays || 0}d {step.delayHours || 0}h {step.delayMinutes || 0}m
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 shrink-0"
                        onClick={() => deleteStepMutation.mutate({ 
                          campaignId: selectedCampaign._id, 
                          stepId: step.id 
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No steps added yet</p>
                  <p className="text-sm">Add your first step below</p>
                </div>
              )}

              <div className="border-t pt-4 space-y-4">
                <Label className="text-base font-semibold">Add New Step</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Step Name</Label>
                    <Input
                      placeholder="e.g., Welcome Message"
                      value={newStep.name || ""}
                      onChange={(e) => setNewStep({ ...newStep, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message Type</Label>
                    <Select
                      value={newStep.messageType}
                      onValueChange={(value: 'template' | 'text' | 'ai_agent') => 
                        setNewStep({ ...newStep, messageType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="template">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Template
                          </span>
                        </SelectItem>
                        <SelectItem value="ai_agent">
                          <span className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            AI Agent
                          </span>
                        </SelectItem>
                        <SelectItem value="text">
                          <span className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Text Message
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newStep.messageType === 'template' && (
                  <div className="space-y-2">
                    <Label>Select Template</Label>
                    <Select
                      value={newStep.templateId || ""}
                      onValueChange={(value) => {
                        const template = approvedTemplates.find(t => t.id === value);
                        setNewStep({ 
                          ...newStep, 
                          templateId: value,
                          templateName: template?.name || ""
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {newStep.messageType === 'ai_agent' && (
                  <div className="space-y-2">
                    <Label>Select AI Agent</Label>
                    <Select
                      value={newStep.aiAgentId || ""}
                      onValueChange={(value) => {
                        const agent = activeAgents.find(a => a.id === value);
                        setNewStep({ 
                          ...newStep, 
                          aiAgentId: value,
                          aiAgentName: agent?.name || ""
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an AI agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeAgents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            <span className="flex items-center gap-2">
                              <Bot className="h-4 w-4" />
                              {agent.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {newStep.messageType === 'text' && (
                  <div className="space-y-2">
                    <Label>Message Content</Label>
                    <Textarea
                      placeholder="Enter your message text..."
                      value={newStep.textContent || ""}
                      onChange={(e) => setNewStep({ ...newStep, textContent: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Delay Before Sending</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Days</Label>
                      <Input
                        type="number"
                        min={0}
                        value={newStep.delayDays || 0}
                        onChange={(e) => setNewStep({ ...newStep, delayDays: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hours</Label>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={newStep.delayHours || 0}
                        onChange={(e) => setNewStep({ ...newStep, delayHours: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Minutes</Label>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={newStep.delayMinutes || 0}
                        onChange={(e) => setNewStep({ ...newStep, delayMinutes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    if (selectedCampaign && newStep.name) {
                      addStepMutation.mutate({ 
                        campaignId: selectedCampaign._id, 
                        step: newStep 
                      });
                    }
                  }}
                  disabled={!newStep.name || addStepMutation.isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStepsOpen(false)}>
                Close
              </Button>
              {selectedCampaign?.status === 'draft' && selectedCampaign?.steps?.length > 0 && (
                <Button onClick={() => {
                  launchMutation.mutate(selectedCampaign._id);
                  setIsStepsOpen(false);
                }}>
                  <Play className="h-4 w-4 mr-2" />
                  Launch Campaign
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
