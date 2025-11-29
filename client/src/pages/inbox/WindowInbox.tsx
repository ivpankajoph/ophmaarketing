import { useState, useEffect, useRef, useMemo } from "react";
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

interface ImportedContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
}

// Normalize phone number for comparison (strip all non-digits)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export default function WindowInbox() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isBulkSendOpen, setIsBulkSendOpen] = useState(false);
  const [messageType, setMessageType] = useState<"template" | "custom" | "ai">("custom");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Notification sound
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastUnreadCountRef = useRef<number>(0);
  const audioUnlockedRef = useRef<boolean>(false);
  
  // Initialize notification audio
  useEffect(() => {
    // Create audio element with a simple beep sound (base64 encoded short beep)
    const beepSound = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2telehs/hMGyjnYsT2fJ0sJxIBw4d7O5s4VYQXzQ182bhlltndzV0JqJe3aap7KopZmRjI+TmJ6cmZePhoJ+fHx8fH2AgYSGiYyPkZOVlZaWlpWUkpCNioaDgX9+fX19fn+BhIiMkJOXmpyenp6dnJqXlJGOioaDgYB/f4CBg4aJjZCTlpmbnZ2dnJqYlZKPjImGhIKBgICAgIGChYiLjpGUl5manJ2dnJuZl5WSkI2KiIaEg4KCgoKDhIaIi42QkpWXmZqbnJybmpiWlJKQjoqJh4aFhISEhISFhoiKjI6QkpSWmJmam5uamZeWlJKQjoyKiIeGhoWFhYWGh4iKjI6QkpSVl5iZmZmYl5aUkpCOjIqIh4aFhYWFhYaHiImLjI6QkpOVlpeYmJiXlpWUkpCOjIqIh4aFhYWFhYaHiImLjY+QkpOVlpeXl5eWlZSSkI+NjIqIh4aFhYWFhoaHiImLjI6PkZKUlZaWlpaVlJOSkI+NjIqJh4aGhYaGhoaHiImKjI2PkJGTlJWVlZWVlJOSkI+OjIuJiIeGhoaGhoaHiImKi42OkJGSk5SUlJSUk5KRkI+OjIuKiYiHh4aGh4eHiImKi4yNj5CRkpOTk5OTkpGQj46NjIuKiYiHh4eHh4eIiImKi4yNjpCQkZGSEpKSkZCPj46NjIuKiYiIh4eHh4iIiImKi4yNjo+QkZGRkZGRkI+Pjo2MjIuKiYmIiIeIiIiIiYmKi4yNjo+PkJCQkJCQj4+OjY2MjIuKiomIiIiIiIiJiYqKi4yNjY6Pj4+Pj4+Pjo6NjYyMi4uKiomJiIiIiIiJiYqKi4yMjY2Ojo6Ojo6OjY2NjIyMi4uKiomJiYiJiYmJiYqKi4uMjI2NjY2NjY2NjY2MjIyMi4uLioqJiYmJiYmJioqKi4uMjIyMjY2NjY2NjI2MjIyMi4uLioqKiomJiYmJiYqKiouLi4yMjI2NjY2MjIyMjIyMi4yLi4uKioqJiYmJiYqKioqLi4uMjIyMjIyMjIyMjIyMi4uLi4uKi4qKioqKioqKioqLi4uLjIyMjIyMjIyMjIyLi4uLi4uLioqKioqKioqKioqLi4uLi4yMjIyMjIyMjIuLi4uLi4uLioqKioqKioqKioqKi4uLi4yMjIyMjIyLi4uLi4uLi4uKioqKioqKioqKi4uLi4uLi4yMjIyMi4uLi4uLi4uLioqKioqKioqKioqLi4uLi4uMjIyMi4uLi4uLi4uLi4qKioqKioqKioqLi4uLi4uLjIyLi4uLi4uLi4uLi4qKioqKioqKioqLi4uLi4uLi4uLi4uLi4uLi4uLioqKioqKioqKi4uLi4uLi4uLi4uLi4uLi4uLi4qKioqKioqKi4uLi4uLi4uLi4uLi4uLi4uLi4qKioqKioqLi4uLi4uLi4uLi4uLi4uLi4uLioqKioqKi4uLi4uLi4uLi4uLi4uLi4uLi4qKioqKi4uLi4uLi4uLi4uLi4uLi4uLi4uKioqKi4uLi4uLi4uLi4uLi4uLi4uLi4uKioqLi4uLi4uLi4uLi4uLi4uLi4uLi4qKioqLi4uLi4uLi4uLi4uLi4uLi4uLi4qKi4uLi4uLi4uLi4uLi4uLi4uLi4uLioqLi4uLi4uLi4uLi4uLi4uLi4uLi4uKi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4qLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLg==";
    notificationAudioRef.current = new Audio(beepSound);
    notificationAudioRef.current.volume = 0.5;
    
    // Unlock audio on user interaction - mark as unlocked immediately
    const unlockAudio = () => {
      // Mark as unlocked after first user interaction
      audioUnlockedRef.current = true;
      
      if (notificationAudioRef.current) {
        // Try to play silently to fully unlock autoplay restrictions
        notificationAudioRef.current.play()
          .then(() => {
            notificationAudioRef.current?.pause();
            notificationAudioRef.current!.currentTime = 0;
          })
          .catch(() => {
            // Ignore errors - audio is still marked as unlocked
          });
      }
    };
    
    // Add listeners for common user interactions
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);

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

  // Fetch contacts for name lookup
  const { data: importedContacts = [] } = useQuery<ImportedContact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
  });

  // Create phone-to-name lookup maps for flexible matching (memoized)
  // Only include contacts with real names (not auto-generated "WhatsApp XXX" names)
  const { phoneToNameMap, last10ToNameMap } = useMemo(() => {
    const phoneMap = new Map<string, string>();
    const last10Map = new Map<string, string>();
    
    // Helper to check if name is a real name (not auto-generated)
    const isRealName = (name: string): boolean => {
      if (!name || !name.trim()) return false;
      if (name.startsWith('WhatsApp')) return false;
      if (name.startsWith('+')) return false;
      // Check if it's just digits (possibly with spaces)
      if (/^\d[\d\s]*$/.test(name)) return false;
      return true;
    };
    
    importedContacts.forEach(contact => {
      const normalizedPhone = normalizePhone(contact.phone);
      if (isRealName(contact.name)) {
        // Store with full number
        phoneMap.set(normalizedPhone, contact.name);
        // Store with last 10 digits for matching with/without country code
        if (normalizedPhone.length >= 10) {
          last10Map.set(normalizedPhone.slice(-10), contact.name);
        }
      }
    });
    
    return { phoneToNameMap: phoneMap, last10ToNameMap: last10Map };
  }, [importedContacts]);

  // Function to get contact name from phone
  const getContactName = useMemo(() => {
    return (chatContact: Contact): string => {
      const normalizedPhone = normalizePhone(chatContact.phone);
      
      // First check if the chat contact already has a real name (not phone-based)
      if (chatContact.name && 
          !chatContact.name.startsWith('WhatsApp') && 
          !chatContact.name.startsWith('+') &&
          !/^\d+$/.test(chatContact.name.replace(/\s/g, ''))) {
        return chatContact.name;
      }
      
      // Look up name from imported contacts - try exact match first
      let name = phoneToNameMap.get(normalizedPhone);
      if (name) return name;
      
      // Try matching with last 10 digits (handles country code differences)
      if (normalizedPhone.length >= 10) {
        const last10 = normalizedPhone.slice(-10);
        name = last10ToNameMap.get(last10);
        if (name) return name;
      }
      
      // Fallback to formatted phone number
      return chatContact.phone.startsWith('+') ? chatContact.phone : `+${chatContact.phone}`;
    };
  }, [phoneToNameMap, last10ToNameMap]);

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const selectedContactId = selectedChat?.contactId;

  // Play notification sound when new messages arrive
  const isInitialMount = useRef<boolean>(true);
  
  useEffect(() => {
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    
    // Skip initial mount to avoid playing sound on page load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastUnreadCountRef.current = totalUnread;
      return;
    }
    
    // Play sound if unread count increased (new message received)
    if (totalUnread > lastUnreadCountRef.current) {
      if (notificationAudioRef.current && audioUnlockedRef.current) {
        notificationAudioRef.current.currentTime = 0;
        notificationAudioRef.current.play().catch(() => {});
      }
    }
    
    lastUnreadCountRef.current = totalUnread;
  }, [chats]);

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
      const results: { success: number; failed: number } = { success: 0, failed: 0 };
      
      for (const contactId of data.contacts) {
        const chat = chats.find(c => c.contactId === contactId);
        if (!chat) continue;
        
        const phone = chat.contact.phone.replace(/\D/g, '');
        const name = chat.contact.name;
        const templateObj = templates.find(t => t.id === selectedTemplate);
        
        try {
          const res = await fetch("/api/inbox/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contactId,
              phone,
              name,
              messageType: data.messageType,
              templateName: templateObj?.name,
              customMessage: data.messageType === "custom" ? data.content : undefined,
              agentId: data.messageType === "ai" ? selectedAgent : undefined,
            }),
          });
          
          if (res.ok) {
            results.success++;
          } else {
            results.failed++;
          }
        } catch {
          results.failed++;
        }
      }
      
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats/window"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setSelectedContacts([]);
      setIsBulkSendOpen(false);
      setCustomMessage("");
      setSelectedTemplate("");
      setSelectedAgent("");
      if (data.failed > 0) {
        toast.success(`Sent to ${data.success} contacts, ${data.failed} failed`);
      } else {
        toast.success(`Message sent to ${data.success} contact${data.success > 1 ? 's' : ''}`);
      }
    },
    onError: () => {
      toast.error("Failed to send messages");
    },
  });

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

  const getInitials = (contact: Contact) => {
    const displayName = getContactName(contact);
    if (displayName.startsWith('+')) {
      return displayName.slice(-2);
    }
    return displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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
                            {getInitials(chat.contact)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium truncate ${chat.unreadCount > 0 ? 'font-bold' : ''}`}>
                                {getContactName(chat.contact)}
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
                        {getInitials(selectedChat.contact)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{getContactName(selectedChat.contact)}</h3>
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
              Send to {selectedContacts.length} Contact{selectedContacts.length > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
