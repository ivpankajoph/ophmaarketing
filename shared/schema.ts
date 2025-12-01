import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(["admin", "agent"]).default("agent"),
  avatar: z.string().optional(),
  createdAt: z.string(),
});

export const contactSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const messageSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  content: z.string(),
  type: z.enum(["text", "image", "video", "document", "audio", "sticker", "location", "contacts"]).default("text"),
  mediaUrl: z.string().optional(),
  direction: z.enum(["inbound", "outbound"]),
  status: z.enum(["sent", "delivered", "read", "failed"]).default("sent"),
  timestamp: z.string(),
  agentId: z.string().optional(),
  replyToMessageId: z.string().optional(),
  replyToContent: z.string().optional(),
});

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  templateId: z.string().optional(),
  message: z.string(),
  contactIds: z.array(z.string()),
  status: z.enum(["draft", "scheduled", "running", "completed", "paused"]).default("draft"),
  scheduledAt: z.string().optional(),
  sentCount: z.number().default(0),
  deliveredCount: z.number().default(0),
  readCount: z.number().default(0),
  repliedCount: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["marketing", "utility", "authentication"]),
  content: z.string(),
  variables: z.array(z.string()).default([]),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const automationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["keyword", "welcome", "follow_up", "drip"]),
  trigger: z.string(),
  message: z.string(),
  delay: z.number().optional(),
  delayUnit: z.enum(["minutes", "hours", "days"]).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const teamMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["admin", "agent"]),
  permissions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
});

export const whatsappSettingsSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  phoneNumberId: z.string(),
  businessAccountId: z.string(),
  appId: z.string(),
  appSecret: z.string(),
  accessToken: z.string(),
  webhookUrl: z.string().optional(),
  isActive: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const billingSchema = z.object({
  id: z.string(),
  credits: z.number().default(0),
  transactions: z.array(z.object({
    id: z.string(),
    type: z.enum(["purchase", "usage"]),
    amount: z.number(),
    description: z.string(),
    createdAt: z.string(),
  })).default([]),
});

export const dashboardStatsSchema = z.object({
  totalMessages: z.number(),
  delivered: z.number(),
  readRate: z.number(),
  replied: z.number(),
  messagesChange: z.number(),
  deliveredChange: z.number(),
  readRateChange: z.number(),
  repliedChange: z.number(),
});

export const chatSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  contact: contactSchema,
  lastMessage: z.string().optional(),
  lastMessageTime: z.string().optional(),
  lastInboundMessageTime: z.string().optional(),
  unreadCount: z.number().default(0),
  assignedAgentId: z.string().optional(),
  status: z.enum(["open", "pending", "resolved"]).default("open"),
  notes: z.array(z.object({
    id: z.string(),
    content: z.string(),
    agentId: z.string(),
    createdAt: z.string(),
  })).default([]),
});

export type User = z.infer<typeof userSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type Template = z.infer<typeof templateSchema>;
export type Automation = z.infer<typeof automationSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type WhatsappSettings = z.infer<typeof whatsappSettingsSchema>;
export type Billing = z.infer<typeof billingSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type Chat = z.infer<typeof chatSchema>;

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true });
export const insertContactSchema = contactSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = messageSchema.omit({ id: true, timestamp: true });
export const insertCampaignSchema = campaignSchema.omit({ id: true, createdAt: true, updatedAt: true, sentCount: true, deliveredCount: true, readCount: true, repliedCount: true });
export const insertTemplateSchema = templateSchema.omit({ id: true, createdAt: true, updatedAt: true, status: true });
export const insertAutomationSchema = automationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamMemberSchema = teamMemberSchema.omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
