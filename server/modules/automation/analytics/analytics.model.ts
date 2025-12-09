import mongoose, { Document, Schema } from 'mongoose';

export interface IAutomationMetrics extends Document {
  userId: string;
  scopeType: 'global' | 'trigger' | 'flow' | 'campaign' | 'segment';
  scopeId?: string;
  date: Date;
  hour?: number;
  metrics: {
    triggerExecutions: number;
    triggerSuccesses: number;
    triggerFailures: number;
    flowStarts: number;
    flowCompletions: number;
    flowFailures: number;
    flowExits: number;
    campaignEnrollments: number;
    campaignCompletions: number;
    campaignExits: number;
    messagesSent: number;
    messagesDelivered: number;
    messagesRead: number;
    messagesReplied: number;
    conversions: number;
    apiCalls: number;
    apiSuccesses: number;
    apiFailures: number;
    alertsSent: number;
  };
  engagement: {
    deliveryRate: number;
    readRate: number;
    replyRate: number;
    conversionRate: number;
    bounceRate: number;
  };
  timing: {
    avgTriggerLatency: number;
    avgFlowDuration: number;
    avgMessageDeliveryTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AutomationMetricsSchema = new Schema<IAutomationMetrics>({
  userId: { type: String, required: true, index: true },
  scopeType: { type: String, enum: ['global', 'trigger', 'flow', 'campaign', 'segment'], required: true },
  scopeId: { type: String },
  date: { type: Date, required: true },
  hour: { type: Number },
  metrics: {
    triggerExecutions: { type: Number, default: 0 },
    triggerSuccesses: { type: Number, default: 0 },
    triggerFailures: { type: Number, default: 0 },
    flowStarts: { type: Number, default: 0 },
    flowCompletions: { type: Number, default: 0 },
    flowFailures: { type: Number, default: 0 },
    flowExits: { type: Number, default: 0 },
    campaignEnrollments: { type: Number, default: 0 },
    campaignCompletions: { type: Number, default: 0 },
    campaignExits: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    messagesDelivered: { type: Number, default: 0 },
    messagesRead: { type: Number, default: 0 },
    messagesReplied: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    apiSuccesses: { type: Number, default: 0 },
    apiFailures: { type: Number, default: 0 },
    alertsSent: { type: Number, default: 0 }
  },
  engagement: {
    deliveryRate: { type: Number, default: 0 },
    readRate: { type: Number, default: 0 },
    replyRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 }
  },
  timing: {
    avgTriggerLatency: { type: Number, default: 0 },
    avgFlowDuration: { type: Number, default: 0 },
    avgMessageDeliveryTime: { type: Number, default: 0 }
  }
}, { timestamps: true });

AutomationMetricsSchema.index({ userId: 1, scopeType: 1, date: -1 });
AutomationMetricsSchema.index({ userId: 1, scopeType: 1, scopeId: 1, date: -1 });
AutomationMetricsSchema.index({ userId: 1, date: -1, hour: 1 });

export const AutomationMetrics = mongoose.model<IAutomationMetrics>('AutomationMetrics', AutomationMetricsSchema);

export interface IEngagementHeatmap extends Document {
  userId: string;
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  data: {
    dayOfWeek: number;
    hour: number;
    messagesSent: number;
    messagesDelivered: number;
    messagesRead: number;
    messagesReplied: number;
    engagementScore: number;
  }[];
  bestSendTimes: {
    dayOfWeek: number;
    hour: number;
    score: number;
  }[];
  generatedAt: Date;
}

const EngagementHeatmapSchema = new Schema<IEngagementHeatmap>({
  userId: { type: String, required: true, index: true },
  period: { type: String, enum: ['day', 'week', 'month'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  data: [{
    dayOfWeek: { type: Number, required: true },
    hour: { type: Number, required: true },
    messagesSent: { type: Number, default: 0 },
    messagesDelivered: { type: Number, default: 0 },
    messagesRead: { type: Number, default: 0 },
    messagesReplied: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 }
  }],
  bestSendTimes: [{
    dayOfWeek: { type: Number, required: true },
    hour: { type: Number, required: true },
    score: { type: Number, required: true }
  }],
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

EngagementHeatmapSchema.index({ userId: 1, period: 1, startDate: -1 });

export const EngagementHeatmap = mongoose.model<IEngagementHeatmap>('EngagementHeatmap', EngagementHeatmapSchema);

export interface IAIInsight extends Document {
  userId: string;
  insightType: 'performance' | 'optimization' | 'anomaly' | 'recommendation' | 'trend';
  scope: 'trigger' | 'flow' | 'campaign' | 'segment' | 'overall';
  scopeId?: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'positive';
  actionable: boolean;
  suggestedActions?: string[];
  dataPoints: Record<string, any>;
  confidence: number;
  status: 'new' | 'viewed' | 'actioned' | 'dismissed';
  generatedAt: Date;
  expiresAt?: Date;
}

const AIInsightSchema = new Schema<IAIInsight>({
  userId: { type: String, required: true, index: true },
  insightType: { type: String, enum: ['performance', 'optimization', 'anomaly', 'recommendation', 'trend'], required: true },
  scope: { type: String, enum: ['trigger', 'flow', 'campaign', 'segment', 'overall'], required: true },
  scopeId: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical', 'positive'], default: 'info' },
  actionable: { type: Boolean, default: false },
  suggestedActions: { type: [String] },
  dataPoints: { type: Schema.Types.Mixed, default: {} },
  confidence: { type: Number, default: 0.8 },
  status: { type: String, enum: ['new', 'viewed', 'actioned', 'dismissed'], default: 'new' },
  generatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
}, { timestamps: true });

AIInsightSchema.index({ userId: 1, status: 1, generatedAt: -1 });
AIInsightSchema.index({ userId: 1, scope: 1, scopeId: 1 });

export const AIInsight = mongoose.model<IAIInsight>('AIInsight', AIInsightSchema);
