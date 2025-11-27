const express = require('express');
const router = express.Router();

const whatsappRoutes = require('./whatsapp');
const facebookRoutes = require('./facebook');
const agentsRoutes = require('./agents');
const mappingRoutes = require('./mapping');
const dashboardRoutes = require('./dashboard');

router.use(whatsappRoutes);
router.use(facebookRoutes);
router.use(agentsRoutes);
router.use(mappingRoutes);
router.use(dashboardRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
