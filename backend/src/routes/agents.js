const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');

router.post('/agents', agentsController.createAgent);

router.get('/agents', agentsController.getAgents);

router.get('/agents/:id', agentsController.getAgentById);

router.put('/agents/:id', agentsController.updateAgent);

router.delete('/agents/:id', agentsController.deleteAgent);

router.post('/agents/:id/test', agentsController.testAgent);

router.post('/agents/chat', agentsController.testChat);

router.get('/agents/test-connection', agentsController.testConnection);

module.exports = router;
