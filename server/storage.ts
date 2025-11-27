import {
  type User,
  type Contact,
  type Message,
  type Campaign,
  type Template,
  type Automation,
  type TeamMember,
  type WhatsappSettings,
  type Billing,
  type Chat,
  type InsertUser,
  type InsertContact,
  type InsertMessage,
  type InsertCampaign,
  type InsertTemplate,
  type InsertAutomation,
  type InsertTeamMember,
} from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = "./data";
const DATA_FILE = path.join(DATA_DIR, "storage.json");

interface StorageData {
  users: User[];
  contacts: Contact[];
  messages: Message[];
  campaigns: Campaign[];
  templates: Template[];
  automations: Automation[];
  teamMembers: TeamMember[];
  whatsappSettings: WhatsappSettings | null;
  billing: Billing;
  chats: Chat[];
}

function loadData(): StorageData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
  return getDefaultData();
}

function saveData(data: StorageData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

function getDefaultData(): StorageData {
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: "user-1",
        username: "admin",
        password: "admin123",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
        createdAt: now,
      },
    ],
    contacts: [
      { id: "contact-1", name: "John Smith", phone: "+1234567890", email: "john@email.com", tags: ["Customer", "VIP"], notes: "Regular customer", createdAt: now, updatedAt: now },
      { id: "contact-2", name: "Sarah Johnson", phone: "+1234567891", email: "sarah@email.com", tags: ["Hot Lead"], notes: "Interested in premium plan", createdAt: now, updatedAt: now },
      { id: "contact-3", name: "Mike Wilson", phone: "+1234567892", email: "mike@email.com", tags: ["Customer"], notes: "", createdAt: now, updatedAt: now },
      { id: "contact-4", name: "Emily Brown", phone: "+1234567893", email: "emily@email.com", tags: ["New Lead"], notes: "From Facebook campaign", createdAt: now, updatedAt: now },
      { id: "contact-5", name: "David Lee", phone: "+1234567894", email: "david@email.com", tags: ["Customer", "Enterprise"], notes: "Enterprise client", createdAt: now, updatedAt: now },
    ],
    messages: [
      { id: "msg-1", contactId: "contact-1", content: "Hi, I need help with my order", type: "text", direction: "inbound", status: "read", timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: "msg-2", contactId: "contact-1", content: "Sure! Let me check that for you. Can you provide your order number?", type: "text", direction: "outbound", status: "delivered", timestamp: new Date(Date.now() - 3500000).toISOString(), agentId: "user-1" },
      { id: "msg-3", contactId: "contact-1", content: "Order #12345", type: "text", direction: "inbound", status: "read", timestamp: new Date(Date.now() - 3400000).toISOString() },
      { id: "msg-4", contactId: "contact-2", content: "Hello! I saw your ad and I'm interested", type: "text", direction: "inbound", status: "read", timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: "msg-5", contactId: "contact-2", content: "Great to hear! What would you like to know more about?", type: "text", direction: "outbound", status: "delivered", timestamp: new Date(Date.now() - 7100000).toISOString(), agentId: "user-1" },
      { id: "msg-6", contactId: "contact-3", content: "Thanks for the quick delivery!", type: "text", direction: "inbound", status: "read", timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: "msg-7", contactId: "contact-4", content: "Hi, can you tell me more about your services?", type: "text", direction: "inbound", status: "sent", timestamp: new Date(Date.now() - 1800000).toISOString() },
    ],
    campaigns: [
      { id: "camp-1", name: "Black Friday Sale", message: "Hi {{name}}! Exclusive 50% off for our loyal customers. Use code BLACKFRIDAY50", contactIds: ["contact-1", "contact-3", "contact-5"], status: "completed", sentCount: 3, deliveredCount: 3, readCount: 2, repliedCount: 1, createdAt: now, updatedAt: now },
      { id: "camp-2", name: "New Product Launch", message: "Hi {{name}}! Introducing our new premium product line. Check it out!", contactIds: ["contact-1", "contact-2", "contact-3", "contact-4", "contact-5"], status: "scheduled", scheduledAt: new Date(Date.now() + 86400000).toISOString(), sentCount: 0, deliveredCount: 0, readCount: 0, repliedCount: 0, createdAt: now, updatedAt: now },
    ],
    templates: [
      { id: "tmpl-1", name: "Welcome Message", category: "utility", content: "Hello {{name}}! Welcome to our service. How can we help you today?", variables: ["name"], status: "approved", createdAt: now, updatedAt: now },
      { id: "tmpl-2", name: "Order Confirmation", category: "utility", content: "Hi {{name}}, your order #{{order_id}} has been confirmed. Expected delivery: {{delivery_date}}", variables: ["name", "order_id", "delivery_date"], status: "approved", createdAt: now, updatedAt: now },
      { id: "tmpl-3", name: "Special Offer", category: "marketing", content: "Hi {{name}}! Get {{discount}}% off on your next purchase. Valid until {{expiry}}", variables: ["name", "discount", "expiry"], status: "pending", createdAt: now, updatedAt: now },
    ],
    automations: [
      { id: "auto-1", name: "Welcome Reply", type: "welcome", trigger: "new_contact", message: "Welcome! Thanks for reaching out. An agent will be with you shortly.", isActive: true, createdAt: now, updatedAt: now },
      { id: "auto-2", name: "Pricing Keyword", type: "keyword", trigger: "pricing", message: "Here are our pricing options:\n- Basic: $29/mo\n- Pro: $79/mo\n- Enterprise: Contact us", isActive: true, createdAt: now, updatedAt: now },
      { id: "auto-3", name: "Follow-up Reminder", type: "follow_up", trigger: "no_reply", message: "Hi! Just checking in. Is there anything else you need help with?", delay: 24, delayUnit: "hours", isActive: true, createdAt: now, updatedAt: now },
    ],
    teamMembers: [
      { id: "team-1", userId: "user-1", name: "Admin User", email: "admin@example.com", role: "admin", permissions: ["all"], isActive: true, createdAt: now },
    ],
    whatsappSettings: null,
    billing: {
      id: "billing-1",
      credits: 1500,
      transactions: [
        { id: "txn-1", type: "purchase", amount: 2000, description: "Credits purchased", createdAt: new Date(Date.now() - 604800000).toISOString() },
        { id: "txn-2", type: "usage", amount: -500, description: "Campaign: Black Friday Sale", createdAt: new Date(Date.now() - 172800000).toISOString() },
      ],
    },
    chats: [],
  };
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  getMessages(contactId?: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<Template>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  getAutomations(): Promise<Automation[]>;
  getAutomation(id: string): Promise<Automation | undefined>;
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  updateAutomation(id: string, automation: Partial<Automation>): Promise<Automation | undefined>;
  deleteAutomation(id: string): Promise<boolean>;
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, member: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<boolean>;
  getWhatsappSettings(): Promise<WhatsappSettings | null>;
  saveWhatsappSettings(settings: Omit<WhatsappSettings, "id" | "createdAt" | "updatedAt">): Promise<WhatsappSettings>;
  getBilling(): Promise<Billing>;
  updateBilling(billing: Partial<Billing>): Promise<Billing>;
  addTransaction(transaction: { type: "purchase" | "usage"; amount: number; description: string }): Promise<Billing>;
  getDashboardStats(): Promise<any>;
  getChats(): Promise<Chat[]>;
  getChat(id: string): Promise<Chat | undefined>;
}

