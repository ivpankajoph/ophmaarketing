import * as mongodb from '../storage/mongodb.adapter';

export interface AIChatQualification {
  id: string;
  contactId: string;
  phone: string;
  name: string;
  source: 'ai_chat' | 'campaign' | 'ad' | 'lead_form' | 'manual';
  campaignId?: string;
  campaignName?: string;
  agentId?: string;
  agentName?: string;
  category: 'interested' | 'not_interested' | 'pending';
  score: number;
  totalMessages: number;
  lastMessageAt: string;
  firstContactAt: string;
  keywords: string[];
  notes: string;
  aiAnalysis?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QualificationStats {
  total: number;
  interested: number;
  notInterested: number;
  pending: number;
  interestedPercent: number;
  notInterestedPercent: number;
  pendingPercent: number;
}

const INTEREST_KEYWORDS = [
  'interested', 'yes', 'tell me more', 'how much', 'price', 'cost', 
  'register', 'sign up', 'book', 'schedule', 'appointment', 'buy',
  'purchase', 'order', 'want', 'need', 'looking for', 'details',
  'more information', 'brochure', 'catalog', 'demo', 'trial',
  'subscribe', 'join', 'apply', 'confirm', 'proceed', 'next steps'
];

const NOT_INTERESTED_KEYWORDS = [
  'not interested', 'no thanks', 'no thank you', 'stop', 'unsubscribe',
  'remove', 'don\'t contact', 'spam', 'wrong number', 'busy', 'later',
  'not now', 'maybe later', 'not looking', 'already have', 'not for me'
];

function generateId(): string {
  return 'qual_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export async function getQualifications(): Promise<AIChatQualification[]> {
  return mongodb.readCollection<AIChatQualification>('ai_qualifications');
}

export async function getQualificationById(id: string): Promise<AIChatQualification | undefined> {
  const result = await mongodb.findOne<AIChatQualification>('ai_qualifications', { id });
  return result || undefined;
}

export async function getQualificationByPhone(phone: string): Promise<AIChatQualification | undefined> {
  if (!phone) return undefined;
  
  const qualifications = await getQualifications();
  const normalizedPhone = (phone || '').replace(/\D/g, '');
  
  if (!normalizedPhone) return undefined;
  
  return qualifications.find(q => {
    const qPhone = (q.phone || '').replace(/\D/g, '');
    return qPhone.includes(normalizedPhone) || normalizedPhone.includes(qPhone);
  });
}

export async function getQualificationsByCategory(category: 'interested' | 'not_interested' | 'pending'): Promise<AIChatQualification[]> {
  return mongodb.findMany<AIChatQualification>('ai_qualifications', { category });
}

export async function getQualificationsBySource(source: string): Promise<AIChatQualification[]> {
  return mongodb.findMany<AIChatQualification>('ai_qualifications', { source });
}

export async function getQualificationsByCampaign(campaignId: string): Promise<AIChatQualification[]> {
  return mongodb.findMany<AIChatQualification>('ai_qualifications', { campaignId });
}

export async function getQualificationsByAgent(agentId: string): Promise<AIChatQualification[]> {
  return mongodb.findMany<AIChatQualification>('ai_qualifications', { agentId });
}

export async function getQualificationStats(): Promise<QualificationStats> {
  const qualifications = await getQualifications();
  const total = qualifications.length;
  const interested = qualifications.filter(q => q.category === 'interested').length;
  const notInterested = qualifications.filter(q => q.category === 'not_interested').length;
  const pending = qualifications.filter(q => q.category === 'pending').length;
  
  return {
    total,
    interested,
    notInterested,
    pending,
    interestedPercent: total > 0 ? Math.round((interested / total) * 100) : 0,
    notInterestedPercent: total > 0 ? Math.round((notInterested / total) * 100) : 0,
    pendingPercent: total > 0 ? Math.round((pending / total) * 100) : 0
  };
}

export function analyzeMessage(message: string): { category: 'interested' | 'not_interested' | 'pending'; score: number; keywords: string[] } {
  if (!message) {
    return { category: 'pending', score: 50, keywords: [] };
  }
  
  const lowerMessage = (message || '').toLowerCase();
  const foundInterestKeywords: string[] = [];
  const foundNotInterestedKeywords: string[] = [];
  
  for (const keyword of INTEREST_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      foundInterestKeywords.push(keyword);
    }
  }
  
