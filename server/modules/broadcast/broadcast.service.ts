import * as jsonAdapter from '../storage/json.adapter';
import * as templateService from '../leadAutoReply/templateMessages.service';
import * as openaiService from '../openai/openai.service';
import * as agentService from '../aiAgents/agent.service';

export interface BroadcastList {
  id: string;
  name: string;
  contacts: BroadcastContact[];
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastContact {
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
}

export interface ScheduledMessage {
  id: string;
  name: string;
  messageType: 'template' | 'custom' | 'ai_agent';
  templateName?: string;
  customMessage?: string;
  agentId?: string;
  contactIds?: string[];
  listId?: string;
  scheduledAt: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getWhatsAppCredentials(): { token: string; phoneNumberId: string } | null {
  const token = process.env.WHATSAPP_TOKEN_NEW || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    return null;
  }
  
  return { token, phoneNumberId };
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (phone.trim().startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
    return cleaned;
  }
  
  const commonCountryCodes = ['1', '44', '91', '92', '93', '94', '971', '966', '965', '974', '20', '27', '61', '64', '81', '86', '62'];
  for (const code of commonCountryCodes) {
    if (cleaned.startsWith(code) && cleaned.length >= 10) {
      return cleaned;
    }
  }
  
  if (cleaned.startsWith('0')) {
    cleaned = '91' + cleaned.substring(1);
  }

