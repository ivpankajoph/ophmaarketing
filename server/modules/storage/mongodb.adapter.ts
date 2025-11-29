import mongoose, { Schema, Document, Model } from 'mongoose';

let isConnected = false;

export async function connectToMongoDB(): Promise<void> {
  if (isConnected) return;

  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    console.error('[MongoDB] MONGODB_URL not configured');
    return;
  }

  try {
    await mongoose.connect(mongoUrl, {
      dbName: 'whatsapp_dashboard',
    });
    isConnected = true;
    console.log('[MongoDB] Connected successfully');
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
  }
}

const AgentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  systemPrompt: { type: String, default: '' },
  instructions: { type: String, default: '' },
  welcomeMessage: { type: String, default: '' },
  model: { type: String, default: 'gpt-4o' },
  temperature: { type: Number, default: 0.7 },
  maxTokens: { type: Number, default: 500 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
}, { collection: 'agents' });

const FormSchema = new Schema({
  id: { type: String, required: true, unique: true },
  fbFormId: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, default: 'active' },
  pageId: { type: String },
  pageName: { type: String },
  leadCount: { type: Number, default: 0 },
  createdTime: { type: String },
  createdAt: { type: String },
  syncedAt: { type: String, required: true },
}, { collection: 'forms' });

const LeadSchema = new Schema({
  id: { type: String, required: true, unique: true },
  fbLeadId: { type: String },
  formId: { type: String, required: true },
  formName: { type: String },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  fieldData: { type: Schema.Types.Mixed, default: {} },
  createdTime: { type: String },
  createdAt: { type: String },
  syncedAt: { type: String },
  autoReplySent: { type: Boolean, default: false },
  autoReplyMessage: { type: String },
  autoReplySentAt: { type: String },
}, { collection: 'leads' });

const MappingSchema = new Schema({
  id: { type: String, required: true, unique: true },
  formId: { type: String, required: true },
  formName: { type: String },
  agentId: { type: String, required: true },
  agentName: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
}, { collection: 'mappings' });

const QualificationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  contactId: { type: String, required: true },
  contactName: { type: String },
  contactPhone: { type: String },
  category: { type: String, enum: ['interested', 'not_interested', 'pending'], default: 'pending' },
  source: { type: String, enum: ['ai_chat', 'campaign', 'ad', 'lead_form', 'manual'], default: 'ai_chat' },
  campaignId: { type: String },
  campaignName: { type: String },
  agentId: { type: String },
  agentName: { type: String },
  messageCount: { type: Number, default: 0 },
  lastMessage: { type: String },
  keywords: { type: [String], default: [] },
  notes: { type: String },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
}, { collection: 'ai_qualifications' });

const BroadcastListSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  contacts: [{
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    tags: { type: [String] },
  }],
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
}, { collection: 'broadcast_lists' });

const ScheduledMessageSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  messageType: { type: String, enum: ['template', 'custom', 'ai_agent'], required: true },
  templateName: { type: String },
  customMessage: { type: String },
  agentId: { type: String },
  contactIds: { type: [String] },
  listId: { type: String },
  scheduledAt: { type: String, required: true },
  status: { type: String, enum: ['scheduled', 'sent', 'failed', 'cancelled'], default: 'scheduled' },
  recipientCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  createdAt: { type: String, required: true },
}, { collection: 'scheduled_messages' });

const BroadcastLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  campaignName: { type: String, required: true },
  contactName: { type: String, required: true },
  contactPhone: { type: String, required: true },
  messageType: { type: String, enum: ['template', 'custom', 'ai_agent'], required: true },
  templateName: { type: String },
  message: { type: String },
  status: { type: String, enum: ['sent', 'delivered', 'failed', 'pending'], default: 'pending' },
  messageId: { type: String },
  error: { type: String },
  timestamp: { type: String, required: true },
  replied: { type: Boolean, default: false },
  repliedAt: { type: String },
}, { collection: 'broadcast_logs' });

const ImportedContactSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  tags: { type: [String], default: [] },
  source: { type: String, default: 'import' },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
}, { collection: 'imported_contacts' });

const ContactAgentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  contactId: { type: String, required: true },
  phone: { type: String, required: true, index: true },
  agentId: { type: String, required: true },
  agentName: { type: String },
  conversationHistory: [{
    role: { type: String, enum: ['user', 'assistant'] },
    content: { type: String },
    timestamp: { type: String }
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
}, { collection: 'contact_agents' });

export const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
export const Form = mongoose.models.Form || mongoose.model('Form', FormSchema);
export const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
export const Mapping = mongoose.models.Mapping || mongoose.model('Mapping', MappingSchema);
export const Qualification = mongoose.models.Qualification || mongoose.model('Qualification', QualificationSchema);
export const BroadcastList = mongoose.models.BroadcastList || mongoose.model('BroadcastList', BroadcastListSchema);
export const ScheduledMessage = mongoose.models.ScheduledMessage || mongoose.model('ScheduledMessage', ScheduledMessageSchema);
export const BroadcastLog = mongoose.models.BroadcastLog || mongoose.model('BroadcastLog', BroadcastLogSchema);
export const ImportedContact = mongoose.models.ImportedContact || mongoose.model('ImportedContact', ImportedContactSchema);
export const ContactAgent = mongoose.models.ContactAgent || mongoose.model('ContactAgent', ContactAgentSchema);

