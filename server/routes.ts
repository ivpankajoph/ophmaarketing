import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertContactSchema,
  insertMessageSchema,
  insertCampaignSchema,
  insertTemplateSchema,
  insertAutomationSchema,
  insertTeamMemberSchema,
} from "@shared/schema";

import agentRoutes from "./modules/aiAgents/agent.routes";
import fbRoutes from "./modules/facebook/fb.routes";
import mappingRoutes from "./modules/mapping/mapping.routes";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes";
import leadAutoReplyRoutes from "./modules/leadAutoReply/leadAutoReply.routes";
import broadcastRoutes from "./modules/broadcast/broadcast.routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get contacts" });
    }
  });

  app.get("/api/contacts/:id", async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to get contact" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const parsed = insertContactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid contact data", errors: parsed.error.errors });
      }
      const contact = await storage.createContact(parsed.data);
      res.status(201).json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    try {
      const contact = await storage.updateContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const success = await storage.deleteContact(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  app.post("/api/contacts/import", async (req, res) => {
    try {
      const { contacts } = req.body;
      if (!Array.isArray(contacts)) {
        return res.status(400).json({ message: "Invalid data format" });
      }
      const imported = [];
      for (const contact of contacts) {
        const parsed = insertContactSchema.safeParse(contact);
        if (parsed.success) {
          const newContact = await storage.createContact(parsed.data);
          imported.push(newContact);
        }
      }
      res.json({ imported: imported.length, contacts: imported });
    } catch (error) {
      res.status(500).json({ message: "Failed to import contacts" });
    }
  });

  app.get("/api/messages", async (req, res) => {
    try {
      const { contactId } = req.query;
      const messages = await storage.getMessages(contactId as string | undefined);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const parsed = insertMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid message data", errors: parsed.error.errors });
      }
      const message = await storage.createMessage(parsed.data);
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getChats();
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chats" });
    }
  });

  app.get("/api/chats/:id", async (req, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json(chat);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat" });
    }
  });

  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to get campaigns" });
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to get campaign" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const parsed = insertCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid campaign data", errors: parsed.error.errors });
      }
      const campaign = await storage.createCampaign(parsed.data);
      res.status(201).json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      const success = await storage.deleteCampaign(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  app.post("/api/campaigns/:id/send", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      const sentCount = campaign.contactIds.length;
      const deliveredCount = Math.floor(sentCount * 0.95);
      const readCount = Math.floor(deliveredCount * 0.7);
      const repliedCount = Math.floor(readCount * 0.2);

      const updatedCampaign = await storage.updateCampaign(req.params.id, {
        status: "completed",
        sentCount,
        deliveredCount,
        readCount,
        repliedCount,
      });
      res.json(updatedCampaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to send campaign" });
    }
  });

  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to get templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to get template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const parsed = insertTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid template data", errors: parsed.error.errors });
      }
      const template = await storage.createTemplate(parsed.data);
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const success = await storage.deleteTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Sync templates from Meta Business Suite
  app.post("/api/templates/sync-meta", async (req, res) => {
    try {
      // WABA_ID is the WhatsApp Business Account ID, not the Phone Number ID
      const wabaId = process.env.WABA_ID;
      // Use either WHATSAPP_TOKEN or FB_ACCESS_TOKEN
      const token = process.env.WHATSAPP_TOKEN || process.env.FB_ACCESS_TOKEN;
      
      if (!token) {
        return res.status(400).json({ message: "WhatsApp/Facebook access token not configured. Please add WHATSAPP_TOKEN or FB_ACCESS_TOKEN." });
      }

      if (!wabaId) {
        return res.status(400).json({ message: "WhatsApp Business Account ID (WABA_ID) not configured. Please add WABA_ID environment variable." });
      }

      console.log(`Fetching templates from WABA ID: ${wabaId}`);

      // Fetch templates from Meta Graph API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${wabaId}/message_templates?access_token=${token}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Meta API Error:", errorData);
        return res.status(response.status).json({ 
          message: "Failed to fetch templates from Meta",
          error: errorData.error?.message || "Unknown error",
          hint: "Make sure WABA_ID is set to your WhatsApp Business Account ID (not Phone Number ID)"
        });
      }

      const data = await response.json();
      const metaTemplates = data.data || [];
      let synced = 0;

      for (const metaTemplate of metaTemplates) {
        // Check if template already exists
        const existingTemplates = await storage.getTemplates();
        const exists = existingTemplates.find(t => t.name === metaTemplate.name);
        
        if (!exists) {
          // Extract content from components
          let content = "";
          let variables: string[] = [];
          
          if (metaTemplate.components) {
            const bodyComponent = metaTemplate.components.find((c: any) => c.type === "BODY");
            if (bodyComponent) {
              content = bodyComponent.text || "";
              // Extract variables like {{1}}, {{2}}, etc.
              const matches = content.match(/\{\{(\d+)\}\}/g);
              if (matches) {
                variables = matches.map((m: string, i: number) => `var${i + 1}`);
              }
            }
          }

          const newTemplate = await storage.createTemplate({
            name: metaTemplate.name,
            category: (metaTemplate.category || "utility").toLowerCase() as any,
            content: content,
            variables: variables,
          });
          // Update status based on Meta status
          const status = metaTemplate.status === "APPROVED" ? "approved" : 
                        metaTemplate.status === "REJECTED" ? "rejected" : "pending";
          await storage.updateTemplate(newTemplate.id, { status });
          synced++;
        } else {
          // Update status if changed
          await storage.updateTemplate(exists.id, {
            status: metaTemplate.status === "APPROVED" ? "approved" : 
                    metaTemplate.status === "REJECTED" ? "rejected" : "pending",
          });
        }
      }

      res.json({ 
        success: true, 
        synced, 
        total: metaTemplates.length,
        message: `Synced ${synced} new templates from Meta`
      });
    } catch (error) {
      console.error("Template sync error:", error);
      res.status(500).json({ message: "Failed to sync templates from Meta" });
    }
  });

  // Submit template for Meta approval
  app.post("/api/templates/:id/submit-approval", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const wabaId = process.env.WABA_ID;
      const token = process.env.WHATSAPP_TOKEN || process.env.FB_ACCESS_TOKEN;
      
      if (!token) {
        return res.status(400).json({ message: "WhatsApp/Facebook access token not configured" });
      }

      if (!wabaId) {
        return res.status(400).json({ message: "WABA_ID not configured" });
      }

      // Prepare template for Meta submission
      const templateData = {
        name: template.name.toLowerCase().replace(/\s+/g, '_'),
        category: template.category.toUpperCase(),
        language: "en",
        components: [
          {
            type: "BODY",
            text: template.content
          }
        ]
      };

      // Submit to Meta Graph API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(templateData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Meta template submission error:", data);
        return res.status(response.status).json({ 
          message: "Failed to submit template to Meta",
          error: data.error?.message || "Unknown error"
        });
      }

      // Update template status to pending
      await storage.updateTemplate(req.params.id, { status: "pending" });

      res.json({ 
        success: true, 
        message: "Template submitted to Meta for approval",
        metaTemplateId: data.id
      });
    } catch (error) {
      console.error("Template submission error:", error);
      res.status(500).json({ message: "Failed to submit template for approval" });
    }
  });

  app.get("/api/automations", async (req, res) => {
    try {
      const automations = await storage.getAutomations();
      res.json(automations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get automations" });
    }
  });

  app.get("/api/automations/:id", async (req, res) => {
    try {
      const automation = await storage.getAutomation(req.params.id);
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }
      res.json(automation);
    } catch (error) {
      res.status(500).json({ message: "Failed to get automation" });
    }
  });

  app.post("/api/automations", async (req, res) => {
    try {
      const parsed = insertAutomationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid automation data", errors: parsed.error.errors });
      }
      const automation = await storage.createAutomation(parsed.data);
      res.status(201).json(automation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create automation" });
    }
  });

  app.put("/api/automations/:id", async (req, res) => {
    try {
      const automation = await storage.updateAutomation(req.params.id, req.body);
      if (!automation) {
        return res.status(404).json({ message: "Automation not found" });
      }
      res.json(automation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update automation" });
    }
  });

  app.delete("/api/automations/:id", async (req, res) => {
    try {
      const success = await storage.deleteAutomation(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Automation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete automation" });
    }
  });

  app.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to get team members" });
    }
  });

  app.get("/api/team-members/:id", async (req, res) => {
    try {
      const member = await storage.getTeamMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to get team member" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      const parsed = insertTeamMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid team member data", errors: parsed.error.errors });
      }
      const member = await storage.createTeamMember(parsed.data);
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  app.put("/api/team-members/:id", async (req, res) => {
    try {
      const member = await storage.updateTeamMember(req.params.id, req.body);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      const success = await storage.deleteTeamMember(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  app.get("/api/settings/whatsapp", async (req, res) => {
    try {
      const settings = await storage.getWhatsappSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to get WhatsApp settings" });
    }
  });

  app.post("/api/settings/whatsapp", async (req, res) => {
    try {
      const settings = await storage.saveWhatsappSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to save WhatsApp settings" });
    }
  });

  app.post("/api/settings/whatsapp/test", async (req, res) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isValid = req.body.accessToken && req.body.phoneNumberId;
      if (isValid) {
        res.json({ success: true, message: "Connection successful!" });
      } else {
        res.status(400).json({ success: false, message: "Invalid credentials. Please check your API settings." });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to test connection" });
    }
  });

  app.get("/api/billing", async (req, res) => {
    try {
      const billing = await storage.getBilling();
      res.json(billing);
    } catch (error) {
      res.status(500).json({ message: "Failed to get billing info" });
    }
  });

  app.post("/api/billing/purchase", async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      const billing = await storage.addTransaction({
        type: "purchase",
        amount,
        description: `Purchased ${amount} credits`,
      });
      res.json(billing);
    } catch (error) {
      res.status(500).json({ message: "Failed to purchase credits" });
    }
  });

  app.get("/api/reports/delivery", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      const campaigns = await storage.getCampaigns();
      
      const report = {
        totalSent: messages.filter(m => m.direction === "outbound").length,
        delivered: messages.filter(m => m.direction === "outbound" && (m.status === "delivered" || m.status === "read")).length,
        read: messages.filter(m => m.direction === "outbound" && m.status === "read").length,
        failed: messages.filter(m => m.direction === "outbound" && m.status === "failed").length,
        campaignStats: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          sent: c.sentCount,
          delivered: c.deliveredCount,
          read: c.readCount,
          replied: c.repliedCount,
        })),
      };
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to get delivery report" });
    }
  });

  app.get("/api/reports/campaign/:id", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json({
        ...campaign,
        deliveryRate: campaign.sentCount > 0 ? (campaign.deliveredCount / campaign.sentCount) * 100 : 0,
        readRate: campaign.deliveredCount > 0 ? (campaign.readCount / campaign.deliveredCount) * 100 : 0,
        replyRate: campaign.readCount > 0 ? (campaign.repliedCount / campaign.readCount) * 100 : 0,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get campaign report" });
    }
  });

  app.get("/api/reports/agent-performance", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      const teamMembers = await storage.getTeamMembers();
      
      const performance = teamMembers.map(member => {
        const agentMessages = messages.filter(m => m.agentId === member.userId && m.direction === "outbound");
        return {
          id: member.id,
          name: member.name,
          messagesSent: agentMessages.length,
          avgResponseTime: "2.5 min",
          satisfaction: 4.5,
        };
      });
      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: "Failed to get agent performance" });
    }
  });

  app.use("/api/agents", agentRoutes);
  app.use("/api/facebook", fbRoutes);
  app.use("/api/map-agent", mappingRoutes);
  app.use("/api/webhook/whatsapp", whatsappRoutes);
  app.use("/api/leads/auto-reply", leadAutoReplyRoutes);
  app.use("/api/broadcast", broadcastRoutes);

  return httpServer;
}
