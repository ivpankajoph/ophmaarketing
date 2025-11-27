import { Request, Response } from 'express';
import { getMappingByFormId } from '../mapping/mapping.service';
import { getAgentById, getAllAgents } from '../aiAgents/agent.service';
import { generateAgentResponse } from '../openai/openai.service';
import { getLeadById, getAllLeads } from '../facebook/fb.service';
import { storage } from '../../storage';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN_NEW || process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'whatsapp_webhook_verify_token_2025';

interface ConversationHistory {
  [phone: string]: { role: 'user' | 'assistant'; content: string }[];
}

const conversationHistory: ConversationHistory = {};

export async function verifyWebhook(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('WhatsApp webhook verification:', { mode, token, challenge });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.log('Webhook verification failed');
  return res.sendStatus(403);
}

export async function handleWebhook(req: Request, res: Response) {
  try {
    const body = req.body;
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    const message = messages[0];
    const from = message.from;
    const messageText = message.text?.body || '';
    const messageType = message.type;

    console.log(`Received message from ${from}: ${messageText}`);

    // Save inbound message to storage and update chat
    await saveInboundMessage(from, messageText, messageType);

    if (messageType !== 'text' || !messageText) {
      return res.sendStatus(200);
    }

    const lead = findLeadByPhone(from);
    let agentToUse = null;

    if (lead) {
      const mapping = getMappingByFormId(lead.formId);
      if (mapping && mapping.isActive) {
        agentToUse = getAgentById(mapping.agentId);
      }
    }

    if (!agentToUse) {
      const agents = getAllAgents();
      agentToUse = agents.find((a: any) => a.isActive);
    }

    if (!agentToUse) {
      console.log('No active agent found');
      return res.sendStatus(200);
    }

    if (!conversationHistory[from]) {
      conversationHistory[from] = [];
    }
    conversationHistory[from].push({ role: 'user', content: messageText });

    const recentHistory = conversationHistory[from].slice(-10);

    const aiResponse = await generateAgentResponse(messageText, agentToUse, recentHistory.slice(0, -1));
    
    conversationHistory[from].push({ role: 'assistant', content: aiResponse });

    await sendWhatsAppMessage(from, aiResponse);
    
    // Save the AI response to storage
    await saveOutboundMessage(from, aiResponse);

    return res.sendStatus(200);
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.sendStatus(500);
  }
}

function findLeadByPhone(phone: string) {
  const leads = getAllLeads();
  const normalizedPhone = phone.replace(/\D/g, '');
  
  return leads.find(lead => {
    const leadPhone = (lead.phone || '').replace(/\D/g, '');
    return leadPhone.includes(normalizedPhone) || normalizedPhone.includes(leadPhone);
  });
}

async function saveInboundMessage(from: string, content: string, type: string) {
  try {
    const normalizedPhone = from.replace(/\D/g, '');
    
    // Find or create contact
    const contacts = await storage.getContacts();
    let contact = contacts.find(c => {
      const contactPhone = (c.phone || '').replace(/\D/g, '');
      return contactPhone.includes(normalizedPhone) || normalizedPhone.includes(contactPhone);
    });

    if (!contact) {
      // Create new contact
      contact = await storage.createContact({
        name: `WhatsApp ${from}`,
        phone: from,
        email: '',
        tags: ['WhatsApp'],
        notes: 'Auto-created from WhatsApp message',
      });
      console.log('Created new contact:', contact.id);
    }

    // Save the message
    const message = await storage.createMessage({
      contactId: contact.id,
      content: content || `[${type} message]`,
      type: 'text' as const,
      direction: 'inbound',
      status: 'sent' as const,
    });
    console.log('Saved inbound message:', message.id);

    // Update or create chat with lastInboundMessageTime
    await storage.updateChatInboundTime(contact.id);
    console.log('Updated chat inbound time for contact:', contact.id);

  } catch (error) {
    console.error('Error saving inbound message:', error);
  }
}

