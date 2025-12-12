import { Request, Response } from 'express';
import * as campaignService from './campaign.service';
import { getUserId } from '../auth/auth.routes';

export async function getAllContacts(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const contacts = await campaignService.getAllContacts(userId);
    res.json(contacts);
  } catch (error: any) {
    console.error('[Campaign] Error getting contacts:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
}

export async function getAvailableContacts(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const contacts = await campaignService.getAvailableContacts(userId);
    res.json(contacts);
  } catch (error: any) {
    console.error('[Campaign] Error getting available contacts:', error);
    res.status(500).json({ error: 'Failed to get available contacts' });
  }
}

export async function createCampaign(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, description, messageType, templateName, customMessage, agentId, contactIds, scheduledAt } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }
    if (!messageType) {
      return res.status(400).json({ error: 'Message type is required' });
    }
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'At least one contact must be selected' });
    }

    const campaign = await campaignService.createCampaign(userId, {
      name,
      description,
      messageType,
      templateName,
      customMessage,
      agentId,
      contactIds,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
    });

    res.status(201).json(campaign);
  } catch (error: any) {
    console.error('[Campaign] Error creating campaign:', error);
    res.status(500).json({ error: error.message || 'Failed to create campaign' });
  }
}

export async function getCampaigns(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { status, limit, offset } = req.query;
    const result = await campaignService.getCampaigns(userId, {
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Campaign] Error getting campaigns:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
}

export async function getCampaignById(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const campaign = await campaignService.getCampaignById(userId, req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error: any) {
    console.error('[Campaign] Error getting campaign:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
}

export async function executeCampaign(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const campaign = await campaignService.executeCampaign(userId, req.params.id);
    res.json(campaign);
  } catch (error: any) {
    console.error('[Campaign] Error executing campaign:', error);
    res.status(500).json({ error: error.message || 'Failed to execute campaign' });
  }
}

export async function getInterestedContacts(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const contacts = await campaignService.getInterestedContacts(userId, req.params.id);
    res.json(contacts);
  } catch (error: any) {
    console.error('[Campaign] Error getting interested contacts:', error);
    res.status(500).json({ error: 'Failed to get interested contacts' });
  }
}

export async function getNotInterestedContacts(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const contacts = await campaignService.getNotInterestedContacts(userId, req.params.id);
    res.json(contacts);
  } catch (error: any) {
    console.error('[Campaign] Error getting not interested contacts:', error);
    res.status(500).json({ error: 'Failed to get not interested contacts' });
  }
}

export async function sendToInterestList(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { interestType, messageType, templateName, agentId, campaignName } = req.body;

    if (!interestType || !['interested', 'not_interested'].includes(interestType)) {
      return res.status(400).json({ error: 'Valid interest type (interested/not_interested) is required' });
    }
    if (!messageType || !['template', 'ai_agent'].includes(messageType)) {
      return res.status(400).json({ error: 'Valid message type (template/ai_agent) is required' });
    }

    const campaign = await campaignService.sendToInterestList(userId, req.params.id, interestType, {
      messageType,
      templateName,
      agentId,
      campaignName
    });

    res.json(campaign);
  } catch (error: any) {
    console.error('[Campaign] Error sending to interest list:', error);
    res.status(500).json({ error: error.message || 'Failed to send to interest list' });
  }
}

export async function deleteCampaign(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const success = await campaignService.deleteCampaign(userId, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('[Campaign] Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
}
