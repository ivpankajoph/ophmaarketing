import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Link2, Bot, FileText, Trash2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
}

interface LeadForm {
  id: string;
  name: string;
}

interface Mapping {
  id: string;
  formId: string;
  formName: string;
  agentId: string;
  agentName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function MapAgent() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mappingsRes, agentsRes, formsRes] = await Promise.all([
        fetch("/api/map-agent"),
        fetch("/api/agents"),
        fetch("/api/facebook/forms"),
      ]);

      if (mappingsRes.ok) setMappings(await mappingsRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (formsRes.ok) setForms(await formsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createMapping = async () => {
    if (!selectedForm || !selectedAgent) {
      toast({
        title: "Missing Selection",
        description: "Please select both a form and an agent.",
        variant: "destructive",
      });
      return;
    }

    const form = forms.find((f) => f.id === selectedForm);
    const agent = agents.find((a) => a.id === selectedAgent);

    try {
      const response = await fetch("/api/map-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedForm,
          formName: form?.name || "Unknown",
          agentId: selectedAgent,
          agentName: agent?.name || "Unknown",
          isActive: true,
        }),
      });

      if (response.ok) {
        const newMapping = await response.json();
        setMappings((prev) => {
          const existing = prev.findIndex((m) => m.formId === newMapping.formId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newMapping;
            return updated;
          }
          return [...prev, newMapping];
        });
        toast({
          title: "Mapping Created",
          description: `${form?.name} is now connected to ${agent?.name}`,
        });
        setDialogOpen(false);
        setSelectedForm("");
        setSelectedAgent("");
      } else {
        const error = await response.json();
        toast({
          title: "Failed to Create Mapping",
          description: error.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create mapping.",
        variant: "destructive",
      });
    }
  };

  const deleteMapping = async (id: string) => {
    try {
      const response = await fetch(`/api/map-agent/${id}`, { method: "DELETE" });
      if (response.ok) {
        setMappings((prev) => prev.filter((m) => m.id !== id));
        toast({ title: "Mapping Deleted", description: "The mapping has been removed." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete mapping.", variant: "destructive" });
    }
  };

  const toggleMapping = async (mapping: Mapping) => {
    try {
      const response = await fetch(`/api/map-agent/${mapping.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !mapping.isActive }),
      });

      if (response.ok) {
        const updated = await response.json();
        setMappings((prev) => prev.map((m) => (m.id === mapping.id ? updated : m)));
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update mapping.", variant: "destructive" });
    }
  };

  const unmappedForms = forms.filter((f) => !mappings.some((m) => m.formId === f.id));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Agent-Form Mapping</h2>
            <p className="text-muted-foreground">
              Connect AI agents to lead forms for automatic responses
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Mapping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Agent-Form Mapping</DialogTitle>
                <DialogDescription>
                  Select a lead form and an AI agent to handle responses automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Lead Form</Label>
                  <Select value={selectedForm} onValueChange={setSelectedForm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a form" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>AI Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} {agent.isActive ? "(Active)" : "(Inactive)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createMapping}>Create Mapping</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Active Mappings
            </CardTitle>
            <CardDescription>
              When a lead comes from a mapped form, the connected AI agent will respond via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mappings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No mappings created yet. Connect a form to an AI agent to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead Form</TableHead>
                    <TableHead>AI Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          {mapping.formName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-purple-500" />
                          {mapping.agentName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={mapping.isActive}
                            onCheckedChange={() => toggleMapping(mapping)}
                          />
                          <Badge variant={mapping.isActive ? "default" : "secondary"}>
                            {mapping.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(mapping.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMapping(mapping.id)}
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
      </div>
    </DashboardLayout>
  );
}
