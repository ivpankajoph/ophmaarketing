import { Request, Response } from 'express';
import { getMappingByFormId } from '../mapping/mapping.service';
import { getAgentById, getAllAgents } from '../aiAgents/agent.service';
import { generateAgentResponse } from '../openai/openai.service';
import { getAllLeads } from '../facebook/fb.service';
import { storage } from '../../storage';
import * as aiAnalytics from '../aiAnalytics/aiAnalytics.service';
import * as broadcastService from '../broadcast/broadcast.service';
import * as contactAgentService from '../contactAgent/contactAgent.service';
import * as prefilledTextService from '../prefilledText/prefilledText.service';
import { credentialsService } from '../credentials/credentials.service';
import * as whatsappService from './whatsapp.service';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN_NEW || process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'whatsapp_webhook_verify_token_2025';

async function resolveUserIdFromPhoneNumberId(phoneNumberId: string): Promise<string | undefined> {
  try {
    const result = await credentialsService.getCredentialsByPhoneNumberId(phoneNumberId);
    if (result) {
      console.log(`[Webhook] Resolved userId ${result.userId} for phone_number_id ${phoneNumberId}`);
      return result.userId;
    }
    console.log(`[Webhook] No user found for phone_number_id ${phoneNumberId}, using system credentials`);
    return undefined;
  } catch (error) {
    console.error('[Webhook] Error resolving userId:', error);
    return undefined;
  }
}

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

    const webhookPhoneNumberId = value?.metadata?.phone_number_id;
    const resolvedUserId = webhookPhoneNumberId 
      ? await resolveUserIdFromPhoneNumberId(webhookPhoneNumberId)
      : undefined;

    const message = messages[0];
    const from = message.from;
    const messageType = message.type;
    
    // Extract message content based on type
    let messageText = '';
    let buttonPayload = '';
    let mediaUrl = '';
    let isMediaMessage = false;
    
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
    } else if (messageType === 'image') {
      // Image message
      isMediaMessage = true;
      mediaUrl = message.image?.id || '';
      const caption = message.image?.caption || '';
      messageText = caption ? `[Image] ${caption}` : '[Image message]';
      console.log(`Image message from ${from}: id=${mediaUrl}, caption="${caption}"`);
    } else if (messageType === 'video') {
      // Video message
      isMediaMessage = true;
      mediaUrl = message.video?.id || '';
      const caption = message.video?.caption || '';
      messageText = caption ? `[Video] ${caption}` : '[Video message]';
      console.log(`Video message from ${from}: id=${mediaUrl}, caption="${caption}"`);
    } else if (messageType === 'audio') {
      // Audio/voice message
      isMediaMessage = true;
      mediaUrl = message.audio?.id || '';
      messageText = '[Audio message]';
      console.log(`Audio message from ${from}: id=${mediaUrl}`);
    } else if (messageType === 'document') {
      // Document message
      isMediaMessage = true;
      mediaUrl = message.document?.id || '';
      const filename = message.document?.filename || 'document';
      const caption = message.document?.caption || '';
      messageText = caption ? `[Document: ${filename}] ${caption}` : `[Document: ${filename}]`;
      console.log(`Document message from ${from}: id=${mediaUrl}, filename="${filename}"`);
    } else if (messageType === 'sticker') {
      // Sticker message
      isMediaMessage = true;
      mediaUrl = message.sticker?.id || '';
      messageText = '[Sticker message]';
      console.log(`Sticker message from ${from}: id=${mediaUrl}`);
    } else if (messageType === 'location') {
      // Location message
      const lat = message.location?.latitude || 0;
      const lng = message.location?.longitude || 0;
      const name = message.location?.name || '';
      messageText = name ? `[Location: ${name}] (${lat}, ${lng})` : `[Location] (${lat}, ${lng})`;
      console.log(`Location message from ${from}: ${lat}, ${lng}`);
    } else if (messageType === 'contacts') {
      // Contact card message
      const contacts = message.contacts || [];
      const contactNames = contacts.map((c: any) => c.name?.formatted_name || 'Unknown').join(', ');
      messageText = `[Contact shared: ${contactNames}]`;
      console.log(`Contacts message from ${from}: ${contactNames}`);
    } else if (messageType === 'reaction') {
      // Reaction message
      const emoji = message.reaction?.emoji || '';
      messageText = `[Reaction: ${emoji}]`;
      console.log(`Reaction from ${from}: ${emoji}`);
    } else {
      // Unsupported message type
      messageText = `[Unsupported message type: ${messageType}]`;
      console.log(`Unsupported message type from ${from}: ${messageType}`);
    }

    console.log(`Received ${messageType} message from ${from}: ${messageText}`);

    // Save the inbound message with actual button text and media info
    await saveInboundMessage(from, messageText || buttonPayload, messageType, buttonPayload, mediaUrl);

    // For media messages, we still save them but don't process with AI
    if (isMediaMessage) {
      console.log(`Media message saved, skipping AI processing for type: ${messageType}`);
      return res.sendStatus(200);
    }

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
      const thankYouMessage = "Thanks for your feedback, we will keep in touch with you soon.";
      
      await whatsappService.sendTextMessage(from, thankYouMessage, resolvedUserId);
      await saveOutboundMessage(from, thankYouMessage);
      
      await contactAgentService.disableAutoReply(from);
      
      console.log(`Button response auto-reply sent to ${from}: ${thankYouMessage} (auto-reply disabled)`);
      return res.sendStatus(200);
    }

    // FIRST: Check if auto-reply is disabled for this contact (e.g., after "Thanks" message)
    // This check must happen BEFORE checking for assigned agents
    const autoReplyDisabled = await contactAgentService.isAutoReplyDisabled(from);
    
    if (autoReplyDisabled) {
      console.log(`[Webhook] Auto-reply disabled for ${from} - no automatic AI response until agent manually selected in inbox`);
      return res.sendStatus(200);
    }
    
    // For regular text messages, check if this contact has a manually assigned agent
    const contactAgentAssignment = await contactAgentService.getAgentForContact(from);
    let agentToUse = null;
    let useStoredHistory = false;
    
    // Only use manually assigned agent - no fallback to lead-form or random agents
    if (contactAgentAssignment) {
      console.log(`[Webhook] Found assigned agent for ${from}: ${contactAgentAssignment.agentName} (${contactAgentAssignment.agentId})`);
      agentToUse = await getAgentById(contactAgentAssignment.agentId);
      useStoredHistory = true;
    } else {
      // Check for pre-filled text mapping FIRST (for WhatsApp leads)
      const prefilledMapping = await prefilledTextService.findMatchingAgentForMessage(contentForAI);
      if (prefilledMapping) {
        console.log(`[Webhook] Found pre-filled text mapping for "${contentForAI}" -> Agent: ${prefilledMapping.agentName}`);
        agentToUse = await getAgentById(prefilledMapping.agentId);
        
        // Auto-assign this agent to the contact for future messages
        if (agentToUse) {
          await contactAgentService.assignAgentToContact(
            '', // contactId - will be set later
            from,
            prefilledMapping.agentId,
            prefilledMapping.agentName
          );
          useStoredHistory = true;
          console.log(`[Webhook] Auto-assigned agent ${prefilledMapping.agentName} to WhatsApp lead ${from}`);
        }
      }
      
      // Fall back to lead-form mapping if no pre-filled text match
      if (!agentToUse) {
        const lead = await findLeadByPhone(from);
        if (lead) {
          const mapping = await getMappingByFormId(lead.formId);
          if (mapping && mapping.isActive) {
            agentToUse = await getAgentById(mapping.agentId);
          }
        }
      }

      // Fall back to any active agent only if nothing else matched
      if (!agentToUse) {
        const agents = await getAllAgents();
        agentToUse = agents.find((a: any) => a.isActive);
      }
    }

    if (!agentToUse) {
      console.log('No active agent found');
      return res.sendStatus(200);
    }
    
    // Get conversation history - prioritize stored MongoDB history for assigned agents
    let recentHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    
    if (useStoredHistory) {
      recentHistory = await contactAgentService.getConversationHistory(from);
      console.log(`[Webhook] Using stored history with ${recentHistory.length} messages for agent: ${agentToUse.name}`);
    } else {
      if (!conversationHistory[from]) {
        conversationHistory[from] = [];
      }
      recentHistory = conversationHistory[from].slice(-10);
    }
    
    const historyForAI = [...recentHistory, { role: 'user' as const, content: contentForAI }];

    const aiResponse = await generateAgentResponse(contentForAI, agentToUse, historyForAI.slice(0, -1), resolvedUserId);
    
    if (useStoredHistory) {
      await contactAgentService.addMessageToHistory(from, 'user', contentForAI);
      await contactAgentService.addMessageToHistory(from, 'assistant', aiResponse);
    } else {
      conversationHistory[from].push({ role: 'user', content: contentForAI });
      conversationHistory[from].push({ role: 'assistant', content: aiResponse });
    }

    await whatsappService.sendTextMessage(from, aiResponse, resolvedUserId);
    
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

