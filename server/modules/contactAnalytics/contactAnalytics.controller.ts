import { Router, Request, Response } from 'express';
import { contactAnalyticsService } from './contactAnalytics.service';
import * as mongodb from '../storage/mongodb.adapter';

const router = Router();

router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { interestLevel, limit, offset } = req.query;
    
    const result = await contactAnalyticsService.getAllContactReports({
      interestLevel: interestLevel as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    
    res.json(result);
  } catch (error) {
    console.error('[ContactAnalytics] Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch contact reports' });
  }
});

router.get('/reports/:phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const report = await contactAnalyticsService.getContactReport(phone);
    
    if (!report) {
      return res.status(404).json({ error: 'Contact report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('[ContactAnalytics] Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch contact report' });
  }
});

router.post('/analyze/:phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const { contactId, contactName } = req.body;
    const userId = (req as any).userId;
    
    const normalizedPhone = phone.replace(/\D/g, '');
    const phoneLast10 = normalizedPhone.slice(-10);
    
    const messages = await mongodb.readCollection<any>('messages');
    const contactMessages = messages.filter((m: any) => {
      const msgContactId = (m.contactId || '').replace(/\D/g, '');
      const msgPhone = (m.phone || '').replace(/\D/g, '');
      const msgIdLast10 = msgContactId.slice(-10);
      const msgPhoneLast10 = msgPhone.slice(-10);
      return msgIdLast10 === phoneLast10 || msgPhoneLast10 === phoneLast10 ||
             msgContactId === normalizedPhone || msgPhone === normalizedPhone;
    });
    
    contactMessages.sort((a: any, b: any) => 
      new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime()
    );
    
    const report = await contactAnalyticsService.analyzeAndUpdateContact(
      contactId || `contact-${normalizedPhone}`,
      normalizedPhone,
      contactName || 'Unknown',
      contactMessages,
      userId
    );
    
    res.json(report);
  } catch (error) {
    console.error('[ContactAnalytics] Error analyzing contact:', error);
    res.status(500).json({ error: 'Failed to analyze contact' });
  }
});

router.post('/analyze-all', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    const contacts = await mongodb.readCollection<any>('contacts');
    const messages = await mongodb.readCollection<any>('messages');
    
    const results = [];
    
    for (const contact of contacts) {
      try {
        const contactPhone = (contact.phone || contact.id)?.replace(/\D/g, '') || '';
        const contactPhoneLast10 = contactPhone.slice(-10);
        
        const contactMessages = messages.filter((m: any) => {
          const msgContactId = (m.contactId || '').replace(/\D/g, '');
          const msgPhone = (m.phone || '').replace(/\D/g, '');
          const msgIdLast10 = msgContactId.slice(-10);
          const msgPhoneLast10 = msgPhone.slice(-10);
          return msgIdLast10 === contactPhoneLast10 || msgPhoneLast10 === contactPhoneLast10 ||
                 msgContactId === contactPhone || msgPhone === contactPhone;
        });
        
        if (contactMessages.length > 0) {
          contactMessages.sort((a: any, b: any) => 
            new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime()
          );
          
          const report = await contactAnalyticsService.analyzeAndUpdateContact(
            contact.id,
            contactPhone,
            contact.name || 'Unknown',
            contactMessages,
            userId
          );
          
          results.push({
            phone: contactPhone,
            name: contact.name,
            interestLevel: report.interestLevel,
            interestScore: report.interestScore,
          });
        }
      } catch (err) {
        console.error(`[ContactAnalytics] Error analyzing contact ${contact.id}:`, err);
      }
    }
    
    res.json({
      analyzed: results.length,
      results,
    });
  } catch (error) {
    console.error('[ContactAnalytics] Error analyzing all contacts:', error);
    res.status(500).json({ error: 'Failed to analyze contacts' });
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await contactAnalyticsService.getContactAnalyticsSummary();
    res.json(summary);
  } catch (error) {
    console.error('[ContactAnalytics] Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

export default router;