  for (const keyword of NOT_INTERESTED_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      foundNotInterestedKeywords.push(keyword);
    }
  }
  
  let score = 50;
  let category: 'interested' | 'not_interested' | 'pending' = 'pending';
  
  if (foundNotInterestedKeywords.length > 0) {
    score = Math.max(0, 50 - (foundNotInterestedKeywords.length * 20));
    category = 'not_interested';
  } else if (foundInterestKeywords.length > 0) {
    score = Math.min(100, 50 + (foundInterestKeywords.length * 15));
    category = 'interested';
  }
  
  return {
    category,
    score,
    keywords: [...foundInterestKeywords, ...foundNotInterestedKeywords]
  };
}

export async function createOrUpdateQualification(
  phone: string,
  name: string,
  message: string,
  source: 'ai_chat' | 'campaign' | 'ad' | 'lead_form' | 'manual',
  options?: {
    campaignId?: string;
    campaignName?: string;
    agentId?: string;
    agentName?: string;
    contactId?: string;
  }
): Promise<AIChatQualification> {
  if (!phone) {
    throw new Error('Phone is required for AI qualification tracking');
  }
  
  const normalizedPhone = (phone || '').replace(/\D/g, '');
  const existing = await getQualificationByPhone(normalizedPhone);
  const analysis = analyzeMessage(message || '');
  const now = new Date().toISOString();
  
  if (existing) {
    const updatedKeywords = Array.from(new Set([...existing.keywords, ...analysis.keywords]));
    
    let newCategory = existing.category;
    let newScore = existing.score;
    
    if (analysis.category === 'interested' && analysis.score > existing.score) {
      newCategory = 'interested';
      newScore = analysis.score;
    } else if (analysis.category === 'not_interested') {
      newCategory = 'not_interested';
      newScore = analysis.score;
    } else if (existing.category === 'pending' && analysis.category !== 'pending') {
      newCategory = analysis.category;
      newScore = analysis.score;
    }
    
    const updated: AIChatQualification = {
      ...existing,
      category: newCategory,
      score: newScore,
      totalMessages: existing.totalMessages + 1,
      lastMessageAt: now,
      keywords: updatedKeywords,
      updatedAt: now,
      campaignId: options?.campaignId || existing.campaignId,
      campaignName: options?.campaignName || existing.campaignName,
      agentId: options?.agentId || existing.agentId,
      agentName: options?.agentName || existing.agentName,
    };
    
    await mongodb.updateOne('ai_qualifications', { id: existing.id }, updated);
    return updated;
  } else {
    const newQualification: AIChatQualification = {
      id: generateId(),
      contactId: options?.contactId || generateId(),
      phone: normalizedPhone,
      name: name || `+${normalizedPhone}`,
      source,
      campaignId: options?.campaignId,
      campaignName: options?.campaignName,
      agentId: options?.agentId,
      agentName: options?.agentName,
      category: analysis.category,
      score: analysis.score,
      totalMessages: 1,
      lastMessageAt: now,
      firstContactAt: now,
      keywords: analysis.keywords,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    
    await mongodb.insertOne('ai_qualifications', newQualification);
    return newQualification;
  }
}

export async function updateQualificationCategory(
  id: string, 
  category: 'interested' | 'not_interested' | 'pending',
  notes?: string
): Promise<AIChatQualification | null> {
  const existing = await getQualificationById(id);
  if (!existing) return null;
  
  const updated = {
    ...existing,
    category,
    notes: notes || existing.notes,
    updatedAt: new Date().toISOString(),
  };
  
  await mongodb.updateOne('ai_qualifications', { id }, updated);
  return updated;
}

export async function updateQualificationNotes(id: string, notes: string): Promise<AIChatQualification | null> {
  const existing = await getQualificationById(id);
  if (!existing) return null;
  
  const updated = {
    ...existing,
    notes,
    updatedAt: new Date().toISOString(),
  };
  
  await mongodb.updateOne('ai_qualifications', { id }, updated);
  return updated;
}

export async function deleteQualification(id: string): Promise<boolean> {
  return mongodb.deleteOne('ai_qualifications', { id });
}

export async function getQualificationReport(): Promise<{
  bySource: Record<string, QualificationStats>;
  byCampaign: Record<string, QualificationStats & { campaignName: string }>;
  byAgent: Record<string, QualificationStats & { agentName: string }>;
  overall: QualificationStats;
}> {
  const qualifications = await getQualifications();
  
  const bySource: Record<string, QualificationStats> = {};
  const sources = ['ai_chat', 'campaign', 'ad', 'lead_form', 'manual'];
  
  for (const source of sources) {
    const sourceQuals = qualifications.filter(q => q.source === source);
    const total = sourceQuals.length;
    const interested = sourceQuals.filter(q => q.category === 'interested').length;
    const notInterested = sourceQuals.filter(q => q.category === 'not_interested').length;
    const pending = sourceQuals.filter(q => q.category === 'pending').length;
    
    bySource[source] = {
      total,
      interested,
      notInterested,
      pending,
      interestedPercent: total > 0 ? Math.round((interested / total) * 100) : 0,
      notInterestedPercent: total > 0 ? Math.round((notInterested / total) * 100) : 0,
      pendingPercent: total > 0 ? Math.round((pending / total) * 100) : 0
    };
  }
  
  const byCampaign: Record<string, QualificationStats & { campaignName: string }> = {};
  const campaignIds = Array.from(new Set(qualifications.filter(q => q.campaignId).map(q => q.campaignId!)));
  
  for (const campaignId of campaignIds) {
    const campaignQuals = qualifications.filter(q => q.campaignId === campaignId);
    const total = campaignQuals.length;
    const interested = campaignQuals.filter(q => q.category === 'interested').length;
    const notInterested = campaignQuals.filter(q => q.category === 'not_interested').length;
    const pending = campaignQuals.filter(q => q.category === 'pending').length;
    
    byCampaign[campaignId] = {
      campaignName: campaignQuals[0]?.campaignName || 'Unknown Campaign',
      total,
      interested,
      notInterested,
      pending,
      interestedPercent: total > 0 ? Math.round((interested / total) * 100) : 0,
      notInterestedPercent: total > 0 ? Math.round((notInterested / total) * 100) : 0,
      pendingPercent: total > 0 ? Math.round((pending / total) * 100) : 0
    };
  }
  
  const byAgent: Record<string, QualificationStats & { agentName: string }> = {};
  const agentIds = Array.from(new Set(qualifications.filter(q => q.agentId).map(q => q.agentId!)));
  
  for (const agentId of agentIds) {
    const agentQuals = qualifications.filter(q => q.agentId === agentId);
    const total = agentQuals.length;
    const interested = agentQuals.filter(q => q.category === 'interested').length;
    const notInterested = agentQuals.filter(q => q.category === 'not_interested').length;
    const pending = agentQuals.filter(q => q.category === 'pending').length;
    
    byAgent[agentId] = {
      agentName: agentQuals[0]?.agentName || 'Unknown Agent',
      total,
      interested,
      notInterested,
      pending,
      interestedPercent: total > 0 ? Math.round((interested / total) * 100) : 0,
      notInterestedPercent: total > 0 ? Math.round((notInterested / total) * 100) : 0,
      pendingPercent: total > 0 ? Math.round((pending / total) * 100) : 0
    };
  }
  
  return {
    bySource,
    byCampaign,
    byAgent,
    overall: await getQualificationStats()
  };
}
