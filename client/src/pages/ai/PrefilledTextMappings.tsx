import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Bot, 
  MessageSquare, 
  Loader2,
  Zap,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface PrefilledTextMapping {
  id: string;
  prefilledText: string;
  agentId: string;
  agentName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function PrefilledTextMappings() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PrefilledTextMapping | null>(null);
  const [prefilledText, setPrefilledText] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery<PrefilledTextMapping[]>({
    queryKey: ["/api/prefilled-text"],
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { prefilledText: string; agentId: string; agentName: string }) => {
      const res = await fetch("/api/prefilled-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create mapping");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prefilled-text"] });
      setIsAddOpen(false);
      setPrefilledText("");
      setSelectedAgentId("");
      toast.success("Mapping created successfully");
    },
    onError: () => {
      toast.error("Failed to create mapping");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; prefilledText?: string; agentId?: string; agentName?: string; isActive?: boolean }) => {
      const res = await fetch(`/api/prefilled-text/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update mapping");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prefilled-text"] });
      setEditingMapping(null);
      setPrefilledText("");
      setSelectedAgentId("");
      toast.success("Mapping updated successfully");
    },
    onError: () => {
      toast.error("Failed to update mapping");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prefilled-text/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete mapping");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prefilled-text"] });
      toast.success("Mapping deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete mapping");
    },
  });

  const handleCreate = () => {
    if (!prefilledText.trim() || !selectedAgentId) {
      toast.error("Please fill in all fields");
      return;
    }
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) {
      toast.error("Please select an agent");
      return;
    }
    createMutation.mutate({
      prefilledText: prefilledText.trim(),
      agentId: selectedAgentId,
      agentName: agent.name,
    });
  };

  const handleUpdate = () => {
    if (!editingMapping) return;
    if (!prefilledText.trim() || !selectedAgentId) {
      toast.error("Please fill in all fields");
      return;
    }
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) {
      toast.error("Please select an agent");
      return;
    }
    updateMutation.mutate({
      id: editingMapping.id,
      prefilledText: prefilledText.trim(),
      agentId: selectedAgentId,
      agentName: agent.name,
    });
  };

  const handleToggleActive = (mapping: PrefilledTextMapping) => {
    updateMutation.mutate({
      id: mapping.id,
      isActive: !mapping.isActive,
    });
  };

  const openEditDialog = (mapping: PrefilledTextMapping) => {
    setEditingMapping(mapping);
    setPrefilledText(mapping.prefilledText);
    setSelectedAgentId(mapping.agentId);
  };

  const closeDialogs = () => {
    setIsAddOpen(false);
    setEditingMapping(null);
    setPrefilledText("");
    setSelectedAgentId("");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Pre-filled Text Mappings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically assign AI agents to WhatsApp leads based on their first message
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Mapping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Pre-filled Text Mapping</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Pre-filled Text</Label>
                  <Input
                    placeholder="e.g., Hi, I'm interested in pricing"
                    value={prefilledText}
                    onChange={(e) => setPrefilledText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    When a new contact sends a message starting with this text, the selected AI agent will respond
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>AI Agent</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an AI agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.filter(a => a.isActive).map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            {agent.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Mapping
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
            <CardDescription>
              When someone who is not in your contacts list messages you on WhatsApp, the system checks if their message matches any pre-filled text you've configured. If it matches, the assigned AI agent will automatically respond and handle the conversation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <span>User sends message</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span>Match pre-filled text</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2 text-sm">
                <Bot className="h-5 w-5 text-green-500" />
                <span>AI Agent responds</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configured Mappings</CardTitle>
            <CardDescription>
              {mappings.length} mapping{mappings.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : mappings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Zap className="h-8 w-8 mb-2" />
                <p>No mappings configured yet</p>
                <p className="text-xs">Add a mapping to auto-assign AI agents to incoming leads</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {mappings.map((mapping) => (
                    <div 
                      key={mapping.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        mapping.isActive ? 'bg-background' : 'bg-muted/30 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium">"{mapping.prefilledText}"</p>
                            <p className="text-xs text-muted-foreground">
                              Messages starting with this text will trigger the AI
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-4" />
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                            <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium">{mapping.agentName}</p>
                            <Badge variant={mapping.isActive ? "default" : "secondary"} className="text-xs">
                              {mapping.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={mapping.isActive}
                          onCheckedChange={() => handleToggleActive(mapping)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(mapping)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(mapping.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingMapping} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pre-filled Text</Label>
              <Input
                placeholder="e.g., Hi, I'm interested in pricing"
                value={prefilledText}
                onChange={(e) => setPrefilledText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>AI Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an AI agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.filter(a => a.isActive).map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
