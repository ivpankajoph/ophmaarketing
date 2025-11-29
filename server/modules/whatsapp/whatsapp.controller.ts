import { Request, Response } from 'express';
import { getMappingByFormId } from '../mapping/mapping.service';
import { getAgentById, getAllAgents } from '../aiAgents/agent.service';
import { generateAgentResponse } from '../openai/openai.service';
import { getAllLeads } from '../facebook/fb.service';
import { storage } from '../../storage';
import * as aiAnalytics from '../aiAnalytics/aiAnalytics.service';
import * as broadcastService from '../broadcast/broadcast.service';

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
    const messageType = message.type;
    
    // Extract message content based on type
    let messageText = '';
    let buttonPayload = '';
    
    if (messageType === 'text') {
      messageText = message.text?.body || '';
    } else if (messageType === 'button') {
      // Quick reply button response
      messageText = message.button?.text || '';
      buttonPayload = message.button?.payload || '';
      console.log(`Button response from ${from}: text="${messageText}", payload="${buttonPayload}"`);
    } else if (messageType === 'interactive') {
      // Interactive message response (button_reply or list_reply)
      const interactive = message.interactive;
      if (interactive?.type === 'button_reply') {
        messageText = interactive.button_reply?.title || '';
        buttonPayload = interactive.button_reply?.id || '';
        console.log(`Interactive button reply from ${from}: title="${messageText}", id="${buttonPayload}"`);
      } else if (interactive?.type === 'list_reply') {
        messageText = interactive.list_reply?.title || '';
        buttonPayload = interactive.list_reply?.id || '';
        console.log(`Interactive list reply from ${from}: title="${messageText}", id="${buttonPayload}"`);
      }
    }

    console.log(`Received ${messageType} message from ${from}: ${messageText}`);

    // Save the inbound message with actual button text
    await saveInboundMessage(from, messageText || buttonPayload, messageType, buttonPayload);

    // Process message if we have content (text, button, or interactive)
    if (!messageText && !buttonPayload) {
      console.log(`No processable content for message type: ${messageType}`);
      return res.sendStatus(200);
    }
    
    // Use messageText or buttonPayload for AI processing
    const contentForAI = messageText || buttonPayload;

    // Check if this is a button response - send fixed thank you message
    const isButtonResponse = messageType === 'button' || messageType === 'interactive';
    
    if (isButtonResponse) {
      // Send fixed thank you message for button responses
      const thankYouMessage = "Thanks for your feedback, we will keep in touch with you soon.";
      
      await sendWhatsAppMessage(from, thankYouMessage);
      await saveOutboundMessage(from, thankYouMessage);
      
      console.log(`Button response auto-reply sent to ${from}: ${thankYouMessage}`);
      return res.sendStatus(200);
    }

    // For regular text messages, use AI agent
    const lead = await findLeadByPhone(from);
    let agentToUse = null;

    if (lead) {
      const mapping = await getMappingByFormId(lead.formId);
      if (mapping && mapping.isActive) {
        agentToUse = await getAgentById(mapping.agentId);
      }
    }

    if (!agentToUse) {
      const agents = await getAllAgents();
      agentToUse = agents.find((a: any) => a.isActive);
    }

    if (!agentToUse) {
      console.log('No active agent found');
      return res.sendStatus(200);
    }

    if (!conversationHistory[from]) {
      conversationHistory[from] = [];
    }
    conversationHistory[from].push({ role: 'user', content: contentForAI });

    const recentHistory = conversationHistory[from].slice(-10);

    const aiResponse = await generateAgentResponse(contentForAI, agentToUse, recentHistory.slice(0, -1));
    
    conversationHistory[from].push({ role: 'assistant', content: aiResponse });

    await sendWhatsAppMessage(from, aiResponse);
    
    await saveOutboundMessage(from, aiResponse);

    console.log(`AI auto-reply sent to ${from}: ${aiResponse.substring(0, 100)}...`);

    return res.sendStatus(200);
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.sendStatus(500);
  }
}

async function findLeadByPhone(phone: string) {
  const leads = await getAllLeads();
  const normalizedPhone = phone.replace(/\D/g, '');
  
  return leads.find(lead => {
    const leadPhone = (lead.phone || '').replace(/\D/g, '');
    return leadPhone.includes(normalizedPhone) || normalizedPhone.includes(leadPhone);
  });
}

