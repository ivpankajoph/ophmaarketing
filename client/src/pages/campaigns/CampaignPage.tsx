import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  Users,
  Loader2,
  Check,
  Bot,
  MessageSquare,
  Plus,
  Search,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Mail,
  Clock,
  Play,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getAuthHeaders } from "@/contexts/AuthContext";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  interestStatus?: string;
}

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

interface CampaignContact {
  contactId: string;
  phone: string;
  name: string;
  status: string;
  messageId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  replied: boolean;
  repliedAt?: string;
  replyText?: string;
  interestStatus?: string;
  error?: string;
}

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  messageType: string;
  templateName?: string;
  customMessage?: string;
  agentId?: string;
  contacts: CampaignContact[];
  status: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  metrics: {
    totalContacts: number;
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
    interested: number;
    notInterested: number;
    neutral: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CampaignPage() {
  const queryClient = useQueryClient();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [messageType, setMessageType] = useState<"template" | "custom" | "ai_agent">("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isRetargetDialogOpen, setIsRetargetDialogOpen] = useState(false);
  const [retargetType, setRetargetType] = useState<"interested" | "not_interested">("interested");
  const [retargetMessageType, setRetargetMessageType] = useState<"template" | "ai_agent">("template");
  const [retargetTemplateId, setRetargetTemplateId] = useState("");
  const [retargetAgentId, setRetargetAgentId] = useState("");
  const [retargetCampaignName, setRetargetCampaignName] = useState("");

  const { data: allContacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/broadcast/campaigns/contacts/all"],
    queryFn: async () => {
      const res = await fetch("/api/broadcast/campaigns/contacts/all", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates", { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/ai-agents"],
    queryFn: async () => {
      const res = await fetch("/api/ai-agents", { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery<{ campaigns: Campaign[]; total: number }>({
    queryKey: ["/api/broadcast/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/broadcast/campaigns", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  const campaigns = campaignsData?.campaigns || [];

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return allContacts;
    const query = searchQuery.toLowerCase();
    return allContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.email && c.email.toLowerCase().includes(query))
    );
  }, [allContacts, searchQuery]);

  const approvedTemplates = templates.filter((t) => t.status === "APPROVED");
  const activeAgents = agents.filter((a) => a.isActive);

  const createCampaignMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      messageType: string;
      templateName?: string;
      customMessage?: string;
      agentId?: string;
      contactIds: string[];
    }) => {
      const res = await fetch("/api/broadcast/campaigns", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Campaign created successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/broadcast/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/broadcast/campaigns/contacts/all"] });
      setCampaignName("");
      setCampaignDescription("");
      setSelectedContactIds([]);
      setSelectedTemplateId("");
      setSelectedAgentId("");
      setCustomMessage("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const executeCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetch(`/api/broadcast/campaigns/${campaignId}/execute`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to execute campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Campaign executed successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/broadcast/campaigns"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetch(`/api/broadcast/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete campaign");
      }
    },
    onSuccess: () => {
      toast.success("Campaign deleted");
      queryClient.invalidateQueries({ queryKey: ["/api/broadcast/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/broadcast/campaigns/contacts/all"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const sendToInterestListMutation = useMutation({
    mutationFn: async (data: {
      campaignId: string;
      interestType: string;
      messageType: string;
      templateName?: string;
      agentId?: string;
      campaignName?: string;
    }) => {
      const res = await fetch(`/api/broadcast/campaigns/${data.campaignId}/send-to-list`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          interestType: data.interestType,
          messageType: data.messageType,
          templateName: data.templateName,
          agentId: data.agentId,
          campaignName: data.campaignName,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send to interest list");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Follow-up campaign created and executed");
      queryClient.invalidateQueries({ queryKey: ["/api/broadcast/campaigns"] });
      setIsRetargetDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreateCampaign = () => {
    if (!campaignName.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (selectedContactIds.length === 0) {
      toast.error("Select at least one contact");
      return;
    }

    let templateName: string | undefined;
    if (messageType === "template") {
      const template = templates.find((t) => t.id === selectedTemplateId);
      templateName = template?.name;
      if (!templateName) {
        toast.error("Select a template");
        return;
      }
    }

    if (messageType === "ai_agent" && !selectedAgentId) {
      toast.error("Select an AI agent");
      return;
    }

    if (messageType === "custom" && !customMessage.trim()) {
      toast.error("Enter a custom message");
      return;
    }

    createCampaignMutation.mutate({
      name: campaignName,
      description: campaignDescription,
      messageType,
      templateName,
      customMessage: messageType === "custom" ? customMessage : undefined,
      agentId: messageType === "ai_agent" ? selectedAgentId : undefined,
      contactIds: selectedContactIds,
    });
  };

  const handleSelectAll = () => {
    if (selectedContactIds.length === filteredContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map((c) => c.id));
    }
  };

  const toggleContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter((cid) => cid !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "sending":
        return "bg-blue-100 text-blue-700";
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "scheduled":
        return "bg-yellow-100 text-yellow-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleOpenReport = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsReportDialogOpen(true);
  };

  const handleRetarget = (campaign: Campaign, type: "interested" | "not_interested") => {
    setSelectedCampaign(campaign);
    setRetargetType(type);
    setRetargetCampaignName(`Follow-up: ${type === "interested" ? "Interested" : "Not Interested"} from "${campaign.name}"`);
    setIsRetargetDialogOpen(true);
  };

  const handleSendRetarget = () => {
    if (!selectedCampaign) return;

    let templateName: string | undefined;
    if (retargetMessageType === "template") {
      const template = templates.find((t) => t.id === retargetTemplateId);
      templateName = template?.name;
      if (!templateName) {
        toast.error("Select a template");
        return;
      }
    }

    if (retargetMessageType === "ai_agent" && !retargetAgentId) {
      toast.error("Select an AI agent");
      return;
    }

    sendToInterestListMutation.mutate({
      campaignId: selectedCampaign._id,
      interestType: retargetType,
      messageType: retargetMessageType,
      templateName,
      agentId: retargetMessageType === "ai_agent" ? retargetAgentId : undefined,
      campaignName: retargetCampaignName,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Campaign Manager</h1>
          <p className="text-gray-500">Create and manage broadcast campaigns with contact selection and interest tracking</p>
        </div>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              Campaign Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Contacts ({selectedContactIds.length} selected)
                  </CardTitle>
                  <CardDescription>Choose contacts to include in this campaign</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button variant="outline" onClick={handleSelectAll}>
                      {selectedContactIds.length === filteredContacts.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>

                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    {contactsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : filteredContacts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No contacts found</div>
                    ) : (
                      <div className="divide-y">
                        {filteredContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer ${
                              selectedContactIds.includes(contact.id) ? "bg-blue-50" : ""
                            }`}
                            onClick={() => toggleContact(contact.id)}
                          >
                            <Checkbox
                              checked={selectedContactIds.includes(contact.id)}
                              onCheckedChange={() => toggleContact(contact.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{contact.name}</p>
                              <p className="text-sm text-gray-500">{contact.phone}</p>
                            </div>
                            {contact.interestStatus && contact.interestStatus !== "pending" && (
                              <Badge
                                variant={contact.interestStatus === "interested" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {contact.interestStatus}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Campaign Details
                  </CardTitle>
                  <CardDescription>Configure your campaign message</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name *</Label>
                    <Input
                      placeholder="e.g., Holiday Promotion 2025"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input
                      placeholder="Brief description of this campaign"
                      value={campaignDescription}
                      onChange={(e) => setCampaignDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Message Type</Label>
                    <Select value={messageType} onValueChange={(v: any) => setMessageType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="template">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Template Message
                          </div>
                        </SelectItem>
                        <SelectItem value="ai_agent">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            AI Agent Response
                          </div>
                        </SelectItem>
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Custom Message
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {messageType === "template" && (
                    <div className="space-y-2">
                      <Label>Select Template</Label>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {messageType === "ai_agent" && (
                    <div className="space-y-2">
                      <Label>Select AI Agent</Label>
                      <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an AI agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {messageType === "custom" && (
                    <div className="space-y-2">
                      <Label>Custom Message</Label>
                      <Textarea
                        placeholder="Enter your message..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      className="w-full"
                      onClick={handleCreateCampaign}
                      disabled={createCampaignMutation.isPending}
                    >
                      {createCampaignMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create Campaign ({selectedContactIds.length} contacts)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Campaign History</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/broadcast/campaigns"] })}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {campaignsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : campaigns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No campaigns yet. Create your first campaign to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign._id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{campaign.name}</h4>
                            <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                          </div>
                          {campaign.description && (
                            <p className="text-sm text-gray-500 mb-2">{campaign.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {campaign.metrics.totalContacts} contacts
                            </span>
                            <span className="flex items-center gap-1">
                              <Send className="h-4 w-4" />
                              {campaign.metrics.sent} sent
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {campaign.metrics.read} read
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {campaign.metrics.replied} replied
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(campaign.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {campaign.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => executeCampaignMutation.mutate(campaign._id)}
                              disabled={executeCampaignMutation.isPending}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleOpenReport(campaign)}>
                            <BarChart3 className="h-4 w-4 mr-1" />
                            View Report
                          </Button>
                          {campaign.status === "completed" && campaign.metrics.interested > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetarget(campaign, "interested")}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Send to Interested ({campaign.metrics.interested})
                            </Button>
                          )}
                          {campaign.status === "completed" && campaign.metrics.notInterested > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetarget(campaign, "not_interested")}
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Send to Not Interested ({campaign.metrics.notInterested})
                            </Button>
                          )}
                          {campaign.status === "draft" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm("Delete this campaign?")) {
                                  deleteCampaignMutation.mutate(campaign._id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {campaign.status === "completed" && (
                        <div className="mt-4 grid grid-cols-6 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{campaign.metrics.sent}</div>
                            <div className="text-xs text-gray-500">Sent</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{campaign.metrics.delivered}</div>
                            <div className="text-xs text-gray-500">Delivered</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{campaign.metrics.read}</div>
                            <div className="text-xs text-gray-500">Read</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{campaign.metrics.replied}</div>
                            <div className="text-xs text-gray-500">Replied</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{campaign.metrics.interested}</div>
                            <div className="text-xs text-gray-500">Interested</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{campaign.metrics.notInterested}</div>
                            <div className="text-xs text-gray-500">Not Interested</div>
                          </div>
                        </div>
                      )}

                      {campaign.status === "completed" && campaign.metrics.totalContacts > 0 && (
                        <div className="mt-4">
                          <Progress
                            value={(campaign.metrics.sent / campaign.metrics.totalContacts) * 100}
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Delivery Rate: {Math.round((campaign.metrics.delivered / campaign.metrics.sent) * 100 || 0)}%</span>
                            <span>Read Rate: {Math.round((campaign.metrics.read / campaign.metrics.delivered) * 100 || 0)}%</span>
                            <span>Reply Rate: {Math.round((campaign.metrics.replied / campaign.metrics.sent) * 100 || 0)}%</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Report: {selectedCampaign?.name}</DialogTitle>
            <DialogDescription>Detailed metrics and contact-level status</DialogDescription>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Delivery Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total</span>
                        <span className="font-medium">{selectedCampaign.metrics.totalContacts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sent</span>
                        <span className="font-medium text-blue-600">{selectedCampaign.metrics.sent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delivered</span>
                        <span className="font-medium text-green-600">{selectedCampaign.metrics.delivered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Failed</span>
                        <span className="font-medium text-red-600">{selectedCampaign.metrics.failed}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Read</span>
                        <span className="font-medium text-purple-600">{selectedCampaign.metrics.read}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Replied</span>
                        <span className="font-medium text-orange-600">{selectedCampaign.metrics.replied}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Interest</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Interested</span>
                        <span className="font-medium text-emerald-600">{selectedCampaign.metrics.interested}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Not Interested</span>
                        <span className="font-medium text-red-600">{selectedCampaign.metrics.notInterested}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Neutral</span>
                        <span className="font-medium text-gray-600">{selectedCampaign.metrics.neutral}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Contact Details</h4>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">Phone</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Replied</th>
                        <th className="text-left p-3">Interest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedCampaign.contacts.map((contact, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3">{contact.name}</td>
                          <td className="p-3">{contact.phone}</td>
                          <td className="p-3">
                            <Badge
                              variant={
                                contact.status === "read"
                                  ? "default"
                                  : contact.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {contact.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {contact.replied ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            {contact.interestStatus && contact.interestStatus !== "pending" ? (
                              <Badge
                                variant={contact.interestStatus === "interested" ? "default" : "secondary"}
                              >
                                {contact.interestStatus}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isRetargetDialogOpen} onOpenChange={setIsRetargetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Send to {retargetType === "interested" ? "Interested" : "Not Interested"} Contacts
            </DialogTitle>
            <DialogDescription>
              Create a follow-up campaign for contacts who showed{" "}
              {retargetType === "interested" ? "interest" : "no interest"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                value={retargetCampaignName}
                onChange={(e) => setRetargetCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select value={retargetMessageType} onValueChange={(v: any) => setRetargetMessageType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="template">Template Message</SelectItem>
                  <SelectItem value="ai_agent">AI Agent Response</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {retargetMessageType === "template" && (
              <div className="space-y-2">
                <Label>Select Template</Label>
                <Select value={retargetTemplateId} onValueChange={setRetargetTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {retargetMessageType === "ai_agent" && (
              <div className="space-y-2">
                <Label>Select AI Agent</Label>
                <Select value={retargetAgentId} onValueChange={setRetargetAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an AI agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRetargetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendRetarget} disabled={sendToInterestListMutation.isPending}>
              {sendToInterestListMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
