import mongoose, { Document, Schema } from 'mongoose';

export interface IFlowEntryPoint {
  id: string;
  name: string;
  type: 'CTA' | 'BUTTON' | 'LIST';
}

export interface IWhatsAppFlow extends Document {
  userId: string;
  flowId: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'BLOCKED' | 'THROTTLED';
  categories: string[];
  validationErrors?: string[];
  jsonVersion?: string;
  dataApiVersion?: string;
  dataChannelUri?: string;
  previewUrl?: string;
  entryPoints: IFlowEntryPoint[];
  linkedTemplateIds: string[];
  linkedAgentIds: string[];
  lastSyncedAt: Date;
  metaUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FlowEntryPointSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['CTA', 'BUTTON', 'LIST'], default: 'CTA' }
}, { _id: false });

const WhatsAppFlowSchema = new Schema<IWhatsAppFlow>({
  userId: { type: String, required: true, index: true },
  flowId: { type: String, required: true },
  name: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['DRAFT', 'PUBLISHED', 'DEPRECATED', 'BLOCKED', 'THROTTLED'], 
    default: 'DRAFT' 
  },
  categories: { type: [String], default: [] },
  validationErrors: { type: [String], default: [] },
  jsonVersion: { type: String },
  dataApiVersion: { type: String },
  dataChannelUri: { type: String },
  previewUrl: { type: String },
  entryPoints: { type: [FlowEntryPointSchema], default: [] },
  linkedTemplateIds: { type: [String], default: [] },
  linkedAgentIds: { type: [String], default: [] },
  lastSyncedAt: { type: Date, default: Date.now },
  metaUpdatedAt: { type: Date }
}, {
  timestamps: true
});

WhatsAppFlowSchema.index({ userId: 1, flowId: 1 }, { unique: true });

export const WhatsAppFlow = mongoose.model<IWhatsAppFlow>('WhatsAppFlow', WhatsAppFlowSchema);

export interface IFlowSyncCheckpoint extends Document {
  userId: string;
  wabaId: string;
  lastSyncedAt: Date;
  nextCursor?: string;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastError?: string;
}

const FlowSyncCheckpointSchema = new Schema<IFlowSyncCheckpoint>({
  userId: { type: String, required: true, unique: true },
  wabaId: { type: String, required: true },
  lastSyncedAt: { type: Date, default: Date.now },
  nextCursor: { type: String },
  syncStatus: { type: String, enum: ['idle', 'syncing', 'error'], default: 'idle' },
  lastError: { type: String }
}, {
  timestamps: true
});

export const FlowSyncCheckpoint = mongoose.model<IFlowSyncCheckpoint>('FlowSyncCheckpoint', FlowSyncCheckpointSchema);
