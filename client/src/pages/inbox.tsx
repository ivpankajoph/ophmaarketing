import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Paperclip, Send, Smile, MoreVertical, Phone, Video, Loader2, Download, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  unreadCount: number;
  status: string;
  fromWindowInbox?: boolean;
}

export default function Inbox() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: chats = [], isLoading: chatsLoading } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
    queryFn: async () => {
      const res = await fetch("/api/chats");
      if (!res.ok) throw new Error("Failed to fetch chats");
      return res.json();
    },
    refetchInterval: 3000, // Auto-refresh every 3 seconds
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
    mutationFn: async (content: string) => {
      if (!selectedContactId) throw new Error("No contact selected");
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContactId,
          content,
          type: "text",
          direction: "outbound",
          status: "sent",
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedContactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setMessageInput("");
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  useEffect(() => {
    if (chats.length > 0 && !selectedChatId) {
      setSelectedChatId(chats[0].id);
    }
  }, [chats, selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate(messageInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.contact.phone.includes(searchQuery);
    const matchesFilter = filter === "all" || (filter === "unread" && chat.unreadCount > 0);
    return matchesSearch && matchesFilter;
  });

  const windowLeads = chats.filter(chat => {
    if (chat.lastInboundMessageTime) {
      const lastInbound = new Date(chat.lastInboundMessageTime);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastInbound.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 24;
    }
    return true;
  });

  const handleExportList = () => {
    const data = windowLeads.map(chat => ({
      name: chat.contact.name,
      phone: chat.contact.phone,
      email: chat.contact.email || "",
      lastMessage: chat.lastMessage || "",
      lastMessageTime: chat.lastMessageTime || "",
    }));

    const headers = ["Name", "Phone", "Email", "Last Message", "Last Message Time"];
    const csv = [
      headers.join(","),
      ...data.map(row => 
        [row.name, row.phone, row.email, `"${row.lastMessage}"`, row.lastMessageTime].join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inbox_leads_outside_window.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("List exported successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Inbox</h2>
            <p className="text-sm text-muted-foreground">
              All conversations. Contacts outside 24-hour window require templates.
            </p>
          </div>
          <Button variant="outline" onClick={handleExportList}>
            <Download className="mr-2 h-4 w-4" />
            Export List ({windowLeads.length})
          </Button>
        </div>

      <div className="h-[calc(100vh-12rem)] flex bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="w-80 border-r border-border flex flex-col bg-background">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search chats..." 
                className="pl-9 bg-secondary/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Badge 
                variant={filter === "all" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setFilter("all")}
              >
                All
              </Badge>
              <Badge 
                variant={filter === "unread" ? "default" : "outline"} 
                className="cursor-pointer hover:bg-secondary"
                onClick={() => setFilter("unread")}
              >
                Unread
              </Badge>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {chatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                No chats found
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredChats.map((chat) => (
                  <div 
                    key={chat.id} 
                    className={`p-4 flex items-start gap-3 hover:bg-muted/50 cursor-pointer transition-colors ${chat.id === selectedChatId ? 'bg-muted/50' : ''}`}
                    onClick={() => setSelectedChatId(chat.id)}
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {chat.contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{chat.contact.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {chat.lastMessageTime ? formatTime(chat.lastMessageTime) : ""}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                        {chat.unreadCount}
                      </div>
                    )}
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
                    <p className="text-xs text-muted-foreground">{selectedChat.contact.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                              <span className="ml-1">
                                {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
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
                    placeholder="Type a message" 
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
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
