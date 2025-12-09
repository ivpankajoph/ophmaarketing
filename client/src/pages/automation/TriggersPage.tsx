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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Copy, 
  Edit, 
  ChevronRight,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Settings
} from "lucide-react";
import { getAuthHeaders } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Trigger {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'draft';
  eventSource: string;
  eventType?: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TriggerExecution {
  _id: string;
  triggerId: string;
  eventId: string;
  eventSource: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  actionResults: any[];
  error?: string;
}

const eventSources = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'whatsapp_message', label: 'WhatsApp Message' },
  { value: 'whatsapp_status', label: 'WhatsApp Status Update' },
  { value: 'facebook_lead', label: 'Facebook Lead' },
  { value: 'crm_update', label: 'CRM Update' },
  { value: 'contact_created', label: 'Contact Created' },
  { value: 'contact_updated', label: 'Contact Updated' },
  { value: 'tag_added', label: 'Tag Added' },
  { value: 'segment_joined', label: 'Segment Joined' },
  { value: 'flow_completed', label: 'Flow Completed' },
  { value: 'campaign_event', label: 'Campaign Event' },
  { value: 'api_event', label: 'API Event' },
  { value: 'scheduled', label: 'Scheduled' }
];

const actionTypes = [
  { value: 'send_whatsapp', label: 'Send WhatsApp Message' },
  { value: 'send_template', label: 'Send Template Message' },
  { value: 'assign_group', label: 'Assign to Group' },
  { value: 'update_crm', label: 'Update CRM Field' },
  { value: 'api_call', label: 'Make API Call' },
  { value: 'internal_alert', label: 'Send Internal Alert' },
  { value: 'start_flow', label: 'Start Flow' },
  { value: 'add_tag', label: 'Add Tag' },
  { value: 'remove_tag', label: 'Remove Tag' },
  { value: 'update_score', label: 'Update Score' },
  { value: 'send_email', label: 'Send Email' }
];

export default function TriggersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  const [newTrigger, setNewTrigger] = useState({
    name: "",
    description: "",
    eventSource: "whatsapp_message",
    status: "draft" as const
  });

  const queryClient = useQueryClient();

  const { data: triggersData, isLoading } = useQuery<{ triggers: Trigger[]; total: number }>({
    queryKey: ["/api/automation/triggers", statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/automation/triggers?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch triggers");
      return res.json();
    }
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/automation/triggers/stats"],
    queryFn: async () => {
      const res = await fetch("/api/automation/triggers/stats", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTrigger) => {
      const res = await fetch("/api/automation/triggers", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create trigger");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/triggers"] });
      setIsCreateOpen(false);
      setNewTrigger({ name: "", description: "", eventSource: "whatsapp_message", status: "draft" });
      toast.success("Trigger created successfully");
    },
    onError: () => toast.error("Failed to create trigger")
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'activate' | 'pause' }) => {
      const res = await fetch(`/api/automation/triggers/${id}/${action}`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to update trigger");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/triggers"] });
      toast.success("Trigger status updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/triggers/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to delete trigger");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/triggers"] });
      toast.success("Trigger deleted");
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/triggers/${id}/duplicate`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to duplicate trigger");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/triggers"] });
      toast.success("Trigger duplicated");
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const getSuccessRate = (trigger: Trigger) => {
    if (trigger.executionCount === 0) return "N/A";
    return `${Math.round((trigger.successCount / trigger.executionCount) * 100)}%`;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              Triggers
            </h1>
            <p className="text-gray-500 mt-1">Create and manage event-based automation triggers</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Trigger
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Trigger</DialogTitle>
                <DialogDescription>Set up an event-based trigger to automate actions</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Trigger Name</Label>
                  <Input
                    placeholder="e.g., New Lead Follow-up"
                    value={newTrigger.name}
                    onChange={(e) => setNewTrigger({ ...newTrigger, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe what this trigger does..."
                    value={newTrigger.description}
                    onChange={(e) => setNewTrigger({ ...newTrigger, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event Source</Label>
                  <Select
                    value={newTrigger.eventSource}
                    onValueChange={(value) => setNewTrigger({ ...newTrigger, eventSource: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventSources.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate(newTrigger)} disabled={!newTrigger.name}>
                  Create Trigger
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.totalTriggers || 0}</div>
                  <div className="text-sm text-gray-500">Total Triggers</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Play className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.activeTriggers || 0}</div>
                  <div className="text-sm text-gray-500">Active Triggers</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.recentExecutions || 0}</div>
                  <div className="text-sm text-gray-500">Executions (24h)</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
                  <div className="text-sm text-gray-500">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Triggers</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search triggers..."
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Event Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggersData?.triggers?.map((trigger) => (
                  <TableRow key={trigger._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{trigger.name}</div>
                        {trigger.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{trigger.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {eventSources.find(s => s.value === trigger.eventSource)?.label || trigger.eventSource}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(trigger.status)}</TableCell>
                    <TableCell>{trigger.executionCount}</TableCell>
                    <TableCell>{getSuccessRate(trigger)}</TableCell>
                    <TableCell>
                      {trigger.lastExecutedAt 
                        ? new Date(trigger.lastExecutedAt).toLocaleString()
                        : "Never"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {trigger.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate({ id: trigger._id, action: 'pause' })}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate({ id: trigger._id, action: 'activate' })}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateMutation.mutate(trigger._id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(trigger._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!triggersData?.triggers || triggersData.triggers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No triggers found</p>
                      <p className="text-sm">Create your first trigger to automate actions</p>
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
