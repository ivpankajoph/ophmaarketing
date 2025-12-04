import { Router, Request, Response, NextFunction } from 'express';
import * as controller from './whatsapp.controller';
import { requireAuth } from '../auth/auth.routes';

const router = Router();

router.get('/', controller.verifyWebhook);
router.post('/', controller.handleWebhook);
router.post('/send', requireAuth, controller.sendMessage);
router.post('/send-template', requireAuth, controller.sendTemplateMessageEndpoint);
router.get('/conversations', controller.getConversations);
router.get('/conversations/:phone', controller.getConversation);
router.get('/media/:mediaId', requireAuth, controller.getMediaUrl);

export default router;
