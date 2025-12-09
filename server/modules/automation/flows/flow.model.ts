import mongoose, { Document, Schema } from 'mongoose';

export interface IFlowNode {
  id: string;
  type: 'start' | 'message' | 'template' | 'delay' | 'condition' | 'split' | 'merge' | 'api_call' | 'webhook' | 'add_tag' | 'remove_tag' | 'update_property' | 'update_score' | 'assign_agent' | 'assign_group' | 'ai_response' | 'wait_for_reply' | 'goto' | 'end';
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;
  };
}

export interface IFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: {
    field: string;
    operator: string;
    value: any;
  };
}

export interface IFlowVariable {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  defaultValue?: any;
  source?: 'contact' | 'trigger' | 'input' | 'api';
  description?: string;
}

export interface IFlowDefinition extends Document {
  userId: string;
  name: string;
  description?: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  nodes: IFlowNode[];
  edges: IFlowEdge[];
  variables: IFlowVariable[];
  entryPoints: {
    type: 'manual' | 'trigger' | 'scheduled' | 'api';
    triggerId?: string;
    schedule?: {
      cronExpression: string;
      timezone: string;
    };
  }[];
  settings: {
    allowMultipleInstances: boolean;
    maxConcurrentInstances: number;
    timeout: number;
    retryOnFailure: boolean;
    maxRetries: number;
  };
  tags?: string[];
  publishedAt?: Date;
  totalInstances: number;
  activeInstances: number;
  completedInstances: number;
  failedInstances: number;
  createdAt: Date;
  updatedAt: Date;
}

const FlowNodeSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['start', 'message', 'template', 'delay', 'condition', 'split', 'merge', 'api_call', 'webhook', 'add_tag', 'remove_tag', 'update_property', 'update_score', 'assign_agent', 'assign_group', 'ai_response', 'wait_for_reply', 'goto', 'end'], required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  data: {
    label: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} }
  }
}, { _id: false });

const FlowEdgeSchema = new Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  sourceHandle: { type: String },
  targetHandle: { type: String },
  label: { type: String },
  condition: {
    field: { type: String },
    operator: { type: String },
    value: { type: Schema.Types.Mixed }
  }
}, { _id: false });

const FlowVariableSchema = new Schema({
  key: { type: String, required: true },
  type: { type: String, enum: ['string', 'number', 'boolean', 'date', 'object', 'array'], required: true },
  defaultValue: { type: Schema.Types.Mixed },
  source: { type: String, enum: ['contact', 'trigger', 'input', 'api'] },
  description: { type: String }
}, { _id: false });

const FlowDefinitionSchema = new Schema<IFlowDefinition>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  nodes: { type: [FlowNodeSchema], default: [] },
  edges: { type: [FlowEdgeSchema], default: [] },
  variables: { type: [FlowVariableSchema], default: [] },
  entryPoints: [{
    type: { type: String, enum: ['manual', 'trigger', 'scheduled', 'api'], required: true },
    triggerId: { type: String },
    schedule: {
      cronExpression: { type: String },
      timezone: { type: String }
    }
  }],
  settings: {
    allowMultipleInstances: { type: Boolean, default: true },
    maxConcurrentInstances: { type: Number, default: 100 },
    timeout: { type: Number, default: 86400000 },
    retryOnFailure: { type: Boolean, default: false },
    maxRetries: { type: Number, default: 3 }
  },
  tags: { type: [String], default: [] },
  publishedAt: { type: Date },
  totalInstances: { type: Number, default: 0 },
  activeInstances: { type: Number, default: 0 },
  completedInstances: { type: Number, default: 0 },
  failedInstances: { type: Number, default: 0 }
}, { timestamps: true });

FlowDefinitionSchema.index({ userId: 1, status: 1 });
FlowDefinitionSchema.index({ userId: 1, name: 1 });

export const FlowDefinition = mongoose.model<IFlowDefinition>('FlowDefinition', FlowDefinitionSchema);

export interface IFlowInstance extends Document {
  flowId: mongoose.Types.ObjectId;
  flowVersion: number;
  userId: string;
  contactId?: string;
  status: 'running' | 'paused' | 'waiting' | 'completed' | 'failed' | 'cancelled';
  currentNodeId: string;
  context: Record<string, any>;
  variables: Record<string, any>;
  entryType: 'manual' | 'trigger' | 'scheduled' | 'api';
  triggerId?: string;
  nodeHistory: {
    nodeId: string;
    nodeType: string;
    enteredAt: Date;
    exitedAt?: Date;
    status: 'entered' | 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
  }[];
  startedAt: Date;
  completedAt?: Date;
  waitingUntil?: Date;
  waitingFor?: string;
  error?: string;
  metadata?: Record<string, any>;
}

const FlowInstanceSchema = new Schema<IFlowInstance>({
  flowId: { type: Schema.Types.ObjectId, ref: 'FlowDefinition', required: true, index: true },
  flowVersion: { type: Number, required: true },
  userId: { type: String, required: true, index: true },
  contactId: { type: String, index: true },
  status: { type: String, enum: ['running', 'paused', 'waiting', 'completed', 'failed', 'cancelled'], default: 'running' },
  currentNodeId: { type: String, required: true },
  context: { type: Schema.Types.Mixed, default: {} },
  variables: { type: Schema.Types.Mixed, default: {} },
  entryType: { type: String, enum: ['manual', 'trigger', 'scheduled', 'api'], required: true },
  triggerId: { type: String },
  nodeHistory: [{
    nodeId: { type: String, required: true },
    nodeType: { type: String, required: true },
    enteredAt: { type: Date, required: true },
    exitedAt: { type: Date },
    status: { type: String, enum: ['entered', 'completed', 'failed', 'skipped'], required: true },
    result: { type: Schema.Types.Mixed },
    error: { type: String }
  }],
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  waitingUntil: { type: Date },
  waitingFor: { type: String },
  error: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

FlowInstanceSchema.index({ flowId: 1, status: 1 });
FlowInstanceSchema.index({ userId: 1, status: 1 });
FlowInstanceSchema.index({ userId: 1, createdAt: -1 });
FlowInstanceSchema.index({ contactId: 1, flowId: 1 });

export const FlowInstance = mongoose.model<IFlowInstance>('FlowInstance', FlowInstanceSchema);
