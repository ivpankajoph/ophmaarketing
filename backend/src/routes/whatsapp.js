const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.get('/webhook/whatsapp', whatsappController.verifyWebhook);

router.post('/webhook/whatsapp', whatsappController.handleWebhook);

router.get('/messages', whatsappController.getMessages);

router.get('/conversations', whatsappController.getConversations);

router.post('/messages/send', whatsappController.sendMessage);

module.exports = router;
