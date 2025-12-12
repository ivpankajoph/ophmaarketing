import { Request, Response } from 'express';
import * as flowsService from './flows.service';
import * as whatsappService from './whatsapp.service';

function getUserId(req: Request): string | null {
  return (req as any).userId || (req as any).user?.id || null;
}

export async function syncFlows(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await flowsService.syncFlowsFromMeta(userId);
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[Flows] Sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync flows' });
  }
}

export async function getFlows(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { status, search, page, limit } = req.query;
    const result = await flowsService.getFlows(userId, {
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    res.json(result);
  } catch (error) {
    console.error('[Flows] Get flows error:', error);
    res.status(500).json({ error: 'Failed to get flows' });
  }
}

export async function getFlowById(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const flow = await flowsService.getFlowById(userId, req.params.id);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json(flow);
  } catch (error) {
    console.error('[Flows] Get flow error:', error);
    res.status(500).json({ error: 'Failed to get flow' });
  }
}

export async function getFlowStats(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const stats = await flowsService.getFlowStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('[Flows] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get flow stats' });
  }
}

export async function getSyncStatus(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const status = await flowsService.getSyncStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('[Flows] Get sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
}

export async function updateEntryPoints(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { entryPoints } = req.body;
    const flow = await flowsService.updateFlowEntryPoints(userId, req.params.id, entryPoints);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json(flow);
  } catch (error) {
    console.error('[Flows] Update entry points error:', error);
    res.status(500).json({ error: 'Failed to update entry points' });
  }
}

export async function attachToTemplate(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { templateId } = req.body;
    const flow = await flowsService.attachFlowToTemplate(userId, req.params.id, templateId);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json(flow);
  } catch (error) {
    console.error('[Flows] Attach to template error:', error);
    res.status(500).json({ error: 'Failed to attach flow to template' });
  }
}

export async function detachFromTemplate(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const flow = await flowsService.detachFlowFromTemplate(userId, req.params.id, req.params.templateId);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json(flow);
  } catch (error) {
    console.error('[Flows] Detach from template error:', error);
    res.status(500).json({ error: 'Failed to detach flow from template' });
  }
}

export async function attachToAgent(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { agentId } = req.body;
    const flow = await flowsService.attachFlowToAgent(userId, req.params.id, agentId);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json(flow);
  } catch (error) {
    console.error('[Flows] Attach to agent error:', error);
    res.status(500).json({ error: 'Failed to attach flow to agent' });
  }
}

export async function detachFromAgent(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const flow = await flowsService.detachFlowFromAgent(userId, req.params.id, req.params.agentId);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json(flow);
  } catch (error) {
    console.error('[Flows] Detach from agent error:', error);
    res.status(500).json({ error: 'Failed to detach flow from agent' });
  }
}

export async function sendFlow(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { phoneNumber, entryPointId, headerText, bodyText, footerText, ctaText } = req.body;
    
    const flow = await flowsService.getFlowById(userId, req.params.id);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });

    if (flow.status !== 'PUBLISHED') {
      return res.status(400).json({ error: 'Only published flows can be sent' });
    }

    const result = await whatsappService.sendFlowMessage(userId, {
      to: phoneNumber,
      flowId: flow.flowId,
      flowName: flow.name,
      entryPointId: entryPointId || 'default',
      headerText: headerText || 'Interactive Flow',
      bodyText: bodyText || 'Please complete the following flow',
      footerText,
      ctaText: ctaText || 'Start'
    });

    res.json({
      success: true,
      messageId: result.messageId,
      flow: flow.name
    });
  } catch (error: any) {
    console.error('[Flows] Send flow error:', error);
    res.status(500).json({ error: error.message || 'Failed to send flow' });
  }
}

export async function deleteFlow(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const deleted = await flowsService.deleteFlow(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Flow not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('[Flows] Delete flow error:', error);
    res.status(500).json({ error: 'Failed to delete flow' });
  }
}

export async function createFlow(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, categories, endpointUri } = req.body;

    if (!name || !categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'Name and at least one category are required' });
    }

    const result = await flowsService.createFlowInMeta(userId, {
      name,
      categories,
      endpointUri
    });

    res.json({
      success: true,
      flowId: result.flowId,
      flow: result.flow
    });
  } catch (error: any) {
    console.error('[Flows] Create flow error:', error);
    res.status(500).json({ error: error.message || 'Failed to create flow' });
  }
}

export async function publishFlow(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const flow = await flowsService.publishFlowInMeta(userId, req.params.id);
    res.json({ success: true, flow });
  } catch (error: any) {
    console.error('[Flows] Publish flow error:', error);
    res.status(500).json({ error: error.message || 'Failed to publish flow' });
  }
}

export async function deprecateFlow(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const flow = await flowsService.deprecateFlowInMeta(userId, req.params.id);
    res.json({ success: true, flow });
  } catch (error: any) {
    console.error('[Flows] Deprecate flow error:', error);
    res.status(500).json({ error: error.message || 'Failed to deprecate flow' });
  }
}

export async function deleteFlowFromMeta(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await flowsService.deleteFlowInMeta(userId, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Flows] Delete from Meta error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete flow from Meta' });
  }
}
