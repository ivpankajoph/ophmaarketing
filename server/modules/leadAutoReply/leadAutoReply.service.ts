import * as openaiService from '../openai/openai.service';
import * as mappingService from '../mapping/mapping.service';
import * as agentService from '../aiAgents/agent.service';
import * as jsonAdapter from '../storage/json.adapter';

export interface Lead {
  id: string;
  formId: string;
  formName?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  fieldData: Record<string, string>;
  createdTime: string;
  adName?: string;
  campaignName?: string;
  autoReplySent?: boolean;
  autoReplyMessage?: string;
  autoReplySentAt?: string;
}

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '';

async function sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: { body: message }
        }),
      }
    );

    const data = await response.json();
    
    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    } else {
      return { success: false, error: data.error?.message || 'Failed to send message' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function processNewLead(lead: Lead): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log(`[AutoReply] Processing lead: ${lead.id} from form: ${lead.formId}`);

    if (!lead.phoneNumber) {
      console.log(`[AutoReply] No phone number for lead ${lead.id}, skipping`);
      return { success: false, error: 'No phone number available' };
    }

    if (lead.autoReplySent) {
      console.log(`[AutoReply] Already sent reply to lead ${lead.id}, skipping`);
      return { success: false, error: 'Auto-reply already sent' };
    }

    const mapping = mappingService.getMappingByFormId(lead.formId);
    if (!mapping || !mapping.isActive) {
      console.log(`[AutoReply] No active mapping for form ${lead.formId}`);
      return { success: false, error: 'No active agent mapping for this form' };
    }

    const agent = agentService.getAgentById(mapping.agentId);
    if (!agent || !agent.isActive) {
      console.log(`[AutoReply] Agent ${mapping.agentId} not found or inactive`);
      return { success: false, error: 'Agent not found or inactive' };
    }

    const leadContext = buildLeadContext(lead);
    const welcomePrompt = `A new lead just submitted a form. Here's their information:\n${leadContext}\n\nGenerate a friendly, professional welcome message to send them via WhatsApp. Keep it concise (under 200 characters). Don't include any placeholders - write the actual message ready to send.`;

    console.log(`[AutoReply] Generating message using agent: ${agent.name}`);
    const aiResponse = await openaiService.generateAgentResponse(welcomePrompt, agent);

    if (!aiResponse) {
      return { success: false, error: 'Failed to generate AI response' };
    }

    const formattedPhone = formatPhoneNumber(lead.phoneNumber);
    console.log(`[AutoReply] Sending WhatsApp to: ${formattedPhone}`);
    
    const sendResult = await sendWhatsAppMessage(formattedPhone, aiResponse);

    if (sendResult.success) {
      lead.autoReplySent = true;
      lead.autoReplyMessage = aiResponse;
      lead.autoReplySentAt = new Date().toISOString();
      await updateLead(lead);

      console.log(`[AutoReply] Successfully sent to ${formattedPhone}`);
      return { success: true, message: aiResponse };
    } else {
      console.error(`[AutoReply] Failed to send: ${sendResult.error}`);
      return { success: false, error: sendResult.error };
    }

  } catch (error) {
    console.error('[AutoReply] Error processing lead:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function processAllPendingLeads(): Promise<{ processed: number; successful: number; failed: number }> {
  const leads = jsonAdapter.readCollection<Lead>('leads');
  const pendingLeads = leads.filter((l: Lead) => !l.autoReplySent && l.phoneNumber);

  let successful = 0;
  let failed = 0;

  for (const lead of pendingLeads) {
    const result = await processNewLead(lead);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { processed: pendingLeads.length, successful, failed };
}

export async function sendManualReply(leadId: string, message: string): Promise<{ success: boolean; error?: string }> {
  const leads = jsonAdapter.readCollection<Lead>('leads');
  const lead = leads.find((l: Lead) => l.id === leadId);

  if (!lead) {
    return { success: false, error: 'Lead not found' };
  }

  if (!lead.phoneNumber) {
    return { success: false, error: 'No phone number for this lead' };
  }

  const formattedPhone = formatPhoneNumber(lead.phoneNumber);
  const result = await sendWhatsAppMessage(formattedPhone, message);

  if (result.success) {
    lead.autoReplySent = true;
    lead.autoReplyMessage = message;
    lead.autoReplySentAt = new Date().toISOString();
    await updateLead(lead);
  }

  return result;
}

function buildLeadContext(lead: Lead): string {
  const lines: string[] = [];
  
  if (lead.fullName) lines.push(`Name: ${lead.fullName}`);
  if (lead.email) lines.push(`Email: ${lead.email}`);
  if (lead.formName) lines.push(`Form: ${lead.formName}`);
  if (lead.adName) lines.push(`Ad: ${lead.adName}`);
  if (lead.campaignName) lines.push(`Campaign: ${lead.campaignName}`);

  if (lead.fieldData) {
    Object.entries(lead.fieldData).forEach(([key, value]) => {
      if (!['full_name', 'email', 'phone_number'].includes(key.toLowerCase())) {
        lines.push(`${key}: ${value}`);
      }
    });
  }

  return lines.join('\n');
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('92') && cleaned.length === 10) {
    cleaned = '92' + cleaned;
  }

  return cleaned;
}

async function updateLead(lead: Lead): Promise<void> {
  const leads = jsonAdapter.readCollection<Lead>('leads');
  const index = leads.findIndex((l: Lead) => l.id === lead.id);
  if (index !== -1) {
    leads[index] = lead;
    jsonAdapter.writeCollection('leads', leads);
  }
}