async function saveOutboundMessage(to: string, content: string) {
  try {
    const normalizedPhone = to.replace(/\D/g, '');
    
    // Find contact
    const contacts = await storage.getContacts();
    const contact = contacts.find(c => {
      const contactPhone = (c.phone || '').replace(/\D/g, '');
      return contactPhone.includes(normalizedPhone) || normalizedPhone.includes(contactPhone);
    });

    if (!contact) {
      console.log('Contact not found for outbound message:', to);
      return;
    }

    // Save the outbound message
    const message = await storage.createMessage({
      contactId: contact.id,
      content: content,
      type: 'text' as const,
      direction: 'outbound',
      status: 'sent' as const,
    });
    console.log('Saved outbound AI message:', message.id);

  } catch (error) {
    console.error('Error saving outbound message:', error);
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      throw new Error(`WhatsApp API error: ${error}`);
    }

    const data = await response.json();
    console.log('Message sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Recipient and message are required' });
    }

    const result = await sendWhatsAppMessage(to, message);
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
}

export async function getConversations(req: Request, res: Response) {
  try {
    const conversations = Object.entries(conversationHistory).map(([phone, messages]) => ({
      phone,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1],
    }));
    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
}

export async function getConversation(req: Request, res: Response) {
  try {
    const { phone } = req.params;
    const messages = conversationHistory[phone] || [];
    res.json({ phone, messages });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
}

// Send template message with support for named parameters
export async function sendTemplateMessage(
  to: string, 
  templateName: string, 
  languageCode: string = 'en', 
  components: any[] = [],
  namedParams?: { [key: string]: string }
) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error('WhatsApp credentials not configured');
  }

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
  
  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      }
    }
  };

  // If named parameters are provided, format them correctly for Meta API
  if (namedParams && Object.keys(namedParams).length > 0) {
    payload.template.components = [
      {
        type: 'body',
        parameters: Object.entries(namedParams).map(([paramName, value]) => ({
          type: 'text',
          parameter_name: paramName,
          text: value
        }))
      }
    ];
  } else if (components && components.length > 0) {
    // Use provided components array
    payload.template.components = components;
  }

  console.log(`[WhatsApp] Sending template "${templateName}" to ${to}:`, JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[WhatsApp] Template send error:', data);
      throw new Error(data.error?.message || 'Failed to send template');
    }

    console.log('[WhatsApp] Template sent successfully:', data);
    return data;
  } catch (error) {
    console.error('[WhatsApp] Error sending template:', error);
    throw error;
  }
}

export async function sendTemplateMessageEndpoint(req: Request, res: Response) {
  try {
    const { to, templateName, languageCode, components, namedParams } = req.body;
    
    if (!to || !templateName) {
      return res.status(400).json({ error: 'Recipient (to) and templateName are required' });
    }

    const result = await sendTemplateMessage(to, templateName, languageCode || 'en', components || [], namedParams);
    
    // Save outbound message to storage
    try {
      const normalizedPhone = to.replace(/\D/g, '');
      const contacts = await storage.getContacts();
      let contact = contacts.find(c => {
        const contactPhone = (c.phone || '').replace(/\D/g, '');
        return contactPhone.includes(normalizedPhone) || normalizedPhone.includes(contactPhone);
      });

      if (!contact) {
        contact = await storage.createContact({
          name: `WhatsApp ${to}`,
          phone: to,
          email: '',
          tags: ['WhatsApp'],
          notes: 'Auto-created from template message',
        });
      }

      await storage.createMessage({
        contactId: contact.id,
        content: `[Template: ${templateName}]`,
        type: 'text' as const,
        direction: 'outbound',
        status: 'sent' as const,
      });
    } catch (err) {
      console.error('Error saving outbound message:', err);
    }

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Error sending template:', error);
    res.status(500).json({ error: error.message || 'Failed to send template' });
  }
}
