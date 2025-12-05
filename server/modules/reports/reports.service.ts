import * as mongodb from '../storage/mongodb.adapter';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TimeFilter {
  period: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}

export function getDateRange(filter: TimeFilter): DateRange {
  const now = new Date();
  let startDate: Date;
  let endDate = new Date(now);
  
  switch (filter.period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      startDate = filter.startDate ? new Date(filter.startDate) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = filter.endDate ? new Date(filter.endDate) : now;
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  return { startDate, endDate };
}

export async function getAIAgentPerformance(filter: TimeFilter, userId?: string) {
  const { startDate, endDate } = getDateRange(filter);
  
  const agents = await mongodb.readCollection<any>('agents');
  const messages = await mongodb.readCollection<any>('messages');
  const contactAgents = await mongodb.readCollection<any>('contact_agents');
  
  const filteredMessages = messages.filter(m => {
    const timestamp = new Date(m.timestamp || m.createdAt);
    return timestamp >= startDate && timestamp <= endDate;
  });
  
  const agentStats = agents.map(agent => {
    const assignments = contactAgents.filter(ca => ca.agentId === agent.id);
    const contactIds = assignments.map(a => a.contactId);
    
    const agentMessages = filteredMessages.filter(m => 
      contactIds.includes(m.contactId) && m.direction === 'outbound'
    );
    
    const inboundMessages = filteredMessages.filter(m =>
      contactIds.includes(m.contactId) && m.direction === 'inbound'
    );
    
    const responseCount = agentMessages.length;
    const uniqueChats = new Set(agentMessages.map(m => m.contactId)).size;
    
    const avgResponseTime = calculateAvgResponseTime(inboundMessages, agentMessages);
    
    return {
      id: agent.id,
      name: agent.name,
      model: agent.model || 'gpt-4o',
      chatsHandled: uniqueChats,
      messagesGenerated: responseCount,
      avgResponseTime: formatResponseTime(avgResponseTime),
      avgResponseTimeMs: avgResponseTime,
      isActive: agent.isActive,
      temperature: agent.temperature,
    };
  });
  
  const sortedAgents = agentStats.sort((a, b) => b.chatsHandled - a.chatsHandled);
  
  const totalChats = sortedAgents.reduce((sum, a) => sum + a.chatsHandled, 0);
  const totalMessages = sortedAgents.reduce((sum, a) => sum + a.messagesGenerated, 0);
  const activeAgents = sortedAgents.filter(a => a.isActive).length;
  
  const avgResponseTimes = sortedAgents.filter(a => a.avgResponseTimeMs > 0).map(a => a.avgResponseTimeMs);
  const overallAvgResponseTime = avgResponseTimes.length > 0 
    ? avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length 
    : 0;
  
  return {
    agents: sortedAgents,
    summary: {
      totalAgents: agents.length,
      activeAgents,
      totalChats,
      totalMessages,
      avgResponseTime: formatResponseTime(overallAvgResponseTime),
    },
    period: filter.period,
  };
}

function calculateAvgResponseTime(inboundMessages: any[], outboundMessages: any[]): number {
  let totalTime = 0;
  let count = 0;
  
  for (const inbound of inboundMessages) {
    const inboundTime = new Date(inbound.timestamp || inbound.createdAt).getTime();
    
    const response = outboundMessages.find(out => {
      const outTime = new Date(out.timestamp || out.createdAt).getTime();
      return out.contactId === inbound.contactId && outTime > inboundTime && outTime - inboundTime < 300000;
    });
    
    if (response) {
      const responseTime = new Date(response.timestamp || response.createdAt).getTime();
      totalTime += responseTime - inboundTime;
      count++;
    }
  }
  
  return count > 0 ? totalTime / count : 0;
}

function formatResponseTime(ms: number): string {
  if (ms === 0) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

export async function getCustomerReplies(filter: TimeFilter, userId?: string) {
  const { startDate, endDate } = getDateRange(filter);
  
  const messages = await mongodb.readCollection<any>('messages');
  const contacts = await mongodb.readCollection<any>('contacts');
  
  const contactMap = new Map(contacts.map(c => [c.id, c]));
  
  const inboundMessages = messages.filter(m => {
    const timestamp = new Date(m.timestamp || m.createdAt);
    return m.direction === 'inbound' && timestamp >= startDate && timestamp <= endDate;
  });
  
  const recentReplies = inboundMessages
    .sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime())
    .slice(0, 50)
    .map(m => {
      const contact = contactMap.get(m.contactId);
      const timeDiff = Date.now() - new Date(m.timestamp || m.createdAt).getTime();
      
      return {
        id: m.id,
        contactId: m.contactId,
        name: contact?.name || `Unknown (${m.contactId})`,
        phone: contact?.phone || '',
        message: m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : ''),
        fullMessage: m.content,
        time: formatTimeAgo(timeDiff),
        timestamp: m.timestamp || m.createdAt,
        type: m.type || 'text',
        sentiment: analyzeSentiment(m.content),
      };
    });
  
  const sentimentCounts = {
    positive: recentReplies.filter(r => r.sentiment === 'Positive').length,
    negative: recentReplies.filter(r => r.sentiment === 'Negative').length,
    neutral: recentReplies.filter(r => r.sentiment === 'Neutral').length,
  };
  
  const totalReplies = inboundMessages.length;
  const positivePercentage = totalReplies > 0 
    ? Math.round((sentimentCounts.positive / totalReplies) * 100) 
    : 0;
  
  const unsubscribeKeywords = ['stop', 'unsubscribe', 'remove', 'opt out', 'cancel'];
  const unsubscribeRequests = inboundMessages.filter(m => 
    unsubscribeKeywords.some(kw => m.content?.toLowerCase().includes(kw))
  ).length;
  
  return {
    replies: recentReplies,
    summary: {
      totalReplies,
      positiveSentiment: positivePercentage,
      unsubscribeRequests,
      sentimentBreakdown: sentimentCounts,
    },
    period: filter.period,
  };
}