  return cleaned;
}

export function getBroadcastLists(): BroadcastList[] {
  return jsonAdapter.readCollection<BroadcastList>('broadcast_lists');
}

export function getBroadcastListById(id: string): BroadcastList | undefined {
  const lists = getBroadcastLists();
  return lists.find(l => l.id === id);
}

export function createBroadcastList(name: string, contacts: BroadcastContact[]): BroadcastList {
  const lists = getBroadcastLists();
  const newList: BroadcastList = {
    id: `list-${Date.now()}`,
    name,
    contacts,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  lists.push(newList);
  jsonAdapter.writeCollection('broadcast_lists', lists);
  return newList;
}

export function updateBroadcastList(id: string, name: string, contacts: BroadcastContact[]): BroadcastList | null {
  const lists = getBroadcastLists();
  const index = lists.findIndex(l => l.id === id);
  if (index === -1) return null;
  
  lists[index] = {
    ...lists[index],
    name,
    contacts,
    updatedAt: new Date().toISOString(),
  };
  jsonAdapter.writeCollection('broadcast_lists', lists);
  return lists[index];
}

export function deleteBroadcastList(id: string): boolean {
  const lists = getBroadcastLists();
  const filtered = lists.filter(l => l.id !== id);
  if (filtered.length === lists.length) return false;
  jsonAdapter.writeCollection('broadcast_lists', filtered);
  return true;
}

export function getScheduledMessages(): ScheduledMessage[] {
  return jsonAdapter.readCollection<ScheduledMessage>('scheduled_messages');
}

export function createScheduledMessage(data: Omit<ScheduledMessage, 'id' | 'createdAt' | 'sentCount' | 'failedCount'>): ScheduledMessage {
  const messages = getScheduledMessages();
  const newMessage: ScheduledMessage = {
    ...data,
    id: `schedule-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sentCount: 0,
    failedCount: 0,
  };
  messages.push(newMessage);
  jsonAdapter.writeCollection('scheduled_messages', messages);
  return newMessage;
}

export function updateScheduledMessage(id: string, updates: Partial<ScheduledMessage>): ScheduledMessage | null {
  const messages = getScheduledMessages();
  const index = messages.findIndex(m => m.id === id);
  if (index === -1) return null;
  
  messages[index] = { ...messages[index], ...updates };
  jsonAdapter.writeCollection('scheduled_messages', messages);
  return messages[index];
}

export function deleteScheduledMessage(id: string): boolean {
  const messages = getScheduledMessages();
  const filtered = messages.filter(m => m.id !== id);
  if (filtered.length === messages.length) return false;
  jsonAdapter.writeCollection('scheduled_messages', filtered);
  return true;
}

export async function sendTemplateMessage(phone: string, templateName: string, contactName?: string): Promise<SendMessageResult> {
  // Build components with named parameters if the template has variables
  const components: templateService.TemplateComponent[] = [];
  
  // If template has named parameters like {{name}}, include them
  // Use parameter_name for named variables in Meta templates
  if (templateName.includes('awards') || templateName.includes('marketing')) {
    components.push({
      type: 'body',
      parameters: [
        {
          type: 'text',
          text: contactName || 'Valued Customer',
          parameter_name: 'name',  // Named parameter for {{name}} variable
        }
      ]
    });
  }
  
  const result = await templateService.sendTemplateMessage(formatPhoneNumber(phone), {
    name: templateName,
    languageCode: 'en',  // Use 'en' as base language for awards templates
    components: components.length > 0 ? components : undefined,
  });
  return result;
}

export async function sendCustomMessage(phone: string, message: string): Promise<SendMessageResult> {
  const credentials = getWhatsAppCredentials();
  
  if (!credentials) {
    console.error('[CustomMessage] WhatsApp credentials not configured');
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  const formattedPhone = formatPhoneNumber(phone);
  console.log(`[CustomMessage] Sending to ${formattedPhone}: "${message.substring(0, 50)}..."`);

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { body: message }
        }),
      }
    );

    const data = await response.json();
    
    if (response.ok && data.messages?.[0]?.id) {
      console.log(`[CustomMessage] Successfully sent to ${formattedPhone}`);
      return { success: true, messageId: data.messages[0].id };
    } else {
      const errorMsg = data.error?.message || 'Failed to send message';
      const errorCode = data.error?.code;
      console.error(`[CustomMessage] Failed (code: ${errorCode}): ${errorMsg}`);
      
      // Check for 24-hour window error
      if (errorCode === 131047 || errorMsg.includes('24 hour') || errorMsg.includes('Re-engagement')) {
        return { 
          success: false, 
          error: 'Cannot send custom message - outside 24-hour window. Customer must message you first, or use a template message.' 
        };
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error('[CustomMessage] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendAIAgentMessage(phone: string, agentId: string, context?: string): Promise<SendMessageResult> {
  const agent = agentService.getAgentById(agentId);
  if (!agent) {
    console.error(`[AIAgent] Agent not found: ${agentId}`);
    return { success: false, error: 'Agent not found' };
  }

  console.log(`[AIAgent] Generating message with agent "${agent.name}" for ${phone}`);
  
  const prompt = context || 'Generate a friendly welcome message for a new contact. Keep it under 160 characters.';
  const aiMessage = await openaiService.generateAgentResponse(prompt, agent);
  
  if (!aiMessage) {
    console.error('[AIAgent] Failed to generate AI message');
    return { success: false, error: 'Failed to generate AI message. Check if OPENAI_API_KEY is configured.' };
  }

  console.log(`[AIAgent] AI generated: "${aiMessage.substring(0, 100)}..."`);

  // Try sending as custom message first (works within 24-hour window)
  const customResult = await sendCustomMessage(phone, aiMessage);
  
  // If custom message fails due to 24-hour window, fall back to hello_world template
  if (!customResult.success && (customResult.error?.includes('24') || customResult.error?.includes('window'))) {
    console.log('[AIAgent] Custom message failed (outside 24-hour window), falling back to hello_world template');
    return await templateService.sendHelloWorldTemplate(formatPhoneNumber(phone));
  }
  
  return customResult;
}

export async function sendBroadcast(
  contacts: BroadcastContact[],
  messageType: 'template' | 'custom' | 'ai_agent',
  options: {
    templateName?: string;
    customMessage?: string;
    agentId?: string;
  }
): Promise<{ total: number; successful: number; failed: number; results: Array<{ phone: string; success: boolean; error?: string }> }> {
  const results: Array<{ phone: string; success: boolean; error?: string }> = [];
  let successful = 0;
  let failed = 0;

  for (const contact of contacts) {
    let result: SendMessageResult;

    switch (messageType) {
      case 'template':
        result = await sendTemplateMessage(contact.phone, options.templateName || 'hello_world', contact.name);
        break;
      case 'custom':
        result = await sendCustomMessage(contact.phone, options.customMessage || '');
        break;
      case 'ai_agent':
        result = await sendAIAgentMessage(contact.phone, options.agentId || '', `Contact name: ${contact.name}`);
        break;
      default:
        result = { success: false, error: 'Invalid message type' };
    }

    results.push({
      phone: contact.phone,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    total: contacts.length,
    successful,
    failed,
    results,
  };
}

export async function sendSingleMessage(
  phone: string,
  name: string,
  messageType: 'template' | 'custom' | 'ai_agent',
  options: {
    templateName?: string;
    customMessage?: string;
    agentId?: string;
  }
): Promise<SendMessageResult> {
  switch (messageType) {
    case 'template':
      return await sendTemplateMessage(phone, options.templateName || 'hello_world', name);
    case 'custom':
      return await sendCustomMessage(phone, options.customMessage || '');
    case 'ai_agent':
      return await sendAIAgentMessage(phone, options.agentId || '', `Contact name: ${name}`);
    default:
      return { success: false, error: 'Invalid message type' };
  }
}

export function parseExcelContacts(data: unknown[]): BroadcastContact[] {
  const contacts: BroadcastContact[] = [];
  
  for (const row of data) {
    if (typeof row !== 'object' || row === null) continue;
    
    const record = row as Record<string, unknown>;
    const name = String(record['name'] || record['Name'] || record['FULL_NAME'] || record['full_name'] || '').trim();
    const phone = String(record['phone'] || record['Phone'] || record['PHONE'] || record['phone_number'] || record['mobile'] || record['Mobile'] || '').trim();
    const email = String(record['email'] || record['Email'] || record['EMAIL'] || '').trim();
    
    if (name && phone) {
      contacts.push({
        name,
        phone,
        email: email || undefined,
      });
    }
  }
  
  return contacts;
}

export function exportContactsToJSON(contacts: BroadcastContact[]): object[] {
  return contacts.map(c => ({
    name: c.name,
    phone: c.phone,
    email: c.email || '',
    tags: c.tags?.join(', ') || '',
  }));
}