async function saveInboundMessage(from: string, content: string, type: string, buttonPayload?: string, mediaUrl?: string) {
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
      const formattedPhone = from.startsWith('+') ? from : `+${from}`;
      contact = await storage.createContact({
        name: formattedPhone,
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

    const validTypes = ['text', 'image', 'video', 'document', 'audio', 'sticker', 'location', 'contacts'] as const;
    const messageType = validTypes.includes(type as any) ? type as typeof validTypes[number] : 'text';
    
    const message = await storage.createMessage({
      contactId: contact.id,
      content: displayContent || `[${type} message]`,
      type: messageType,
      direction: 'inbound',
      status: 'read' as const,
      mediaUrl: mediaUrl || undefined,
    });
    console.log('Saved inbound message:', message.id, 'type:', messageType, 'mediaUrl:', mediaUrl || 'none');

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
      
      const displayName = contact.name && !contact.name.startsWith('WhatsApp ') 
        ? contact.name 
        : (from.startsWith('+') ? from : `+${from}`);
      await aiAnalytics.createOrUpdateQualification(
        from,
        displayName,
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

    const userId = (req.session as any)?.userId;
    
    const credentials = await whatsappService.getWhatsAppCredentialsStrict(userId);
    if (!credentials) {
      return res.status(403).json({ 
        error: 'WhatsApp credentials not configured. Please set up your API keys in Settings > API Credentials.' 
      });
    }
    
    const result = await whatsappService.sendTextMessage(to, message, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to send message' });
    }
    
    res.json({ success: true, messageId: result.messageId });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
}

export async function getMediaUrl(req: Request, res: Response) {
  try {
    const { mediaId } = req.params;
    
    if (!mediaId) {
      return res.status(400).json({ error: 'Media ID is required' });
    }
    
    const userId = (req.session as any)?.userId;
    const credentials = await whatsappService.getWhatsAppCredentialsStrict(userId);
    
    if (!credentials) {
      return res.status(403).json({ 
        error: 'WhatsApp credentials not configured. Please set up your API keys in Settings > API Credentials.' 
      });
    }

    const mediaInfoUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
    const mediaInfoResponse = await fetch(mediaInfoUrl, {
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
      },
    });

    if (!mediaInfoResponse.ok) {
      const error = await mediaInfoResponse.text();
      console.error('WhatsApp media info error:', error);
      return res.status(404).json({ error: 'Media not found or expired' });
    }

    const mediaInfo = await mediaInfoResponse.json();
    const downloadUrl = mediaInfo.url;
    const mimeType = mediaInfo.mime_type;
    
    console.log('[Media] Fetched media info:', { mediaId, mimeType, hasUrl: !!downloadUrl });

    const mediaResponse = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
      },
    });

    if (!mediaResponse.ok) {
      const error = await mediaResponse.text();
      console.error('WhatsApp media download error:', error);
      return res.status(500).json({ error: 'Failed to download media' });
    }

    const buffer = await mediaResponse.arrayBuffer();
    
    res.set('Content-Type', mimeType || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch media' });
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

    const userId = (req.session as any)?.userId;
    
    const credentials = await whatsappService.getWhatsAppCredentialsStrict(userId);
    if (!credentials) {
      return res.status(403).json({ 
        error: 'WhatsApp credentials not configured. Please set up your API keys in Settings > API Credentials.' 
      });
    }
    
    const resolvedLangCode = languageCode || 'en';
    
    const sendResult = await whatsappService.sendTemplateMessage(
      to, 
      templateName, 
      resolvedLangCode, 
      components || [], 
      userId
    );

    if (!sendResult.success) {
      throw new Error(sendResult.error || 'Failed to send template');
    }
    
    try {
      const normalizedPhone = to.replace(/\D/g, '');
      const contacts = await storage.getContacts();
      let contact = contacts.find(c => {
        const contactPhone = (c.phone || '').replace(/\D/g, '');
        return contactPhone.includes(normalizedPhone) || normalizedPhone.includes(contactPhone);
      });

      if (!contact) {
        const formattedPhone = to.startsWith('+') ? to : `+${to}`;
        contact = await storage.createContact({
          name: formattedPhone,
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

    res.json({ success: true, messageId: sendResult.messageId });
  } catch (error: any) {
    console.error('Error sending template:', error);
    res.status(500).json({ error: error.message || 'Failed to send template' });
  }
}