function analyzeSentiment(text: string): 'Positive' | 'Negative' | 'Neutral' {
  if (!text) return 'Neutral';
  
  const positiveWords = ['yes', 'thanks', 'thank', 'great', 'good', 'interested', 'love', 'amazing', 'excellent', 'perfect', 'wonderful', 'awesome'];
  const negativeWords = ['no', 'stop', 'unsubscribe', 'spam', 'annoying', 'hate', 'bad', 'terrible', 'worst', 'cancel', 'remove'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
  
  if (positiveCount > negativeCount) return 'Positive';
  if (negativeCount > positiveCount) return 'Negative';
  return 'Neutral';
}

function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

export async function getUserEngagement(filter: TimeFilter, userId?: string) {
  const { startDate, endDate } = getDateRange(filter);
  
  const messages = await mongodb.readCollection<any>('messages');
  const contacts = await mongodb.readCollection<any>('contacts');
  
  const contactMap = new Map(contacts.map(c => [c.id, c]));
  
  const filteredMessages = messages.filter(m => {
    const timestamp = new Date(m.timestamp || m.createdAt);
    return timestamp >= startDate && timestamp <= endDate;
  });
  
  const contactStats = new Map<string, {
    messagesReceived: number;
    messagesRead: number;
    replies: number;
    contact: any;
  }>();
  
  for (const msg of filteredMessages) {
    const contactId = msg.contactId;
    if (!contactStats.has(contactId)) {
      contactStats.set(contactId, {
        messagesReceived: 0,
        messagesRead: 0,
        replies: 0,
        contact: contactMap.get(contactId),
      });
    }
    
    const stats = contactStats.get(contactId)!;
    
    if (msg.direction === 'outbound') {
      stats.messagesReceived++;
      if (msg.status === 'read' || msg.status === 'delivered') {
        stats.messagesRead++;
      }
    } else if (msg.direction === 'inbound') {
      stats.replies++;
    }
  }
  
  const engagementData = Array.from(contactStats.entries()).map(([contactId, stats]) => {
    const readRate = stats.messagesReceived > 0 
      ? (stats.messagesRead / stats.messagesReceived) * 100 
      : 0;
    const replyRate = stats.messagesReceived > 0 
      ? (stats.replies / stats.messagesReceived) * 100 
      : 0;
    const engagement = (readRate * 0.4 + replyRate * 0.6);
    
    return {
      id: contactId,
      name: stats.contact?.name || `Contact ${contactId.slice(0, 8)}`,
      phone: stats.contact?.phone || '',
      messagesReceived: stats.messagesReceived,
      messagesRead: stats.messagesRead,
      replies: stats.replies,
      readRate: Math.round(readRate * 10) / 10,
      replyRate: Math.round(replyRate * 10) / 10,
      engagement: Math.round(engagement * 10) / 10,
    };
  });
  
  const sortedData = engagementData
    .filter(d => d.messagesReceived > 0)
    .sort((a, b) => b.engagement - a.engagement);
  
  const totalUsers = sortedData.length;
  const avgReadRate = totalUsers > 0 
    ? sortedData.reduce((sum, u) => sum + u.readRate, 0) / totalUsers 
    : 0;
  const avgReplyRate = totalUsers > 0 
    ? sortedData.reduce((sum, u) => sum + u.replyRate, 0) / totalUsers 
    : 0;
  const totalReplies = sortedData.reduce((sum, u) => sum + u.replies, 0);
  const totalMessages = sortedData.reduce((sum, u) => sum + u.messagesReceived, 0);
  
  const distribution = [
    { range: '90-100%', count: sortedData.filter(u => u.engagement >= 90).length, color: '#22c55e' },
    { range: '80-89%', count: sortedData.filter(u => u.engagement >= 80 && u.engagement < 90).length, color: '#84cc16' },
    { range: '70-79%', count: sortedData.filter(u => u.engagement >= 70 && u.engagement < 80).length, color: '#eab308' },
    { range: '60-69%', count: sortedData.filter(u => u.engagement >= 60 && u.engagement < 70).length, color: '#f97316' },
    { range: '50-59%', count: sortedData.filter(u => u.engagement >= 50 && u.engagement < 60).length, color: '#ef4444' },
    { range: '40-49%', count: sortedData.filter(u => u.engagement >= 40 && u.engagement < 50).length, color: '#dc2626' },
    { range: '<40%', count: sortedData.filter(u => u.engagement < 40).length, color: '#991b1b' },
  ];
  
  return {
    users: sortedData.slice(0, 100),
    distribution,
    summary: {
      totalUsers,
      avgReadRate: Math.round(avgReadRate * 10) / 10,
      avgReplyRate: Math.round(avgReplyRate * 10) / 10,
      totalReplies,
      totalMessages,
    },
    period: filter.period,
  };
}

export async function getSpendingReport(filter: TimeFilter, userId?: string) {
  const { startDate, endDate } = getDateRange(filter);
  
  const messages = await mongodb.readCollection<any>('messages');
  const broadcastLogs = await mongodb.readCollection<any>('broadcast_logs');
  
  const filteredMessages = messages.filter(m => {
    const timestamp = new Date(m.timestamp || m.createdAt);
    return m.direction === 'outbound' && timestamp >= startDate && timestamp <= endDate;
  });
  
  const MARKETING_RATE = 0.08;
  const UTILITY_RATE = 0.05;
  const SERVICE_RATE = 0.03;
  
  const dailyData = new Map<string, { marketing: number; utility: number; service: number; total: number }>();
  
  for (const msg of filteredMessages) {
    const date = new Date(msg.timestamp || msg.createdAt);
    const dateKey = date.toISOString().split('T')[0];
    
    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, { marketing: 0, utility: 0, service: 0, total: 0 });
    }
    
    const data = dailyData.get(dateKey)!;
    
    const isBroadcast = broadcastLogs.some(bl => bl.messageId === msg.id);
    
    if (isBroadcast) {
      data.marketing += MARKETING_RATE;
    } else if (msg.type === 'template') {
      data.utility += UTILITY_RATE;
    } else {
      data.service += SERVICE_RATE;
    }
    
    data.total = data.marketing + data.utility + data.service;
  }
  
  const dailySpending = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      fullDate: date,
      marketing: Math.round(data.marketing * 100) / 100,
      utility: Math.round(data.utility * 100) / 100,
      service: Math.round(data.service * 100) / 100,
      total: Math.round(data.total * 100) / 100,
    }))
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
    .slice(-7);
  
  const totalSpend = dailySpending.reduce((sum, d) => sum + d.total, 0);
  const avgDailySpend = dailySpending.length > 0 ? totalSpend / dailySpending.length : 0;
  const projectedMonthly = avgDailySpend * 30;
  
  const totalMarketing = dailySpending.reduce((sum, d) => sum + d.marketing, 0);
  const totalUtility = dailySpending.reduce((sum, d) => sum + d.utility, 0);
  const totalService = dailySpending.reduce((sum, d) => sum + d.service, 0);
  
  return {
    dailySpending,
    summary: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      avgDailySpend: Math.round(avgDailySpend * 100) / 100,
      projectedMonthly: Math.round(projectedMonthly * 100) / 100,
      totalMarketing: Math.round(totalMarketing * 100) / 100,
      totalUtility: Math.round(totalUtility * 100) / 100,
      totalService: Math.round(totalService * 100) / 100,
      marketingRate: MARKETING_RATE,
      utilityRate: UTILITY_RATE,
      serviceRate: SERVICE_RATE,
    },
    period: filter.period,
  };
}

