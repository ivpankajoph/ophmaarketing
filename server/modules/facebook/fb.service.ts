import { readCollection, writeCollection, findById, findByField } from '../storage';
import * as leadAutoReply from '../leadAutoReply/leadAutoReply.service';

// Facebook Page Access Token - required for Lead Forms API
// This must be a Page Access Token, not a User Access Token
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;

export interface LeadForm {
  id: string;
  fbFormId: string;
  name: string;
  status: string;
  pageId: string;
  createdTime: string;
  syncedAt: string;
}

export interface Lead {
  id: string;
  fbLeadId: string;
  formId: string;
  formName: string;
  fieldData: Record<string, string>;
  createdTime: string;
  syncedAt: string;
  phone?: string;
  email?: string;
  name?: string;
  autoReplySent?: boolean;
  autoReplyMessage?: string;
  autoReplySentAt?: string;
}

const FORMS_COLLECTION = 'forms';
const LEADS_COLLECTION = 'leads';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function syncLeadForms(): Promise<LeadForm[]> {
  if (!FB_PAGE_ACCESS_TOKEN || !FB_PAGE_ID) {
    throw new Error('Facebook credentials not configured. Please set FB_PAGE_ACCESS_TOKEN (Page Access Token) and FB_PAGE_ID.');
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${FB_PAGE_ID}/leadgen_forms?access_token=${FB_PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook API error: ${error}`);
    }

    const data = await response.json();
    const forms: LeadForm[] = [];
    const now = new Date().toISOString();

    for (const fbForm of data.data || []) {
      const existingForm = await findByField<LeadForm>(FORMS_COLLECTION, 'fbFormId', fbForm.id);
      
      const form: LeadForm = {
        id: existingForm?.id || generateId('form'),
        fbFormId: fbForm.id,
        name: fbForm.name || 'Unnamed Form',
        status: fbForm.status || 'ACTIVE',
        pageId: FB_PAGE_ID,
        createdTime: fbForm.created_time || now,
        syncedAt: now,
      };

      forms.push(form);
    }

    await writeCollection(FORMS_COLLECTION, forms);
    return forms;
  } catch (error) {
    console.error('Error syncing lead forms:', error);
    throw error;
  }
}

export async function getAllForms(): Promise<LeadForm[]> {
  return readCollection<LeadForm>(FORMS_COLLECTION);
}

export async function getFormById(id: string): Promise<LeadForm | null> {
  return findById<LeadForm>(FORMS_COLLECTION, id);
}

export async function getFormByFbId(fbFormId: string): Promise<LeadForm | null> {
  return findByField<LeadForm>(FORMS_COLLECTION, 'fbFormId', fbFormId);
}

export async function syncLeadsForForm(formId: string): Promise<Lead[]> {
  if (!FB_PAGE_ACCESS_TOKEN) {
    throw new Error('Facebook credentials not configured. Please set FB_PAGE_ACCESS_TOKEN (Page Access Token).');
  }

  const form = await findById<LeadForm>(FORMS_COLLECTION, formId);
  if (!form) {
    throw new Error('Form not found');
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${form.fbFormId}/leads?access_token=${FB_PAGE_ACCESS_TOKEN}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook API error: ${error}`);
    }

    const data = await response.json();
    const existingLeads = await readCollection<Lead>(LEADS_COLLECTION);
    const now = new Date().toISOString();
    const newLeads: Lead[] = [];

    for (const fbLead of data.data || []) {
      const existingLead = existingLeads.find(l => l.fbLeadId === fbLead.id);
      if (existingLead) continue;

      const fieldData: Record<string, string> = {};
      let phone = '';
      let email = '';
      let name = '';

      for (const field of fbLead.field_data || []) {
        fieldData[field.name] = field.values?.[0] || '';
        if (field.name.toLowerCase().includes('phone')) phone = field.values?.[0] || '';
        if (field.name.toLowerCase().includes('email')) email = field.values?.[0] || '';
        if (field.name.toLowerCase().includes('name')) name = field.values?.[0] || '';
      }

      const lead: Lead = {
        id: generateId('lead'),
        fbLeadId: fbLead.id,
        formId: form.id,
        formName: form.name,
        fieldData,
        createdTime: fbLead.created_time || now,
        syncedAt: now,
        phone,
        email,
        name,
      };

      newLeads.push(lead);
    }

    const allLeads = [...existingLeads, ...newLeads];
    await writeCollection(LEADS_COLLECTION, allLeads);
    
    for (const lead of newLeads) {
      if (lead.phone && !lead.autoReplySent) {
        console.log(`[FB Service] Triggering auto-reply for new lead: ${lead.id}`);
        const autoReplyLead: leadAutoReply.Lead = {
          id: lead.id,
          formId: lead.formId,
          formName: lead.formName,
          fullName: lead.name,
          email: lead.email,
          phoneNumber: lead.phone,
          fieldData: lead.fieldData,
          createdTime: lead.createdTime,
          autoReplySent: lead.autoReplySent,
        };
        leadAutoReply.processNewLead(autoReplyLead).then(async result => {
          if (result.success) {
            const currentLeads = await readCollection<Lead>(LEADS_COLLECTION);
            const idx = currentLeads.findIndex(l => l.id === lead.id);
            if (idx !== -1) {
              currentLeads[idx].autoReplySent = true;
              currentLeads[idx].autoReplyMessage = result.message;
              currentLeads[idx].autoReplySentAt = new Date().toISOString();
              await writeCollection(LEADS_COLLECTION, currentLeads);
              console.log(`[FB Service] Auto-reply status saved for lead ${lead.id}`);
            }
          }
        }).catch(err => {
          console.error(`[FB Service] Auto-reply failed for lead ${lead.id}:`, err);
        });
      }
    }
    
    return newLeads;
  } catch (error) {
    console.error('Error syncing leads:', error);
    throw error;
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  return readCollection<Lead>(LEADS_COLLECTION);
}

export async function getLeadsByFormId(formId: string): Promise<Lead[]> {
  const leads = await readCollection<Lead>(LEADS_COLLECTION);
  return leads.filter(lead => lead.formId === formId);
}

export async function getLeadById(id: string): Promise<Lead | null> {
  return findById<Lead>(LEADS_COLLECTION, id);
}
