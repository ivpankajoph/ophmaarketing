import { Router, Request, Response } from 'express';
import { reportsService, TimeFilter } from './reports.service';
import { getUserId } from '../auth/auth.routes';

const router = Router();

function parseTimeFilter(req: Request): TimeFilter {
  const period = (req.query.period as string) || 'week';
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  
  return {
    period: period as TimeFilter['period'],
    startDate,
    endDate,
  };
}

router.get('/ai-agents', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const filter = parseTimeFilter(req);
    const data = await reportsService.getAIAgentPerformance(filter, userId);
    res.json(data);
  } catch (error) {
    console.error('[Reports] Error fetching AI agent performance:', error);
    res.status(500).json({ error: 'Failed to fetch AI agent performance data' });
  }
});

router.get('/customer-replies', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const filter = parseTimeFilter(req);
    const data = await reportsService.getCustomerReplies(filter, userId);
    res.json(data);
  } catch (error) {
    console.error('[Reports] Error fetching customer replies:', error);
    res.status(500).json({ error: 'Failed to fetch customer replies data' });
  }
});

router.get('/user-engagement', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const filter = parseTimeFilter(req);
    const data = await reportsService.getUserEngagement(filter, userId);
    res.json(data);
  } catch (error) {
    console.error('[Reports] Error fetching user engagement:', error);
    res.status(500).json({ error: 'Failed to fetch user engagement data' });
  }
});

router.get('/spending', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const filter = parseTimeFilter(req);
    const data = await reportsService.getSpendingReport(filter, userId);
    res.json(data);
  } catch (error) {
    console.error('[Reports] Error fetching spending report:', error);
    res.status(500).json({ error: 'Failed to fetch spending data' });
  }
});

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const filter = parseTimeFilter(req);
    const data = await reportsService.getDashboardOverview(filter, userId);
    res.json(data);
  } catch (error) {
    console.error('[Reports] Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

export default router;