export async function getDashboardOverview(filter: TimeFilter, userId?: string) {
  const { startDate, endDate } = getDateRange(filter);
  
  const messages = await mongodb.readCollection<any>('messages');
  const contacts = await mongodb.readCollection<any>('contacts');
  const campaigns = await mongodb.readCollection<any>('campaigns');
  const agents = await mongodb.readCollection<any>('agents');
  
  const filteredMessages = messages.filter(m => {
    const timestamp = new Date(m.timestamp || m.createdAt);
    return timestamp >= startDate && timestamp <= endDate;
  });
  
  const outbound = filteredMessages.filter(m => m.direction === 'outbound');
  const inbound = filteredMessages.filter(m => m.direction === 'inbound');
  const delivered = outbound.filter(m => m.status === 'delivered' || m.status === 'read');
  const read = outbound.filter(m => m.status === 'read');
  
  const deliveryRate = outbound.length > 0 ? (delivered.length / outbound.length) * 100 : 0;
  const readRate = outbound.length > 0 ? (read.length / outbound.length) * 100 : 0;
  const replyRate = outbound.length > 0 ? (inbound.length / outbound.length) * 100 : 0;
  
  return {
    messages: {
      total: filteredMessages.length,
      outbound: outbound.length,
      inbound: inbound.length,
      delivered: delivered.length,
      read: read.length,
    },
    rates: {
      delivery: Math.round(deliveryRate * 10) / 10,
      read: Math.round(readRate * 10) / 10,
      reply: Math.round(replyRate * 10) / 10,
    },
    counts: {
      contacts: contacts.length,
      campaigns: campaigns.length,
      agents: agents.length,
      activeAgents: agents.filter(a => a.isActive).length,
    },
    period: filter.period,
  };
}

export const reportsService = {
  getDateRange,
  getAIAgentPerformance,
  getCustomerReplies,
  getUserEngagement,
  getSpendingReport,
  getDashboardOverview,
};
