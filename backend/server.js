const app = require('./app');
const config = require('./src/config');

const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     WhatsApp + FB Lead Ads + AI Agents Backend           ║
╠══════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║  Environment: ${config.nodeEnv.padEnd(42)}║
║  Storage: ${(process.env.STORAGE_TYPE || 'json').padEnd(47)}║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║  - Dashboard:    GET  /api/dashboard                     ║
║  - WhatsApp:     GET  /api/webhook/whatsapp              ║
║  - WhatsApp:     POST /api/webhook/whatsapp              ║
║  - FB Forms:     POST /api/facebook/syncForms            ║
║  - FB Forms:     GET  /api/facebook/forms                ║
║  - FB Leads:     POST /api/facebook/syncLeads            ║
║  - FB Leads:     GET  /api/facebook/leads                ║
║  - Agents:       GET  /api/agents                        ║
║  - Agents:       POST /api/agents                        ║
║  - Mapping:      GET  /api/map-agent                     ║
║  - Mapping:      POST /api/map-agent                     ║
╚══════════════════════════════════════════════════════════╝
  `);
});