async function saveInboundMessage(from: string, content: string, type: string, buttonPayload?: string) {
  try {
    const normalizedPhone = from.replace(/\D/g, '');
    
    // Mark broadcast logs as replied when we receive a message from this phone
    try {
      const repliedCount = await broadcastService.markBroadcastLogAsReplied(from);
      if (repliedCount > 0) {
        console.log(`[Webhook] Marked ${repliedCount} broadcast logs as replied for ${from}`);
      }
    } catch (err) {
      console.error('[Webhook] Error marking broadcast as replied:', err);
    }
    
    const contacts = await storage.getContacts();
    let contact = contacts.find(c => {
      const contactPhone = (c.phone || '').replace(/\D/g, '');
      return contactPhone.includes(normalizedPhone) || normalizedPhone.includes(contactPhone);
    });

    if (!contact) {
      contact = await storage.createContact({
        name: `WhatsApp ${from}`,
        phone: from,
        email: '',
        tags: ['WhatsApp'],
        notes: 'Auto-created from WhatsApp message',
      });
      console.log('Created new contact:', contact.id);
    }

    // Format message content based on type
    let displayContent = content;
    if (type === 'button' || type === 'interactive') {
      // Show button text with payload info for clarity
      displayContent = content;
      if (buttonPayload && buttonPayload !== content) {
        displayContent = `${content} [Button: ${buttonPayload}]`;
      }
    }

    const message = await storage.createMessage({
      contactId: contact.id,
      content: displayContent || `[${type} message]`,
      type: 'text' as const,
      direction: 'inbound',
      status: 'sent' as const,
    });
    console.log('Saved inbound message:', message.id);

    await storage.updateChatInboundTime(contact.id);
    console.log('Updated chat inbound time for contact:', contact.id);

    try {
      const lead = await findLeadByPhone(from);
      let agentToUse = null;
      let source: 'ai_chat' | 'campaign' | 'ad' | 'lead_form' | 'manual' = 'ai_chat';
      
      if (lead) {
        source = 'lead_form';
        const mapping = await getMappingByFormId(lead.formId);
        if (mapping && mapping.isActive) {
          agentToUse = await getAgentById(mapping.agentId);
        }
      }
      
      if (!agentToUse) {
        const agents = await getAllAgents();
        agentToUse = agents.find((a: any) => a.isActive);
      }
      
      await aiAnalytics.createOrUpdateQualification(
        from,
        contact.name || `WhatsApp ${from}`,
        content,
        source,
        {
          contactId: contact.id,
          agentId: agentToUse?.id,
          agentName: agentToUse?.name,
        }
      );
      console.log('Tracked AI qualification for:', from);
    } catch (analyticsError) {
      console.error('Error tracking AI qualification:', analyticsError);
    }

  } catch (error) {
    console.error('Error saving inbound message:', error);
  }
}

async function saveOutboundMessage(to: string, content: string) {
  try {
    const normalizedPhone = to.replace(/\D/g, '');
    
    const contacts = await storage.getContacts();
    const contact = contacts.find(c => {
      const contactPhone = (c.phone || '').replace(/\D/g, '');
      return contactPhone.includes(normalizedPhone) || normalizedPhone.includes(contactPhone);
    });

    if (!contact) {
      console.log('Contact not found for outbound message:', to);
      return;
    }

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

    const languageCodesToTry = languageCode ? [languageCode] : ['en', 'en_US', 'en_GB'];
    let result = null;
    let lastError = null;

    for (const langCode of languageCodesToTry) {
      try {
        console.log(`[WhatsApp] Trying template "${templateName}" with language code: ${langCode}`);
        result = await sendTemplateMessage(to, templateName, langCode, components || [], namedParams);
        console.log(`[WhatsApp] Success with language code: ${langCode}`);
        break;
      } catch (err: any) {
        lastError = err;
        console.log(`[WhatsApp] Failed with language code ${langCode}: ${err.message}`);
      }
    }

    if (!result) {
      throw lastError || new Error('Failed to send template with all language codes');
    }
    
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
