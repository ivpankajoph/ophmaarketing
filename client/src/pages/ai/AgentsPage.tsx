import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, Trash2, Edit, Plus, Play, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    model: "gpt-4o",
    temperature: 0.7,
    isActive: true,
  });

  const getModelDisplayName = (model: string): string => {
    const modelNames: { [key: string]: string } = {
      "gpt-4o": "Bot 1",
      "gpt-4o-mini": "Bot 2",
      "gpt-4-turbo": "Bot 3",
      "gpt-3.5-turbo": "Bot 4",
    };
    return modelNames[model] || model;
  };

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/agents");
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      systemPrompt: "",
      model: "gpt-4o",
      temperature: 0.7,
      isActive: true,
    });
    setEditingAgent(null);
  };

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      temperature: agent.temperature,
      isActive: agent.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.systemPrompt) {
      toast({
        title: "Missing Fields",
        description: "Name and system prompt are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingAgent ? `/api/agents/${editingAgent.id}` : "/api/agents";
      const method = editingAgent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const agent = await response.json();
        if (editingAgent) {
          setAgents((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
          toast({ title: "Agent Updated", description: `${agent.name} has been updated.` });
        } else {
          setAgents((prev) => [...prev, agent]);
          toast({ title: "Agent Created", description: `${agent.name} has been created.` });
        }
        setDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save agent.", variant: "destructive" });
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      const response = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (response.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== id));
        toast({ title: "Agent Deleted", description: "The agent has been removed." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete agent.", variant: "destructive" });
    }
  };

  const toggleAgent = async (agent: Agent) => {
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !agent.isActive }),
      });

      if (response.ok) {
        const updated = await response.json();
        setAgents((prev) => prev.map((a) => (a.id === agent.id ? updated : a)));
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update agent.", variant: "destructive" });
    }
  };

  const testAgent = async () => {
    if (!testingAgent || !testMessage) return;

    setTesting(true);
    setTestResponse("");
    try {
      const response = await fetch(`/api/agents/${testingAgent.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setTestResponse(data.response);
      } else {
        const error = await response.json();
        setTestResponse(`Error: ${error.error}`);
      }
    } catch (error) {
      setTestResponse("Error: Failed to test agent.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">AI Agents</h2>
            <p className="text-muted-foreground">Create and manage AI agents for automated responses</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingAgent ? "Edit Agent" : "Create New Agent"}</DialogTitle>
                <DialogDescription>
                  Configure your AI agent's behavior and personality.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g., Support Bot"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>AI Model</Label>
                    <Select
                      value={formData.model}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, model: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">Bot 1 (Most Intelligent)</SelectItem>
                        <SelectItem value="gpt-4o-mini">Bot 2 (Smart & Fast)</SelectItem>
                        <SelectItem value="gpt-4-turbo">Bot 3 (Premium)</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">Bot 4 (Economy)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description of this agent"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>System Prompt</Label>
                  <Textarea
                    className="min-h-[150px] font-mono text-sm"
                    placeholder="You are a helpful assistant..."
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Temperature: {formData.temperature}</Label>
                  <Slider
                    value={[formData.temperature]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={([value]) => setFormData((prev) => ({ ...prev, temperature: value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower values make responses more focused, higher values more creative.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingAgent ? "Update Agent" : "Create Agent"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Active Agents
            </CardTitle>
            <CardDescription>
              Your AI agents that can respond to WhatsApp messages automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No agents created yet. Click "New Agent" to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-primary" />
                          {agent.name}
                        </div>
                      </TableCell>
                      <TableCell>{getModelDisplayName(agent.model)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {agent.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={agent.isActive}
                            onCheckedChange={() => toggleAgent(agent)}
                          />
                          <Badge variant={agent.isActive ? "default" : "secondary"}>
                            {agent.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTestingAgent(agent);
                            setTestDialogOpen(true);
                            setTestMessage("");
                            setTestResponse("");
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(agent)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteAgent(agent.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Test Agent: {testingAgent?.name}</DialogTitle>
              <DialogDescription>
                Send a test message to see how this agent responds.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 min-h-[150px] max-h-[300px] overflow-auto">
                {testResponse ? (
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm text-sm whitespace-pre-wrap">
                      {testResponse}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Send a message to see the agent's response
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a test message..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && testAgent()}
                />
                <Button onClick={testAgent} disabled={testing || !testMessage}>
                  {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
