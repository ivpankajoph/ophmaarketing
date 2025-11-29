import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Paperclip, 
  Send, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video, 
  Loader2, 
  Download, 
  Clock, 
  CheckSquare,
  Bot,
  FileText,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
}

interface Message {
  id: string;
  contactId: string;
  content: string;
  type: string;
  direction: "inbound" | "outbound";
  status: string;
  timestamp: string;
}

interface Chat {
  id: string;
  contactId: string;
  contact: Contact;
  lastMessage?: string;
  lastMessageTime?: string;
  lastInboundMessageTime?: string;
  lastInboundMessage?: string;
  unreadCount: number;
  status: string;
  windowExpiresAt?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
  status: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function WindowInbox() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isBulkSendOpen, setIsBulkSendOpen] = useState(false);
  const [isSingleSendOpen, setIsSingleSendOpen] = useState(false);
  const [messageType, setMessageType] = useState<"template" | "custom" | "ai">("custom");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: chats = [], isLoading: chatsLoading } = useQuery<Chat[]>({
    queryKey: ["/api/chats/window"],
    queryFn: async () => {
      const res = await fetch("/api/chats");
      if (!res.ok) throw new Error("Failed to fetch chats");
      const allChats = await res.json();
      const now = new Date();
      return allChats.filter((chat: Chat) => {
        if (chat.lastInboundMessageTime) {
          const lastInbound = new Date(chat.lastInboundMessageTime);
          const hoursDiff = (now.getTime() - lastInbound.getTime()) / (1000 * 60 * 60);
          return hoursDiff <= 24;
        }
        return false;
      }).map((chat: Chat) => ({
        ...chat,
        windowExpiresAt: chat.lastInboundMessageTime 
          ? new Date(new Date(chat.lastInboundMessageTime).getTime() + 24 * 60 * 60 * 1000).toISOString()
          : undefined
      }));
    },
    refetchInterval: 3000, // Auto-refresh every 3 seconds
  });

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

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const selectedContactId = selectedChat?.contactId;

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedContactId],
    queryFn: async () => {
      if (!selectedContactId) return [];
      const res = await fetch(`/api/messages?contactId=${selectedContactId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedContactId,
    refetchInterval: 2000, // Auto-refresh messages every 2 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, phone, contactId }: { content: string; phone: string; contactId: string }) => {
      // Send via WhatsApp API
      const waRes = await fetch("/api/webhook/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          message: content,
        }),
      });
      
      if (!waRes.ok) {
        const error = await waRes.json();
        throw new Error(error.error || "Failed to send WhatsApp message");
      }
      
      // Also save to local storage for inbox display
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          content,
          type: "text",
          direction: "outbound",
          status: "sent",
        }),
      });
      
      if (!res.ok) {
        console.error("Failed to save message locally, but WhatsApp sent");
      }
      
      return { waResult: await waRes.json(), contactId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", data.contactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats/window"] });
      setMessageInput("");
      toast.success("Message sent via WhatsApp");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const sendBulkMessageMutation = useMutation({
    mutationFn: async (data: { contacts: string[], messageType: string, content: string }) => {
      const res = await fetch("/api/broadcast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: data.contacts,
          messageType: data.messageType,
          content: data.content,
          templateId: selectedTemplate,
          agentId: selectedAgent,
        }),
      });
      if (!res.ok) throw new Error("Failed to send bulk message");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats/window"] });
      setSelectedContacts([]);
      setIsBulkSendOpen(false);
      setCustomMessage("");
      toast.success(`Message sent to ${data.sent || selectedContacts.length} contacts`);
    },
    onError: () => {
      toast.error("Failed to send bulk message");
    },
  });

  const sendSingleMessageMutation = useMutation({
    mutationFn: async (data: { 
      contactId: string;
      phone: string;
      name: string;
      messageType: string;
      templateName?: string;
      customMessage?: string;
      agentId?: string;
    }) => {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send message");
      return { ...result, contactId: data.contactId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", data.contactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats/window"] });
      setIsSingleSendOpen(false);
      setCustomMessage("");
      setSelectedTemplate("");
      setSelectedAgent("");
      setMessageType("custom");
      toast.success("Message sent successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const handleSingleSend = () => {
    if (!selectedChat || !selectedContactId) {
      toast.error("Please select a contact first");
      return;
    }

    const phone = selectedChat.contact.phone.replace(/\D/g, '');
    const name = selectedChat.contact.name;

    if (messageType === "template" && !selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    if (messageType === "custom" && !customMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (messageType === "ai" && !selectedAgent) {
      toast.error("Please select an AI agent");
      return;
    }

    const templateObj = templates.find(t => t.id === selectedTemplate);

    sendSingleMessageMutation.mutate({
      contactId: selectedContactId,
      phone,
      name,
      messageType,
      templateName: templateObj?.name,
      customMessage: messageType === "custom" ? customMessage : undefined,
      agentId: messageType === "ai" ? selectedAgent : undefined,
    });
  };

  useEffect(() => {
    if (chats.length > 0 && !selectedChatId) {
      setSelectedChatId(chats[0].id);
    }
  }, [chats, selectedChatId]);

  // Mark messages as read when selecting a chat
  const markAsReadMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await fetch(`/api/chats/${contactId}/mark-read`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats/window"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.unreadCount > 0) {
      markAsReadMutation.mutate(chat.contactId);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChat || !selectedContactId) return;
    const phone = selectedChat.contact.phone.replace(/\D/g, '');
    sendMessageMutation.mutate({ 
      content: messageInput, 
      phone, 
      contactId: selectedContactId 
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === chats.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(chats.map(c => c.contactId));
    }
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId) 
        : [...prev, contactId]
    );
  };

  const handleBulkSend = () => {
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact");
      return;
    }

    let content = "";
    if (messageType === "template") {
      const template = templates.find(t => t.id === selectedTemplate);
      content = template?.content || "";
    } else if (messageType === "custom") {
      content = customMessage;
    } else if (messageType === "ai") {
      content = `[AI Agent: ${agents.find(a => a.id === selectedAgent)?.name || 'Unknown'}]`;
    }

    if (!content && messageType !== "ai") {
      toast.error("Please enter a message or select a template");
      return;
    }

    sendBulkMessageMutation.mutate({
      contacts: selectedContacts,
      messageType,
      content,
    });
  };

  const handleDownload = () => {
    const data = chats.map(chat => ({
      name: chat.contact.name,
      phone: chat.contact.phone,
      email: chat.contact.email || "",
      lastMessage: chat.lastMessage || "",
      windowExpires: chat.windowExpiresAt || "",
    }));

    const headers = ["Name", "Phone", "Email", "Last Message", "Window Expires"];
    const csv = [
      headers.join(","),
      ...data.map(row => 
        [row.name, row.phone, row.email, `"${row.lastMessage}"`, row.windowExpires].join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "24hour_window_contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("List downloaded successfully");
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes} min ago`;
    } else if (hours < 24) {
      return `${hours} hr ${minutes} min ago`;
    } else {
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        hour: "numeric", 
        minute: "2-digit", 
        hour12: true 
      });
    }
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return "Unknown";
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hr ${minutes} min left`;
  };

  const filteredChats = chats
    .filter(chat => 
      chat.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.contact.phone.includes(searchQuery)
    )
    .sort((a, b) => {
      const aTime = a.lastMessageTime || a.lastInboundMessageTime || a.windowExpiresAt || '';
      const bTime = b.lastMessageTime || b.lastInboundMessageTime || b.windowExpiresAt || '';
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  const approvedTemplates = templates.filter(t => t.status === "approved");

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-8 w-8 text-primary" />
              24-Hour Window Inbox
            </h2>
            <p className="text-muted-foreground">
              Customers who messaged in the last 24 hours. Send free-form messages without templates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download List
            </Button>
            {selectedContacts.length > 0 && (
              <Button onClick={() => setIsBulkSendOpen(true)}>
                <Send className="mr-2 h-4 w-4" />
                Send to {selectedContacts.length} Selected
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Checkbox 
            checked={selectedContacts.length === chats.length && chats.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm font-medium">Select All ({chats.length} contacts in window)</span>
          {selectedContacts.length > 0 && (
            <Badge variant="secondary">{selectedContacts.length} selected</Badge>
          )}
        </div>

        <div className="h-[calc(100vh-16rem)] flex bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="w-96 border-r border-border flex flex-col bg-background">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search contacts..." 
                  className="pl-9 bg-secondary/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {chatsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center px-4">
                  <Clock className="h-12 w-12 mb-4 opacity-50" />
                  <p>No contacts in 24-hour window</p>
                  <p className="text-xs mt-1">Contacts appear here when they message you</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredChats.map((chat) => (
                    <div 
                      key={chat.id} 
                      className={`p-4 flex items-start gap-3 hover:bg-muted/50 cursor-pointer transition-colors ${chat.id === selectedChatId ? 'bg-muted/50' : ''}`}
                    >
                      <Checkbox 
                        checked={selectedContacts.includes(chat.contactId)}
                        onCheckedChange={() => handleSelectContact(chat.contactId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div 
                        className="flex-1 flex items-start gap-3"
                        onClick={() => handleSelectChat(chat.id)}
                      >
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {chat.contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium truncate ${chat.unreadCount > 0 ? 'font-bold' : ''}`}>
                                {chat.contact.name}
                              </span>
                              {chat.unreadCount > 0 && (
                                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {chat.lastInboundMessageTime ? formatTime(chat.lastInboundMessageTime) : ""}
                            </span>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2 mb-2 border-l-2 border-blue-400">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">Customer Message:</p>
                            <p className="text-sm text-foreground truncate">
                              {chat.lastInboundMessage || "No customer message"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            <Clock className="h-3 w-3 mr-1" />
                            {getTimeRemaining(chat.windowExpiresAt)} left
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-zinc-900 bg-opacity-50">
            {selectedChat ? (
              <>
                <div className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedChat.contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{selectedChat.contact.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{selectedChat.contact.phone}</span>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Window: {getTimeRemaining(selectedChat.windowExpiresAt)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => setIsSingleSendOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send Message
                    </Button>
                    <Button variant="ghost" size="icon"><Phone className="h-5 w-5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon"><Video className="h-5 w-5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-muted-foreground" /></Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-6">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`
                              max-w-[70%] rounded-lg px-4 py-2 shadow-sm relative
                              ${msg.direction === 'outbound' 
                                ? 'bg-[#d9fdd3] dark:bg-primary/20 text-foreground rounded-tr-none' 
                                : 'bg-white dark:bg-card text-card-foreground rounded-tl-none'
                              }
                            `}
                          >
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            <span className="text-[10px] text-muted-foreground/80 block text-right mt-1">
                              {formatTime(msg.timestamp)}
                              {msg.direction === 'outbound' && (
                                <span className={`ml-1 ${msg.status === 'read' ? 'text-blue-500' : msg.status === 'failed' ? 'text-red-500' : ''}`}>
                                  {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : msg.status === 'failed' ? '✗' : '✓'}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 bg-background border-t border-border">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <Smile className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <Paperclip className="h-6 w-6" />
                    </Button>
                    <Input 
                      placeholder="Type a message (within 24-hour window)" 
                      className="flex-1 bg-secondary/50 border-none focus-visible:ring-1"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                    <Button 
                      size="icon" 
                      className="rounded-full h-10 w-10"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Clock className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a contact to chat</p>
                <p className="text-sm">Send messages without templates within the 24-hour window</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isBulkSendOpen} onOpenChange={setIsBulkSendOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Message to {selectedContacts.length} Contacts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm text-green-700 dark:text-green-400">
              <Clock className="h-4 w-4 inline mr-2" />
              All selected contacts are within the 24-hour window. You can send custom messages without templates.
            </div>

            <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="template" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Template
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Custom
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Agent
                </TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
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
                {selectedTemplate && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      {templates.find(t => t.id === selectedTemplate)?.content}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="custom" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Custom Message</Label>
                  <Textarea 
                    placeholder="Type your message here..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom messages work only within the 24-hour window after customer contact.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select AI Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an AI Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.filter(a => a.isActive).map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedAgent && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      {agents.find(a => a.id === selectedAgent)?.description || "AI Agent will generate personalized responses."}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkSendOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkSend} disabled={sendBulkMessageMutation.isPending}>
              {sendBulkMessageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send to {selectedContacts.length} Contacts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSingleSendOpen} onOpenChange={setIsSingleSendOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Message to {selectedChat?.contact.name || "Contact"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm text-green-700 dark:text-green-400">
              <Clock className="h-4 w-4 inline mr-2" />
              Within 24-hour window - You can send custom messages, templates, or AI agent responses.
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Sending to:</p>
              <p className="text-sm text-muted-foreground">{selectedChat?.contact.name} - {selectedChat?.contact.phone}</p>
            </div>

            <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="template" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Template
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Custom
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Agent
                </TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
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
                {selectedTemplate && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      {templates.find(t => t.id === selectedTemplate)?.content}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="custom" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Custom Message</Label>
                  <Textarea 
                    placeholder="Type your message here..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your message will be sent directly via WhatsApp.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select AI Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an AI Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.filter(a => a.isActive).map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedAgent && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      {agents.find(a => a.id === selectedAgent)?.description || "AI Agent will generate a personalized response."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      The AI will generate a contextual message and send it via WhatsApp. The conversation will appear below.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSingleSendOpen(false)}>Cancel</Button>
            <Button onClick={handleSingleSend} disabled={sendSingleMessageMutation.isPending}>
              {sendSingleMessageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
