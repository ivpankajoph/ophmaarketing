import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Search, Send, Filter, Loader2, Bot, MessageSquare, FileText } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  source?: string;
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

interface SavedContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  source?: string;
}

export default function SelectedContacts() {
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageType, setMessageType] = useState<"template" | "custom" | "ai_agent">("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [showSendDialog, setShowSendDialog] = useState(false);

  const { data: regularContacts = [], isLoading: regularLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
  });

  const { data: importedContacts = [], isLoading: importedLoading } = useQuery<SavedContact[]>({
    queryKey: ["/api/broadcast/imported-contacts"],
    queryFn: async () => {
      const res = await fetch("/api/broadcast/imported-contacts");
      if (!res.ok) throw new Error("Failed to fetch imported contacts");
      return res.json();
    },
  });

  const contacts: Contact[] = [
    ...regularContacts,
    ...importedContacts.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      tags: c.tags || [],
      source: c.source || 'import',
    })),
  ];

  const contactsLoading = regularLoading || importedLoading;

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
  });

  const approvedTemplates = templates.filter(t => t.status === "approved");
  const activeAgents = agents.filter(a => a.isActive);

  const sendBroadcastMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/broadcast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send messages");
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(`Sent: ${result.successful} successful, ${result.failed} failed`);
      setShowSendDialog(false);
      setSelectedContactIds([]);
    },
    onError: () => {
      toast.error("Failed to send messages");
    },
  });

  const toggleSelect = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter(c => c !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.length === filteredContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map(c => c.id));
    }
  };

  const handleSendMessages = () => {
    if (selectedContactIds.length === 0) {
      toast.error("Please select at least one contact");
      return;
    }

    if (messageType === "template" && !selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }

    if (messageType === "custom" && !customMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (messageType === "ai_agent" && !selectedAgentId) {
      toast.error("Please select an AI agent");
      return;
    }

    const targetContacts = contacts
      .filter(c => selectedContactIds.includes(c.id))
      .map(c => ({ name: c.name, phone: c.phone }));

    sendBroadcastMutation.mutate({
      contacts: targetContacts,
      messageType,
      templateName: messageType === "template" ? (templates.find(t => t.id === selectedTemplateId)?.name || "hello_world") : undefined,
      customMessage: messageType === "custom" ? customMessage : undefined,
      agentId: messageType === "ai_agent" ? selectedAgentId : undefined,
    });
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Send to Selected</h2>
            <p className="text-muted-foreground">Select specific contacts and send a targeted message.</p>
          </div>
          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button disabled={selectedContactIds.length === 0}>
                <Send className="mr-2 h-4 w-4" />
                Send to {selectedContactIds.length} Contacts
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Compose Message</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Message Type</Label>
                  <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)}>
                    <TabsList className="w-full">
                      <TabsTrigger value="template" className="flex-1">
                        <FileText className="mr-1 h-4 w-4" />
                        Template
                      </TabsTrigger>
                      <TabsTrigger value="custom" className="flex-1">
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Custom
                      </TabsTrigger>
                      <TabsTrigger value="ai_agent" className="flex-1">
                        <Bot className="mr-1 h-4 w-4" />
                        AI Agent
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="template" className="mt-4">
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hello_world">hello_world (Default)</SelectItem>
                          {approvedTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>

                    <TabsContent value="custom" className="mt-4">
                      <Textarea
                        placeholder="Type your message here..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Note: Custom messages require the recipient to have messaged you first.
                      </p>
                    </TabsContent>

                    <TabsContent value="ai_agent" className="mt-4">
                      <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an AI agent..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeAgents.length === 0 ? (
                            <SelectItem value="" disabled>No active agents available</SelectItem>
                          ) : (
                            activeAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleSendMessages}
                  disabled={sendBroadcastMutation.isPending}
                >
                  {sendBroadcastMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Contact List</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search contacts..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {contactsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No contacts found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow 
                      key={contact.id}
                      className={selectedContactIds.includes(contact.id) ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={selectedContactIds.includes(contact.id)}
                          onCheckedChange={() => toggleSelect(contact.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell>
                        {contact.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="mr-1">{tag}</Badge>
                        ))}
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
