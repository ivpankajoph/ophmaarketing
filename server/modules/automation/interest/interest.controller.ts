import { Request, Response } from 'express';
import { interestClassificationService } from './interest.service';

export const getInterestLists = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || 'default';
    const lists = await interestClassificationService.getInterestLists(userId);
    res.json(lists);
  } catch (error: any) {
    console.error('[Interest] Error getting interest lists:', error);
    res.status(500).json({ error: error.message });
  }
};

export const classifyContact = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || 'default';
    const { messageContent, contactId, contactPhone } = req.body;

    if (!messageContent || !contactId || !contactPhone) {
      return res.status(400).json({ 
        error: 'Missing required fields: messageContent, contactId, contactPhone' 
      });
    }

    const result = await interestClassificationService.classifyAndUpdateContact(
      messageContent,
      contactId,
      contactPhone,
      userId
    );

    res.json(result);
  } catch (error: any) {
    console.error('[Interest] Error classifying contact:', error);
    res.status(500).json({ error: error.message });
  }
};

export const manuallyClassify = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || 'default';
    const { contactId } = req.params;
    const { status } = req.body;

    if (!['interested', 'not_interested', 'neutral'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: interested, not_interested, or neutral' 
      });
    }

    await interestClassificationService.manuallyClassifyContact(contactId, userId, status);
    res.json({ success: true, message: 'Contact classified successfully' });
  } catch (error: any) {
    console.error('[Interest] Error manually classifying contact:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getClassificationLogs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || 'default';
    const { contactId, status, limit, offset } = req.query;

    const result = await interestClassificationService.getClassificationLogs(userId, {
      contactId: contactId as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Interest] Error getting classification logs:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getInterestReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || 'default';
    const { days } = req.query;

    const report = await interestClassificationService.getInterestReport(
      userId,
      days ? parseInt(days as string) : 7
    );

    res.json(report);
  } catch (error: any) {
    console.error('[Interest] Error getting interest report:', error);
    res.status(500).json({ error: error.message });
  }
};

export const testClassification = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await interestClassificationService.classifyMessage(
      message,
      'test',
      'test',
      true
    );

    res.json(result);
  } catch (error: any) {
    console.error('[Interest] Error testing classification:', error);
    res.status(500).json({ error: error.message });
  }
};
