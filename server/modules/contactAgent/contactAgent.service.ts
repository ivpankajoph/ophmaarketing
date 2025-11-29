import * as mongodb from '../storage/mongodb.adapter';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ContactAgent {
  id: string;
  contactId: string;
  phone: string;
  agentId: string;
  agentName?: string;
  conversationHistory: ConversationMessage[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function assignAgentToContact(
  contactId: string,
  phone: string,
  agentId: string,
  agentName?: string
): Promise<ContactAgent | null> {
  const normalizedPhone = normalizePhone(phone);
  const now = new Date().toISOString();
  
  const existing = await mongodb.findOne<ContactAgent>('contact_agents', { 
    phone: { $regex: normalizedPhone.slice(-10) + '$' }
  });
  
  if (existing) {
    const updated = await mongodb.updateOne<ContactAgent>('contact_agents', 
      { id: existing.id },
      { 
        agentId, 
        agentName,
        isActive: true,
        updatedAt: now 
      }
    );
    console.log(`[ContactAgent] Updated agent assignment for ${phone}: ${agentId}`);
    return updated;
  }
  
  const newAssignment: ContactAgent = {
    id: `ca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    contactId,
    phone: normalizedPhone,
    agentId,
    agentName,
    conversationHistory: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await mongodb.insertOne<ContactAgent>('contact_agents', newAssignment);
  console.log(`[ContactAgent] Created agent assignment for ${phone}: ${agentId}`);
  return result;
}

export async function getAgentForContact(phone: string): Promise<ContactAgent | null> {
  const normalizedPhone = normalizePhone(phone);
  
  const assignment = await mongodb.findOne<ContactAgent>('contact_agents', { 
    $or: [
      { phone: normalizedPhone },
      { phone: { $regex: normalizedPhone.slice(-10) + '$' } }
    ],
    isActive: true
  });
  
  return assignment;
}

export async function addMessageToHistory(
  phone: string,
  role: 'user' | 'assistant',
  content: string
): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  
  const assignment = await mongodb.findOne<ContactAgent>('contact_agents', { 
    $or: [
      { phone: normalizedPhone },
      { phone: { $regex: normalizedPhone.slice(-10) + '$' } }
    ]
  });
  
  if (!assignment) {
    return false;
  }
  
  const newMessage: ConversationMessage = {
    role,
    content,
    timestamp: new Date().toISOString()
  };
  
  const updatedHistory = [...(assignment.conversationHistory || []), newMessage].slice(-20);
  
  await mongodb.updateOne<ContactAgent>('contact_agents', 
    { id: assignment.id },
    { 
      conversationHistory: updatedHistory,
      updatedAt: new Date().toISOString() 
    }
  );
  
  return true;
}

export async function getConversationHistory(phone: string): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const normalizedPhone = normalizePhone(phone);
  
  const assignment = await mongodb.findOne<ContactAgent>('contact_agents', { 
    $or: [
      { phone: normalizedPhone },
      { phone: { $regex: normalizedPhone.slice(-10) + '$' } }
    ]
  });
  
  if (!assignment || !assignment.conversationHistory) {
    return [];
  }
  
  return assignment.conversationHistory.map(m => ({
    role: m.role,
    content: m.content
  }));
}

export async function removeAgentFromContact(phone: string): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  
  const result = await mongodb.updateOne<ContactAgent>('contact_agents', 
    { $or: [
      { phone: normalizedPhone },
      { phone: { $regex: normalizedPhone.slice(-10) + '$' } }
    ]},
    { isActive: false, updatedAt: new Date().toISOString() }
  );
  
  return result !== null;
}

export async function getAllContactAgents(): Promise<ContactAgent[]> {
  return mongodb.readCollection<ContactAgent>('contact_agents');
}
