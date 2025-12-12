import { readCollection, addItem, updateItem, deleteItem, findById, updateManyItems } from '../storage';

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  instructions?: string;
  model: string;
  temperature: number;
  isActive: boolean;
  linkedFlowId?: string;
  linkedFlowName?: string;
  flowEntryPointId?: string;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = 'agents';

function generateId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function getAllAgents(): Promise<Agent[]> {
  return readCollection<Agent>(COLLECTION);
}

export async function getAgentById(id: string): Promise<Agent | null> {
  return findById<Agent>(COLLECTION, id);
}

export async function createAgent(data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
  const now = new Date().toISOString();
  const agent: Agent = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  return addItem<Agent>(COLLECTION, agent);
}

export async function updateAgent(id: string, data: Partial<Omit<Agent, 'id' | 'createdAt'>>): Promise<Agent | null> {
  return updateItem<Agent>(COLLECTION, id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteAgent(id: string): Promise<boolean> {
  return deleteItem<Agent>(COLLECTION, id);
}

export async function updateAllAgentsToGemini(): Promise<{ updated: number; agents: Agent[] }> {
  const updated = await updateManyItems(COLLECTION, {}, { 
    model: 'gemini-2.0-flash',
    updatedAt: new Date().toISOString()
  });
  const agents = await getAllAgents();
  console.log(`[Agent Service] Updated ${updated} agents to use gemini-2.0-flash`);
  return { updated, agents };
}

export async function attachFlowToAgent(
  agentId: string, 
  flowId: string, 
  flowName: string,
  entryPointId?: string
): Promise<Agent | null> {
  return updateItem<Agent>(COLLECTION, agentId, {
    linkedFlowId: flowId,
    linkedFlowName: flowName,
    flowEntryPointId: entryPointId || 'default',
    updatedAt: new Date().toISOString(),
  });
}

export async function detachFlowFromAgent(agentId: string): Promise<Agent | null> {
  return updateItem<Agent>(COLLECTION, agentId, {
    linkedFlowId: undefined,
    linkedFlowName: undefined,
    flowEntryPointId: undefined,
    updatedAt: new Date().toISOString(),
  });
}

export async function getAgentsWithFlow(flowId: string): Promise<Agent[]> {
  const agents = await getAllAgents();
  return agents.filter(agent => agent.linkedFlowId === flowId);
}
