import { readCollection, writeCollection, addItem, updateItem, deleteItem, findById } from '../storage';

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = 'agents';

function generateId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getAllAgents(): Agent[] {
  return readCollection<Agent>(COLLECTION);
}

export function getAgentById(id: string): Agent | null {
  return findById<Agent>(COLLECTION, id);
}

export function createAgent(data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Agent {
  const now = new Date().toISOString();
  const agent: Agent = {
    id: generateId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  return addItem<Agent>(COLLECTION, agent);
}

export function updateAgent(id: string, data: Partial<Omit<Agent, 'id' | 'createdAt'>>): Agent | null {
  return updateItem<Agent>(COLLECTION, id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export function deleteAgent(id: string): boolean {
  return deleteItem<Agent>(COLLECTION, id);
}
