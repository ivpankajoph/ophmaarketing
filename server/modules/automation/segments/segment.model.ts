import mongoose, { Document, Schema } from 'mongoose';

export interface ISegmentRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists' | 'between' | 'before' | 'after' | 'within_days' | 'regex';
  value: any;
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface ISegmentRuleGroup {
  logic: 'AND' | 'OR';
  rules: (ISegmentRule | ISegmentRuleGroup)[];
}

export interface ISegment extends Document {
  userId: string;
  name: string;
  description?: string;
  type: 'dynamic' | 'static';
  status: 'active' | 'inactive' | 'computing';
  ruleGroup: ISegmentRuleGroup;
  refreshStrategy: 'realtime' | 'hourly' | 'daily' | 'manual';
  lastRefreshedAt?: Date;
  memberCount: number;
  estimatedCount?: number;
  usedInTriggers: number;
  usedInFlows: number;
  usedInCampaigns: number;
  tags?: string[];
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SegmentRuleSchema = new Schema({
  field: { type: String, required: true },
  operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in', 'exists', 'not_exists', 'between', 'before', 'after', 'within_days', 'regex'], required: true },
  value: { type: Schema.Types.Mixed },
  dataType: { type: String, enum: ['string', 'number', 'boolean', 'date', 'array'] }
}, { _id: false });

const SegmentRuleGroupSchema = new Schema({
  logic: { type: String, enum: ['AND', 'OR'], required: true },
  rules: { type: [Schema.Types.Mixed], default: [] }
}, { _id: false });

const SegmentSchema = new Schema<ISegment>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['dynamic', 'static'], default: 'dynamic' },
  status: { type: String, enum: ['active', 'inactive', 'computing'], default: 'active' },
  ruleGroup: { type: SegmentRuleGroupSchema, default: { logic: 'AND', rules: [] } },
  refreshStrategy: { type: String, enum: ['realtime', 'hourly', 'daily', 'manual'], default: 'hourly' },
  lastRefreshedAt: { type: Date },
  memberCount: { type: Number, default: 0 },
  estimatedCount: { type: Number },
  usedInTriggers: { type: Number, default: 0 },
  usedInFlows: { type: Number, default: 0 },
  usedInCampaigns: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  color: { type: String },
  icon: { type: String }
}, { timestamps: true });

SegmentSchema.index({ userId: 1, status: 1 });
SegmentSchema.index({ userId: 1, name: 1 });
SegmentSchema.index({ userId: 1, type: 1 });

export const Segment = mongoose.model<ISegment>('Segment', SegmentSchema);

export interface ISegmentMember extends Document {
  segmentId: mongoose.Types.ObjectId;
  userId: string;
  contactId: string;
  addedAt: Date;
  source: 'rule_match' | 'manual' | 'import' | 'trigger' | 'api';
  metadata?: Record<string, any>;
}

const SegmentMemberSchema = new Schema<ISegmentMember>({
  segmentId: { type: Schema.Types.ObjectId, ref: 'Segment', required: true, index: true },
  userId: { type: String, required: true, index: true },
  contactId: { type: String, required: true, index: true },
  addedAt: { type: Date, default: Date.now },
  source: { type: String, enum: ['rule_match', 'manual', 'import', 'trigger', 'api'], default: 'rule_match' },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

SegmentMemberSchema.index({ segmentId: 1, contactId: 1 }, { unique: true });
SegmentMemberSchema.index({ userId: 1, contactId: 1 });
SegmentMemberSchema.index({ segmentId: 1, addedAt: -1 });

export const SegmentMember = mongoose.model<ISegmentMember>('SegmentMember', SegmentMemberSchema);
