import mongoose, { Document, Schema } from 'mongoose';

export interface IDripStep {
  id: string;
  order: number;
  name: string;
  dayOffset: number;
  timeOfDay?: string;
  messageType: 'template' | 'text' | 'media' | 'interactive';
  templateId?: string;
  templateName?: string;
  textContent?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  buttons?: {
    type: 'quick_reply' | 'url' | 'call';
    text: string;
    value?: string;
  }[];
  conditions?: {
    field: string;
    operator: string;
    value: any;
  }[];
  skipIfReplied: boolean;
  skipIfConverted: boolean;
  aiAgentId?: string;
  status: 'active' | 'paused';
}

export interface IDripCampaign extends Document {
  userId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  steps: IDripStep[];
  targetType: 'segment' | 'tag' | 'manual' | 'trigger' | 'imported';
  targetSegmentIds?: string[];
  targetTags?: string[];
  targetTriggerId?: string;
  importedContacts?: string[];
  excludeSegmentIds?: string[];
  excludeTags?: string[];
  timezone: string;
  startDate?: Date;
  endDate?: Date;
  schedule: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  };
  settings: {
    allowReEntry: boolean;
    reEntryDelayDays: number;
    stopOnReply: boolean;
    stopOnConversion: boolean;
    maxContactsPerDay: number;
    sendingSpeed: 'slow' | 'normal' | 'fast';
  };
  metrics: {
    totalEnrolled: number;
    activeContacts: number;
    completedContacts: number;
    exitedContacts: number;
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalReplied: number;
    totalConverted: number;
    totalFailed: number;
  };
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DripStepSchema = new Schema({
  id: { type: String, required: true },
  order: { type: Number, required: true },
  name: { type: String, required: true },
  dayOffset: { type: Number, required: true },
  timeOfDay: { type: String },
  messageType: { type: String, enum: ['template', 'text', 'media', 'interactive'], required: true },
  templateId: { type: String },
  templateName: { type: String },
  textContent: { type: String },
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['image', 'video', 'document', 'audio'] },
  buttons: [{
    type: { type: String, enum: ['quick_reply', 'url', 'call'] },
    text: { type: String },
    value: { type: String }
  }],
  conditions: [{
    field: { type: String },
    operator: { type: String },
    value: { type: Schema.Types.Mixed }
  }],
  skipIfReplied: { type: Boolean, default: false },
  skipIfConverted: { type: Boolean, default: false },
  aiAgentId: { type: String },
  status: { type: String, enum: ['active', 'paused'], default: 'active' }
}, { _id: false });

const DripCampaignSchema = new Schema<IDripCampaign>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'archived'], default: 'draft' },
  steps: { type: [DripStepSchema], default: [] },
  targetType: { type: String, enum: ['segment', 'tag', 'manual', 'trigger', 'imported'], required: true },
  targetSegmentIds: { type: [String] },
  targetTags: { type: [String] },
  targetTriggerId: { type: String },
  importedContacts: { type: [String] },
  excludeSegmentIds: { type: [String] },
  excludeTags: { type: [String] },
  timezone: { type: String, default: 'UTC' },
  startDate: { type: Date },
  endDate: { type: Date },
  schedule: {
    daysOfWeek: { type: [Number], default: [1, 2, 3, 4, 5] },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '18:00' }
  },
  settings: {
    allowReEntry: { type: Boolean, default: false },
    reEntryDelayDays: { type: Number, default: 30 },
    stopOnReply: { type: Boolean, default: false },
    stopOnConversion: { type: Boolean, default: true },
    maxContactsPerDay: { type: Number, default: 1000 },
    sendingSpeed: { type: String, enum: ['slow', 'normal', 'fast'], default: 'normal' }
  },
  metrics: {
    totalEnrolled: { type: Number, default: 0 },
    activeContacts: { type: Number, default: 0 },
    completedContacts: { type: Number, default: 0 },
    exitedContacts: { type: Number, default: 0 },
    totalSent: { type: Number, default: 0 },
    totalDelivered: { type: Number, default: 0 },
    totalRead: { type: Number, default: 0 },
    totalReplied: { type: Number, default: 0 },
    totalConverted: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 }
  },
  tags: { type: [String], default: [] }
}, { timestamps: true });

DripCampaignSchema.index({ userId: 1, status: 1 });
DripCampaignSchema.index({ userId: 1, name: 1 });

export const DripCampaign = mongoose.model<IDripCampaign>('DripCampaign', DripCampaignSchema);

export interface IDripRun extends Document {
  campaignId: mongoose.Types.ObjectId;
  userId: string;
  contactId: string;
  contactPhone: string;
  status: 'active' | 'paused' | 'completed' | 'exited' | 'failed';
  currentStepIndex: number;
  enrolledAt: Date;
  completedAt?: Date;
  exitedAt?: Date;
  exitReason?: 'completed' | 'replied' | 'converted' | 'unsubscribed' | 'manual' | 'error' | 'campaign_ended';
  stepHistory: {
    stepId: string;
    stepOrder: number;
    status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | 'skipped';
    messageId?: string;
    scheduledAt: Date;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    repliedAt?: Date;
    error?: string;
  }[];
  nextStepScheduledAt?: Date;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

const DripRunSchema = new Schema<IDripRun>({
  campaignId: { type: Schema.Types.ObjectId, ref: 'DripCampaign', required: true, index: true },
  userId: { type: String, required: true, index: true },
  contactId: { type: String, required: true, index: true },
  contactPhone: { type: String, required: true },
  status: { type: String, enum: ['active', 'paused', 'completed', 'exited', 'failed'], default: 'active' },
  currentStepIndex: { type: Number, default: 0 },
  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  exitedAt: { type: Date },
  exitReason: { type: String, enum: ['completed', 'replied', 'converted', 'unsubscribed', 'manual', 'error', 'campaign_ended'] },
  stepHistory: [{
    stepId: { type: String, required: true },
    stepOrder: { type: Number, required: true },
    status: { type: String, enum: ['sent', 'delivered', 'read', 'replied', 'failed', 'skipped'], required: true },
    messageId: { type: String },
    scheduledAt: { type: Date, required: true },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    repliedAt: { type: Date },
    error: { type: String }
  }],
  nextStepScheduledAt: { type: Date, index: true },
  variables: { type: Schema.Types.Mixed, default: {} },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

DripRunSchema.index({ campaignId: 1, status: 1 });
DripRunSchema.index({ userId: 1, status: 1 });
DripRunSchema.index({ campaignId: 1, contactId: 1 }, { unique: true });
DripRunSchema.index({ nextStepScheduledAt: 1, status: 1 });

export const DripRun = mongoose.model<IDripRun>('DripRun', DripRunSchema);
