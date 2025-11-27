import { Router } from 'express';
import * as controller from './leadAutoReply.controller';

const router = Router();

router.post('/process-all', controller.processAllLeads);
router.post('/process', controller.processLead);
router.post('/send/:leadId', controller.sendReply);

export default router;
