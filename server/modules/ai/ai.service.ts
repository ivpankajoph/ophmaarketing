import { sendChatCompletion, generateAgentResponse as generateOpenAIResponse } from '../openai/openai.service';
import { sendGeminiCompletion, generateGeminiAgentResponse } from '../gemini/gemini.service';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Agent {
  id: string;
  name: string;
  systemPrompt?: string;
  instructions?: string;
  model?: string;
  temperature?: number;
}

function isGeminiModel(model: string): boolean {
  return model.startsWith('gemini-');
}

function isOpenAIModel(model: string): boolean {
  return model.startsWith('gpt-') || !isGeminiModel(model);
}

export async function generateAIResponse(
  messages: ChatMessage[],
  agent?: Agent,
  userId?: string
): Promise<string> {
  const model = agent?.model || 'gpt-4o';
  
  if (isGeminiModel(model)) {
    return sendGeminiCompletion(messages, agent, userId);
  }
  
  return sendChatCompletion(messages, agent, userId);
}

export async function generateAgentResponse(
  userMessage: string,
  agent: Agent,
  conversationHistory: ChatMessage[] = [],
  userId?: string
): Promise<string> {
  const model = agent?.model || 'gpt-4o';
  
  if (isGeminiModel(model)) {
    return generateGeminiAgentResponse(userMessage, agent, conversationHistory, userId);
  }
  
  return generateOpenAIResponse(userMessage, agent, conversationHistory, userId);
}

export function getProviderForModel(model: string): 'openai' | 'gemini' {
  return isGeminiModel(model) ? 'gemini' : 'openai';
}

export const aiService = {
  generateAIResponse,
  generateAgentResponse,
  getProviderForModel,
  isGeminiModel,
  isOpenAIModel,
};
