import { Trigger, ITrigger, ITriggerConditionGroup, ITriggerAction, TriggerExecution, ITriggerExecution, RealTimeEvent, IRealTimeEvent } from './trigger.model';
import { randomUUID } from 'crypto';

const uuidv4 = () => randomUUID();

export async function createTrigger(userId: string, data: Partial<ITrigger>): Promise<ITrigger> {
  const trigger = new Trigger({
    ...data,
    userId,
    status: data.status || 'draft'
  });
  return trigger.save();
}

export async function getTriggerById(userId: string, triggerId: string): Promise<ITrigger | null> {
  return Trigger.findOne({ _id: triggerId, userId });
}

export async function getTriggers(userId: string, filters?: {
  status?: string;
  eventSource?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ triggers: ITrigger[]; total: number }> {
  const query: any = { userId };
  
  if (filters?.status) query.status = filters.status;
  if (filters?.eventSource) query.eventSource = filters.eventSource;
  if (filters?.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const [triggers, total] = await Promise.all([
    Trigger.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Trigger.countDocuments(query)
  ]);

  return { triggers, total };
}

export async function updateTrigger(userId: string, triggerId: string, data: Partial<ITrigger>): Promise<ITrigger | null> {
  return Trigger.findOneAndUpdate(
    { _id: triggerId, userId },
    { $set: data },
    { new: true }
  );
}

export async function deleteTrigger(userId: string, triggerId: string): Promise<boolean> {
  const result = await Trigger.deleteOne({ _id: triggerId, userId });
  return result.deletedCount > 0;
}

export async function activateTrigger(userId: string, triggerId: string): Promise<ITrigger | null> {
  return Trigger.findOneAndUpdate(
    { _id: triggerId, userId },
    { $set: { status: 'active' } },
    { new: true }
  );
}

export async function pauseTrigger(userId: string, triggerId: string): Promise<ITrigger | null> {
  return Trigger.findOneAndUpdate(
    { _id: triggerId, userId },
    { $set: { status: 'paused' } },
    { new: true }
  );
}

export async function duplicateTrigger(userId: string, triggerId: string): Promise<ITrigger | null> {
  const original = await Trigger.findOne({ _id: triggerId, userId });
  if (!original) return null;

  const duplicate = new Trigger({
    ...original.toObject(),
    _id: undefined,
    name: `${original.name} (Copy)`,
    status: 'draft',
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    lastExecutedAt: undefined,
    createdAt: undefined,
    updatedAt: undefined
  });

  return duplicate.save();
}

export function evaluateConditionGroup(conditionGroup: ITriggerConditionGroup, data: Record<string, any>): boolean {
  const { logic, conditions } = conditionGroup;
  
  if (conditions.length === 0) return true;

  const results = conditions.map(condition => {
    if ('logic' in condition) {
      return evaluateConditionGroup(condition as ITriggerConditionGroup, data);
    }
    return evaluateCondition(condition, data);
  });

  return logic === 'AND' 
    ? results.every(r => r) 
    : results.some(r => r);
}

function evaluateCondition(condition: any, data: Record<string, any>): boolean {
  const { field, operator, value } = condition;
  const fieldValue = getNestedValue(data, field);

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'not_equals':
      return fieldValue !== value;
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(value || '').toLowerCase());
    case 'not_contains':
      return !String(fieldValue || '').toLowerCase().includes(String(value || '').toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;
    case 'regex':
      try {
        return new RegExp(value, 'i').test(String(fieldValue || ''));
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export async function getActiveTriggersByEvent(userId: string, eventSource: string, eventType?: string): Promise<ITrigger[]> {
  const query: any = {
    userId,
    status: 'active',
    eventSource
  };
  if (eventType) {
    query.$or = [
      { eventType },
      { eventType: { $exists: false } },
      { eventType: null }
    ];
  }
  return Trigger.find(query).sort({ priority: -1 });
}

export async function processEvent(userId: string, event: {
  sourceType: string;
  eventType: string;
  payload: Record<string, any>;
  contactId?: string;
}): Promise<{ eventId: string; triggersMatched: number; executionsStarted: number }> {
  const eventId = uuidv4();
  
  const realTimeEvent = new RealTimeEvent({
    userId,
    eventId,
    sourceType: event.sourceType,
    eventType: event.eventType,
    payload: event.payload,
    normalizedData: normalizeEventData(event),
    contactId: event.contactId,
    status: 'processing'
  });
  await realTimeEvent.save();

  const activeTriggers = await getActiveTriggersByEvent(userId, event.sourceType, event.eventType);
  const matchedTriggers: ITrigger[] = [];

  for (const trigger of activeTriggers) {
    if (evaluateConditionGroup(trigger.conditionGroup, realTimeEvent.normalizedData)) {
      matchedTriggers.push(trigger);
    }
  }

  realTimeEvent.triggerMatches = matchedTriggers.map(t => t._id);
  realTimeEvent.status = 'processed';
  realTimeEvent.processedAt = new Date();
  await realTimeEvent.save();

  let executionsStarted = 0;
  for (const trigger of matchedTriggers) {
    try {
      await startTriggerExecution(trigger, realTimeEvent);
      executionsStarted++;
    } catch (error) {
      console.error(`[Triggers] Failed to start execution for trigger ${trigger._id}:`, error);
    }
  }

  return { eventId, triggersMatched: matchedTriggers.length, executionsStarted };
}

function normalizeEventData(event: { sourceType: string; eventType: string; payload: Record<string, any>; contactId?: string }): Record<string, any> {
  return {
    sourceType: event.sourceType,
    eventType: event.eventType,
    contactId: event.contactId,
    timestamp: new Date().toISOString(),
    ...event.payload
  };
}

async function startTriggerExecution(trigger: ITrigger, event: IRealTimeEvent): Promise<ITriggerExecution> {
  const execution = new TriggerExecution({
    triggerId: trigger._id,
    userId: trigger.userId,
    eventId: event.eventId,
    eventSource: event.sourceType,
    eventData: event.normalizedData,
    contactId: event.contactId,
    status: 'running'
  });
  await execution.save();

  await Trigger.updateOne(
    { _id: trigger._id },
    { 
      $inc: { executionCount: 1 },
      $set: { lastExecutedAt: new Date() }
    }
  );

  executeActionsAsync(trigger, execution, event);

  return execution;
}

async function executeActionsAsync(trigger: ITrigger, execution: ITriggerExecution, event: IRealTimeEvent): Promise<void> {
  const sortedActions = [...trigger.actions].sort((a, b) => a.order - b.order);
  let hasFailure = false;

  for (const action of sortedActions) {
    const startTime = Date.now();
    try {
      const result = await executeAction(action, event.normalizedData, trigger.userId);
      
      execution.actionResults.push({
        actionId: action.id,
        actionType: action.type,
        status: 'success',
        result,
        executedAt: new Date(),
        duration: Date.now() - startTime
      });
    } catch (error: any) {
      hasFailure = true;
      execution.actionResults.push({
        actionId: action.id,
        actionType: action.type,
        status: 'failed',
        error: error.message,
        executedAt: new Date(),
        duration: Date.now() - startTime
      });
    }
  }

  execution.status = hasFailure ? 'partial' : 'completed';
  execution.completedAt = new Date();
  await execution.save();

  await Trigger.updateOne(
    { _id: trigger._id },
    { 
      $inc: hasFailure ? { failureCount: 1 } : { successCount: 1 }
    }
  );
}

async function executeAction(action: ITriggerAction, eventData: Record<string, any>, userId: string): Promise<any> {
  const { type, config } = action;

  switch (type) {
    case 'send_whatsapp':
      return { message: 'WhatsApp message queued', config };
    case 'send_template':
      return { message: 'Template message queued', config };
    case 'assign_group':
      return { message: 'Contact assigned to group', groupId: config.groupId };
    case 'update_crm':
      return { message: 'CRM field updated', field: config.field, value: config.value };
    case 'api_call':
      return { message: 'API call queued', url: config.url };
    case 'internal_alert':
      return { message: 'Alert sent', alertType: config.alertType };
    case 'start_flow':
      return { message: 'Flow started', flowId: config.flowId };
    case 'add_tag':
      return { message: 'Tag added', tag: config.tag };
    case 'remove_tag':
      return { message: 'Tag removed', tag: config.tag };
    case 'update_score':
      return { message: 'Score updated', scoreChange: config.scoreChange };
    case 'send_email':
      return { message: 'Email queued', to: config.to };
    case 'delay':
      await new Promise(resolve => setTimeout(resolve, Math.min(config.delayMs || 1000, 60000)));
      return { message: 'Delay completed', delayMs: config.delayMs };
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

export async function getTriggerExecutions(userId: string, triggerId?: string, filters?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ executions: ITriggerExecution[]; total: number }> {
  const query: any = { userId };
  
  if (triggerId) query.triggerId = triggerId;
  if (filters?.status) query.status = filters.status;
  if (filters?.startDate || filters?.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate) query.createdAt.$lte = filters.endDate;
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  const [executions, total] = await Promise.all([
    TriggerExecution.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    TriggerExecution.countDocuments(query)
  ]);

  return { executions, total };
}

export async function getRecentActivity(userId: string, limit: number = 20): Promise<IRealTimeEvent[]> {
  return RealTimeEvent.find({ userId })
    .sort({ receivedAt: -1 })
    .limit(limit)
    .populate('triggerMatches', 'name status');
}

export async function getTriggerStats(userId: string): Promise<{
  totalTriggers: number;
  activeTriggers: number;
  totalExecutions: number;
  successRate: number;
  recentExecutions: number;
}> {
  const [totalTriggers, activeTriggers, triggers] = await Promise.all([
    Trigger.countDocuments({ userId }),
    Trigger.countDocuments({ userId, status: 'active' }),
    Trigger.find({ userId }).select('executionCount successCount failureCount')
  ]);

  const totalExecutions = triggers.reduce((sum, t) => sum + t.executionCount, 0);
  const totalSuccesses = triggers.reduce((sum, t) => sum + t.successCount, 0);
  const successRate = totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentExecutions = await TriggerExecution.countDocuments({
    userId,
    createdAt: { $gte: oneDayAgo }
  });

  return {
    totalTriggers,
    activeTriggers,
    totalExecutions,
    successRate: Math.round(successRate * 100) / 100,
    recentExecutions
  };
}
