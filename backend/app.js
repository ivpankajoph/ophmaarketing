require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/middleware/logger');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(logger);

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp + Facebook Lead Ads + AI Agents API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      dashboard: '/api/dashboard',
      whatsapp: {
        webhook: '/api/webhook/whatsapp',
        messages: '/api/messages',
        conversations: '/api/conversations',
        send: '/api/messages/send'
      },
      facebook: {
        syncForms: '/api/facebook/syncForms',
        forms: '/api/facebook/forms',
        syncLeads: '/api/facebook/syncLeads',
        leads: '/api/facebook/leads'
      },
      agents: {
        list: '/api/agents',
        create: '/api/agents',
        test: '/api/agents/:id/test',
        chat: '/api/agents/chat'
      },
      mapping: {
        list: '/api/map-agent',
        create: '/api/map-agent'
      }
    }
  });
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

module.exports = app;
