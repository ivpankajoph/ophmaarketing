import { Router, Request, Response, NextFunction } from 'express';
import * as controller from './whatsapp.controller';

const router = Router();

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

router.get('/', controller.verifyWebhook);
router.post('/', controller.handleWebhook);
router.post('/send', controller.sendMessage);
router.post('/send-template', requireAuth, controller.sendTemplateMessageEndpoint);
router.get('/conversations', controller.getConversations);
router.get('/conversations/:phone', controller.getConversation);
router.get('/media/:mediaId', requireAuth, controller.getMediaUrl);

export default router;
