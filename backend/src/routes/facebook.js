const express = require('express');
const router = express.Router();
const facebookController = require('../controllers/facebookController');

router.post('/facebook/syncForms', facebookController.syncForms);

router.get('/facebook/forms', facebookController.getForms);

router.post('/facebook/syncLeads', facebookController.syncLeads);

router.get('/facebook/leads', facebookController.getLeads);

router.get('/facebook/leads/:id', facebookController.getLeadById);

module.exports = router;
