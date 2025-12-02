import * as mongodb from '../storage/mongodb.adapter';

export interface PrefilledTextMapping {
  id: string;
  prefilledText: string;
  agentId: string;
  agentName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getAllMappings(): Promise<PrefilledTextMapping[]> {
  const mappings = await mongodb.readCollection<PrefilledTextMapping>('prefilled_text_mappings');
  return mappings;
}

export async function getMappingById(id: string): Promise<PrefilledTextMapping | null> {
  return mongodb.findOne<PrefilledTextMapping>('prefilled_text_mappings', { id });
}

export async function getMappingByText(text: string): Promise<PrefilledTextMapping | null> {
  const normalizedText = text.toLowerCase().trim();
  
  const mappings = await mongodb.readCollection<PrefilledTextMapping>('prefilled_text_mappings');
  
  for (const mapping of mappings) {
    if (!mapping.isActive) continue;
    
    const mappingText = mapping.prefilledText.toLowerCase().trim();
    if (normalizedText === mappingText || normalizedText.includes(mappingText) || mappingText.includes(normalizedText)) {
      return mapping;
    }
  }
  
  return null;
}

export async function createMapping(data: {
  prefilledText: string;
  agentId: string;
  agentName: string;
}): Promise<PrefilledTextMapping> {
  const now = new Date().toISOString();
  
  const mapping: PrefilledTextMapping = {
    id: `pft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    prefilledText: data.prefilledText,
    agentId: data.agentId,
    agentName: data.agentName,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  
  await mongodb.insertOne<PrefilledTextMapping>('prefilled_text_mappings', mapping);
  return mapping;
}

export async function updateMapping(id: string, data: Partial<PrefilledTextMapping>): Promise<PrefilledTextMapping | null> {
  const updated = await mongodb.updateOne<PrefilledTextMapping>(
    'prefilled_text_mappings',
    { id },
    { ...data, updatedAt: new Date().toISOString() }
  );
  return updated;
}

export async function deleteMapping(id: string): Promise<boolean> {
  await mongodb.deleteOne('prefilled_text_mappings', { id });
  return true;
}

export async function findMatchingAgentForMessage(messageText: string): Promise<PrefilledTextMapping | null> {
  const normalizedMessage = messageText.toLowerCase().trim();
  
  const mappings = await mongodb.readCollection<PrefilledTextMapping>('prefilled_text_mappings');
  const activeMappings = mappings.filter(m => m.isActive);
  
  activeMappings.sort((a, b) => b.prefilledText.length - a.prefilledText.length);
  
  for (const mapping of activeMappings) {
    const mappingText = mapping.prefilledText.toLowerCase().trim();
    
    if (normalizedMessage === mappingText) {
      console.log(`[PrefilledText] Exact match found: "${messageText}" -> Agent: ${mapping.agentName}`);
      return mapping;
    }
    
    if (normalizedMessage.startsWith(mappingText)) {
      console.log(`[PrefilledText] Prefix match found: "${messageText}" starts with "${mapping.prefilledText}" -> Agent: ${mapping.agentName}`);
      return mapping;
    }
  }
  
  return null;
}