export class MemStorage implements IStorage {
  private data: StorageData;

  constructor() {
    this.data = loadData();
    this.initializeChats();
  }

  private save(): void {
    saveData(this.data);
  }

  private initializeChats(): void {
    this.data.chats = this.data.contacts.map((contact) => {
      const contactMessages = this.data.messages.filter((m) => m.contactId === contact.id);
      const lastMessage = contactMessages[contactMessages.length - 1];
      return {
        id: `chat-${contact.id}`,
        contactId: contact.id,
        contact,
        lastMessage: lastMessage?.content,
        lastMessageTime: lastMessage?.timestamp,
        unreadCount: contactMessages.filter((m) => m.direction === "inbound" && m.status !== "read").length,
        status: "open" as const,
        notes: [],
      };
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.data.users.find((u) => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.data.users.find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  async getContacts(): Promise<Contact[]> {
    return this.data.contacts;
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return this.data.contacts.find((c) => c.id === id);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const now = new Date().toISOString();
    const newContact: Contact = {
      ...contact,
      id: randomUUID(),
      tags: contact.tags || [],
      createdAt: now,
      updatedAt: now,
    };
    this.data.contacts.push(newContact);
    this.initializeChats();
    this.save();
    return newContact;
  }

  async updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact | undefined> {
    const index = this.data.contacts.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    this.data.contacts[index] = {
      ...this.data.contacts[index],
      ...contact,
      updatedAt: new Date().toISOString(),
    };
    this.initializeChats();
    this.save();
    return this.data.contacts[index];
  }

  async deleteContact(id: string): Promise<boolean> {
    const index = this.data.contacts.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.data.contacts.splice(index, 1);
    this.data.messages = this.data.messages.filter((m) => m.contactId !== id);
    this.initializeChats();
    this.save();
    return true;
  }

  async getMessages(contactId?: string): Promise<Message[]> {
    if (contactId) {
      return this.data.messages.filter((m) => m.contactId === contactId);
    }
    return this.data.messages;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.data.messages.find((m) => m.id === id);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.data.messages.push(newMessage);
    this.initializeChats();
    this.save();
    return newMessage;
  }

  async getCampaigns(): Promise<Campaign[]> {
    return this.data.campaigns;
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.data.campaigns.find((c) => c.id === id);
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const now = new Date().toISOString();
    const newCampaign: Campaign = {
      ...campaign,
      id: randomUUID(),
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      repliedCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.data.campaigns.push(newCampaign);
    this.save();
    return newCampaign;
  }

  async updateCampaign(id: string, campaign: Partial<Campaign>): Promise<Campaign | undefined> {
    const index = this.data.campaigns.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    this.data.campaigns[index] = {
      ...this.data.campaigns[index],
      ...campaign,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.campaigns[index];
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const index = this.data.campaigns.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.data.campaigns.splice(index, 1);
    this.save();
    return true;
  }

  async getTemplates(): Promise<Template[]> {
    return this.data.templates;
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.data.templates.find((t) => t.id === id);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const now = new Date().toISOString();
    const newTemplate: Template = {
      ...template,
      id: randomUUID(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    this.data.templates.push(newTemplate);
    this.save();
    return newTemplate;
  }

  async updateTemplate(id: string, template: Partial<Template>): Promise<Template | undefined> {
    const index = this.data.templates.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    this.data.templates[index] = {
      ...this.data.templates[index],
      ...template,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.templates[index];
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const index = this.data.templates.findIndex((t) => t.id === id);
    if (index === -1) return false;
    this.data.templates.splice(index, 1);
    this.save();
    return true;
  }

  async getAutomations(): Promise<Automation[]> {
    return this.data.automations;
  }

  async getAutomation(id: string): Promise<Automation | undefined> {
    return this.data.automations.find((a) => a.id === id);
  }

  async createAutomation(automation: InsertAutomation): Promise<Automation> {
    const now = new Date().toISOString();
    const newAutomation: Automation = {
      ...automation,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.data.automations.push(newAutomation);
    this.save();
    return newAutomation;
  }

  async updateAutomation(id: string, automation: Partial<Automation>): Promise<Automation | undefined> {
    const index = this.data.automations.findIndex((a) => a.id === id);
    if (index === -1) return undefined;
    this.data.automations[index] = {
      ...this.data.automations[index],
      ...automation,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.automations[index];
  }

  async deleteAutomation(id: string): Promise<boolean> {
    const index = this.data.automations.findIndex((a) => a.id === id);
    if (index === -1) return false;
    this.data.automations.splice(index, 1);
    this.save();
    return true;
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    return this.data.teamMembers;
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    return this.data.teamMembers.find((m) => m.id === id);
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const newMember: TeamMember = {
      ...member,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.data.teamMembers.push(newMember);
    this.save();
    return newMember;
  }

  async updateTeamMember(id: string, member: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const index = this.data.teamMembers.findIndex((m) => m.id === id);
    if (index === -1) return undefined;
    this.data.teamMembers[index] = {
      ...this.data.teamMembers[index],
      ...member,
    };
    this.save();
    return this.data.teamMembers[index];
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    const index = this.data.teamMembers.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.data.teamMembers.splice(index, 1);
    this.save();
    return true;
  }

  async getWhatsappSettings(): Promise<WhatsappSettings | null> {
    return this.data.whatsappSettings;
  }

  async saveWhatsappSettings(settings: Omit<WhatsappSettings, "id" | "createdAt" | "updatedAt">): Promise<WhatsappSettings> {
    const now = new Date().toISOString();
    this.data.whatsappSettings = {
      ...settings,
      id: this.data.whatsappSettings?.id || randomUUID(),
      createdAt: this.data.whatsappSettings?.createdAt || now,
      updatedAt: now,
    };
    this.save();
    return this.data.whatsappSettings;
  }

  async getBilling(): Promise<Billing> {
    return this.data.billing;
  }

  async updateBilling(billing: Partial<Billing>): Promise<Billing> {
    this.data.billing = {
      ...this.data.billing,
      ...billing,
    };
    this.save();
    return this.data.billing;
  }

  async addTransaction(transaction: { type: "purchase" | "usage"; amount: number; description: string }): Promise<Billing> {
    const newTransaction = {
      id: randomUUID(),
      ...transaction,
      createdAt: new Date().toISOString(),
    };
    this.data.billing.transactions.push(newTransaction);
    this.data.billing.credits += transaction.amount;
    this.save();
    return this.data.billing;
  }

  async getDashboardStats(): Promise<any> {
    const messages = this.data.messages;
    const outbound = messages.filter((m) => m.direction === "outbound");
    const delivered = outbound.filter((m) => m.status === "delivered" || m.status === "read");
    const read = outbound.filter((m) => m.status === "read");
    const inbound = messages.filter((m) => m.direction === "inbound");

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekMessages = messages.filter((m) => new Date(m.timestamp) > weekAgo);
    const lastWeekMessages = messages.filter((m) => {
      const msgDate = new Date(m.timestamp);
      return msgDate > new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && msgDate <= weekAgo;
    });

    const thisWeekOutbound = thisWeekMessages.filter((m) => m.direction === "outbound").length;
    const lastWeekOutbound = lastWeekMessages.filter((m) => m.direction === "outbound").length || 1;

    const dailyActivity = [];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayMessages = messages.filter((m) => {
        const msgDate = new Date(m.timestamp);
        return msgDate.toDateString() === date.toDateString();
      });
      dailyActivity.push({
        day: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
        sent: dayMessages.filter((m) => m.direction === "outbound").length,
        delivered: dayMessages.filter((m) => m.direction === "outbound" && (m.status === "delivered" || m.status === "read")).length,
        read: dayMessages.filter((m) => m.direction === "outbound" && m.status === "read").length,
      });
    }

    const campaignPerformance = this.data.campaigns.slice(0, 5).map((c) => ({
      name: c.name,
      delivered: c.deliveredCount,
      read: c.readCount,
    }));

    return {
      totalMessages: outbound.length,
      delivered: delivered.length,
      readRate: outbound.length > 0 ? Math.round((read.length / outbound.length) * 100 * 10) / 10 : 0,
      replied: inbound.length,
      messagesChange: Math.round(((thisWeekOutbound - lastWeekOutbound) / lastWeekOutbound) * 100 * 10) / 10,
      deliveredChange: 2.1,
      readRateChange: 5.4,
      repliedChange: -1.2,
      dailyActivity,
      campaignPerformance,
    };
  }

  async getChats(): Promise<Chat[]> {
    return this.data.chats;
  }

  async getChat(id: string): Promise<Chat | undefined> {
    return this.data.chats.find((c) => c.id === id);
  }
}

export const storage = new MemStorage();