const modelMap: Record<string, Model<any>> = {
  agents: Agent,
  forms: Form,
  leads: Lead,
  mapping: Mapping,
  ai_qualifications: Qualification,
  broadcast_lists: BroadcastList,
  scheduled_messages: ScheduledMessage,
  broadcast_logs: BroadcastLog,
  imported_contacts: ImportedContact,
  contact_agents: ContactAgent,
};

export async function readCollection<T>(collectionName: string): Promise<T[]> {
  await connectToMongoDB();
  const model = modelMap[collectionName];
  if (!model) {
    console.error(`[MongoDB] Unknown collection: ${collectionName}`);
    return [];
  }
  try {
    const docs = await model.find({}).lean();
    return docs as T[];
  } catch (error) {
    console.error(`[MongoDB] Error reading ${collectionName}:`, error);
    return [];
  }
}

export async function writeCollection<T>(collectionName: string, data: T[]): Promise<void> {
  await connectToMongoDB();
  const model = modelMap[collectionName];
  if (!model) {
    console.error(`[MongoDB] Unknown collection: ${collectionName}`);
    return;
  }
  try {
    await model.deleteMany({});
    if (data.length > 0) {
      await model.insertMany(data);
    }
  } catch (error) {
    console.error(`[MongoDB] Error writing ${collectionName}:`, error);
  }
}

export async function findOne<T>(collectionName: string, query: Record<string, any>): Promise<T | null> {
  await connectToMongoDB();
  const model = modelMap[collectionName];
  if (!model) {
    console.error(`[MongoDB] Unknown collection: ${collectionName}`);
    return null;
  }
  try {
    const doc = await model.findOne(query).lean();
    return doc as T | null;
  } catch (error) {
    console.error(`[MongoDB] Error finding in ${collectionName}:`, error);
    return null;
  }
}

export async function findMany<T>(collectionName: string, query: Record<string, any>): Promise<T[]> {
  await connectToMongoDB();
  const model = modelMap[collectionName];
  if (!model) {
    console.error(`[MongoDB] Unknown collection: ${collectionName}`);
    return [];
  }
  try {
    const docs = await model.find(query).lean();
    return docs as T[];
  } catch (error) {
    console.error(`[MongoDB] Error finding in ${collectionName}:`, error);
    return [];
  }
}

export async function insertOne<T extends Record<string, any>>(collectionName: string, data: T): Promise<T | null> {
  await connectToMongoDB();
  const model = modelMap[collectionName];
  if (!model) {
    console.error(`[MongoDB] Unknown collection: ${collectionName}`);
    return null;
  }
  try {
    const doc = await model.create(data);
    return doc.toObject() as T;
  } catch (error) {
    console.error(`[MongoDB] Error inserting into ${collectionName}:`, error);
    return null;
  }
}

export async function updateOne<T>(collectionName: string, query: Record<string, any>, update: Partial<T>): Promise<T | null> {
  await connectToMongoDB();
  const model = modelMap[collectionName];
  if (!model) {
    console.error(`[MongoDB] Unknown collection: ${collectionName}`);
    return null;
  }
  try {
    const doc = await model.findOneAndUpdate(query, { $set: update }, { new: true }).lean();
    return doc as T | null;
  } catch (error) {
    console.error(`[MongoDB] Error updating in ${collectionName}:`, error);
    return null;
  }
}

export async function deleteOne(collectionName: string, query: Record<string, any>): Promise<boolean> {
  await connectToMongoDB();
  const model = modelMap[collectionName];
  if (!model) {
    console.error(`[MongoDB] Unknown collection: ${collectionName}`);
    return false;
  }
  try {
    const result = await model.deleteOne(query);
    return result.deletedCount > 0;
  } catch (error) {
    console.error(`[MongoDB] Error deleting from ${collectionName}:`, error);
    return false;
  }
}

export async function countDocuments(collectionName: string, query: Record<string, any> = {}): Promise<number> {
  await connectToMongoDB();
  const model = modelMap[collectionName];
  if (!model) {
    console.error(`[MongoDB] Unknown collection: ${collectionName}`);
    return 0;
  }
  try {
    return await model.countDocuments(query);
  } catch (error) {
    console.error(`[MongoDB] Error counting in ${collectionName}:`, error);
    return 0;
  }
}

export async function insertMany<T extends Record<string, any>>(collectionName: string, data: T[]): Promise<T[]> {
  await connectToMongoDB();
  const model = modelMap[collectionName];
  if (!model) {
    console.error(`[MongoDB] Unknown collection: ${collectionName}`);
    return [];
  }
  try {
    const docs = await model.insertMany(data, { ordered: false });
    return docs.map(doc => doc.toObject()) as T[];
  } catch (error) {
    console.error(`[MongoDB] Error bulk inserting into ${collectionName}:`, error);
    return [];
  }
}
