import * as mongodb from '../storage/mongodb.adapter';
import { generateAIResponse } from '../ai/ai.service';

interface ContactAnalytics {
  id: string;
  contactId: string;
  phone: string;
  contactName: string;
  interestLevel: 'interested' | 'not_interested' | 'neutral' | 'highly_interested' | 'pending';
  interestScore: number;
  interestReason: string;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  aiAgentInteractions: AgentInteraction[];
  firstContactTime: string;
  lastContactTime: string;
  conversationDuration: number;
  keyTopics: string[];
  objections: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  lastAnalyzedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentInteraction {
  agentId: string;
  agentName: string;
  messagesCount: number;
  firstInteraction: string;
  lastInteraction: string;
  durationMinutes: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const INTEREST_ANALYSIS_PROMPT = `You are an expert sales analyst. Analyze the following WhatsApp conversation and determine the customer's interest level.

Respond in this EXACT JSON format only (no markdown, no explanation):
{
  "interestLevel": "interested" | "not_interested" | "neutral" | "highly_interested",
  "interestScore": <number 1-100>,
  "interestReason": "<brief explanation of your assessment>",
  "keyTopics": ["<topic1>", "<topic2>"],
  "objections": ["<objection1>", "<objection2>"],
  "positiveSignals": ["<signal1>", "<signal2>"],
  "negativeSignals": ["<signal1>", "<signal2>"]
}

Interest Level Guidelines:
- "highly_interested": Customer explicitly wants to proceed, asks about payment, provides details eagerly
- "interested": Customer shows positive engagement, asks questions, considers the offer
- "neutral": Customer is non-committal, short responses, neither positive nor negative
- "not_interested": Customer declines, shows disinterest, stops responding, or explicitly says no

Analyze this conversation:
`;

export async function analyzeContactConversation(
  phone: string,
  messages: ConversationMessage[],
  userId?: string
): Promise<{
  interestLevel: string;
  interestScore: number;
  interestReason: string;
  keyTopics: string[];
  objections: string[];
  positiveSignals: string[];
  negativeSignals: string[];
}> {
  if (messages.length === 0) {
    return {
      interestLevel: 'pending',
      interestScore: 0,
      interestReason: 'No conversation history available',
      keyTopics: [],
      objections: [],
      positiveSignals: [],
      negativeSignals: [],
    };
  }

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
    .join('\n');

  try {
    const response = await generateAIResponse(
      [
        { role: 'system', content: INTEREST_ANALYSIS_PROMPT },
        { role: 'user', content: conversationText }
      ],
      { id: 'analysis', name: 'Conversation Analyzer', model: 'gpt-4o', temperature: 0.3 },
      userId
    );

    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanedResponse);

    return {
      interestLevel: analysis.interestLevel || 'neutral',
      interestScore: analysis.interestScore || 50,
      interestReason: analysis.interestReason || 'Unable to determine',
      keyTopics: analysis.keyTopics || [],
      objections: analysis.objections || [],
      positiveSignals: analysis.positiveSignals || [],
      negativeSignals: analysis.negativeSignals || [],
    };
  } catch (error) {
    console.error('[ContactAnalytics] Error analyzing conversation:', error);
    
    const userMessages = messages.filter(m => m.role === 'user');
    const hasPositive = userMessages.some(m => 
      /interested|yes|sure|okay|want|need|details|price|payment/i.test(m.content)
    );
    const hasNegative = userMessages.some(m => 
      /no|not interested|later|busy|expensive|can't|don't/i.test(m.content)
    );

    return {
      interestLevel: hasPositive && !hasNegative ? 'interested' : hasNegative ? 'not_interested' : 'neutral',
      interestScore: hasPositive ? 60 : hasNegative ? 30 : 50,
      interestReason: 'Keyword-based analysis (AI analysis failed)',
      keyTopics: [],
      objections: [],
      positiveSignals: hasPositive ? ['Shows interest in keywords'] : [],
      negativeSignals: hasNegative ? ['Shows disinterest in keywords'] : [],
    };
  }
}

export async function getOrCreateContactAnalytics(
  contactId: string,
  phone: string,
  contactName: string
): Promise<ContactAnalytics> {
  const normalizedPhone = phone.replace(/\D/g, '');
  
  let analytics = await mongodb.findOne<ContactAnalytics>('contact_analytics', {
    $or: [
      { phone: normalizedPhone },
      { phone: { $regex: normalizedPhone.slice(-10) + '$' } }
    ]
  });

  if (!analytics) {
    const now = new Date().toISOString();
    analytics = {
      id: `ca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contactId,
      phone: normalizedPhone,
      contactName,
      interestLevel: 'pending',
      interestScore: 0,
      interestReason: 'Not yet analyzed',
      totalMessages: 0,
      inboundMessages: 0,
      outboundMessages: 0,
      aiAgentInteractions: [],
      firstContactTime: now,
      lastContactTime: now,
      conversationDuration: 0,
      keyTopics: [],
      objections: [],
      positiveSignals: [],
      negativeSignals: [],
      lastAnalyzedAt: '',
      createdAt: now,
      updatedAt: now,
    };
    await mongodb.insertOne('contact_analytics', analytics);
  }

  return analytics;
}

export async function updateContactAnalytics(
  phone: string,
  updates: Partial<ContactAnalytics>
): Promise<ContactAnalytics | null> {
  const normalizedPhone = phone.replace(/\D/g, '');
  
  return mongodb.updateOne<ContactAnalytics>(
    'contact_analytics',
    { $or: [
      { phone: normalizedPhone },
      { phone: { $regex: normalizedPhone.slice(-10) + '$' } }
    ]},
    { ...updates, updatedAt: new Date().toISOString() }
  );
}

export async function trackAgentInteraction(
  phone: string,
  agentId: string,
  agentName: string
): Promise<void> {
  const normalizedPhone = phone.replace(/\D/g, '');
  const now = new Date().toISOString();
  
  const analytics = await mongodb.findOne<ContactAnalytics>('contact_analytics', {
    $or: [
      { phone: normalizedPhone },
      { phone: { $regex: normalizedPhone.slice(-10) + '$' } }
    ]
  });

  if (!analytics) return;

  const existingInteraction = analytics.aiAgentInteractions.find(i => i.agentId === agentId);
  
  if (existingInteraction) {
    existingInteraction.messagesCount++;
    existingInteraction.lastInteraction = now;
    const firstTime = new Date(existingInteraction.firstInteraction).getTime();
    const lastTime = new Date(now).getTime();
    existingInteraction.durationMinutes = Math.round((lastTime - firstTime) / 60000);
  } else {
    analytics.aiAgentInteractions.push({
      agentId,
      agentName,
      messagesCount: 1,
      firstInteraction: now,
      lastInteraction: now,
      durationMinutes: 0,
    });
  }

  await mongodb.updateOne<ContactAnalytics>(
    'contact_analytics',
    { id: analytics.id },
    { 
      aiAgentInteractions: analytics.aiAgentInteractions,
      lastContactTime: now,
      updatedAt: now,
    }
  );
}

export async function getContactReport(phone: string, userId?: string): Promise<ContactAnalytics | null> {
  const normalizedPhone = phone.replace(/\D/g, '');
  
  const analytics = await mongodb.findOne<ContactAnalytics>('contact_analytics', {
    $or: [
      { phone: normalizedPhone },
      { phone: { $regex: normalizedPhone.slice(-10) + '$' } }
    ]
  });

  return analytics;
}

export async function getAllContactReports(
  filter?: { interestLevel?: string; limit?: number; offset?: number }
): Promise<{ reports: ContactAnalytics[]; total: number }> {
  const allAnalytics = await mongodb.readCollection<ContactAnalytics>('contact_analytics');
  
  let filtered = allAnalytics;
  if (filter?.interestLevel && filter.interestLevel !== 'all') {
    filtered = allAnalytics.filter(a => a.interestLevel === filter.interestLevel);
  }

  filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const offset = filter?.offset || 0;
  const limit = filter?.limit || 50;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    reports: paginated,
    total: filtered.length,
  };
}

export async function analyzeAndUpdateContact(
  contactId: string,
  phone: string,
  contactName: string,
  messages: any[],
  userId?: string
): Promise<ContactAnalytics> {
  const analytics = await getOrCreateContactAnalytics(contactId, phone, contactName);
  
  const conversationMessages: ConversationMessage[] = messages.map(m => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content,
    timestamp: m.timestamp || m.createdAt,
  }));

  const analysis = await analyzeContactConversation(phone, conversationMessages, userId);
  
  const inbound = messages.filter(m => m.direction === 'inbound').length;
  const outbound = messages.filter(m => m.direction === 'outbound').length;
  
  let firstTime = analytics.firstContactTime;
  let lastTime = analytics.lastContactTime;
  
  if (messages.length > 0) {
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime()
    );
    firstTime = sortedMessages[0].timestamp || sortedMessages[0].createdAt;
    lastTime = sortedMessages[sortedMessages.length - 1].timestamp || sortedMessages[sortedMessages.length - 1].createdAt;
  }
  
  const durationMinutes = Math.round(
    (new Date(lastTime).getTime() - new Date(firstTime).getTime()) / 60000
  );

  const updated = await updateContactAnalytics(phone, {
    contactName,
    interestLevel: analysis.interestLevel as ContactAnalytics['interestLevel'],
    interestScore: analysis.interestScore,
    interestReason: analysis.interestReason,
    totalMessages: messages.length,
    inboundMessages: inbound,
    outboundMessages: outbound,
    keyTopics: analysis.keyTopics,
    objections: analysis.objections,
    positiveSignals: analysis.positiveSignals,
    negativeSignals: analysis.negativeSignals,
    firstContactTime: firstTime,
    lastContactTime: lastTime,
    conversationDuration: durationMinutes,
    lastAnalyzedAt: new Date().toISOString(),
  });

  return updated || analytics;
}

export async function getContactAnalyticsSummary(): Promise<{
  total: number;
  byInterestLevel: { level: string; count: number; percentage: number }[];
  averageScore: number;
  topAgents: { agentName: string; contactsHandled: number }[];
}> {
  const allAnalytics = await mongodb.readCollection<ContactAnalytics>('contact_analytics');
  
  const total = allAnalytics.length;
  
  const interestCounts: Record<string, number> = {
    highly_interested: 0,
    interested: 0,
    neutral: 0,
    not_interested: 0,
    pending: 0,
  };
  
  let totalScore = 0;
  const agentContactsMap: Record<string, number> = {};
  
  for (const analytics of allAnalytics) {
    interestCounts[analytics.interestLevel] = (interestCounts[analytics.interestLevel] || 0) + 1;
    totalScore += analytics.interestScore;
    
    for (const interaction of analytics.aiAgentInteractions) {
      agentContactsMap[interaction.agentName] = (agentContactsMap[interaction.agentName] || 0) + 1;
    }
  }
  
  const byInterestLevel = Object.entries(interestCounts).map(([level, count]) => ({
    level,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
  
  const topAgents = Object.entries(agentContactsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([agentName, contactsHandled]) => ({ agentName, contactsHandled }));
  
  return {
    total,
    byInterestLevel,
    averageScore: total > 0 ? Math.round(totalScore / total) : 0,
    topAgents,
  };
}

export const contactAnalyticsService = {
  analyzeContactConversation,
  getOrCreateContactAnalytics,
  updateContactAnalytics,
  trackAgentInteraction,
  getContactReport,
  getAllContactReports,
  analyzeAndUpdateContact,
  getContactAnalyticsSummary,
};
