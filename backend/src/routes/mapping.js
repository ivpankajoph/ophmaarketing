const express = require('express');
const router = express.Router();
const mappingController = require('../controllers/mappingController');

router.post('/map-agent', mappingController.createMapping);

router.get('/map-agent', mappingController.getMappings);

router.get('/map-agent/form/:formId', mappingController.getMappingByFormId);

router.delete('/map-agent/:id', mappingController.deleteMapping);

router.delete('/map-agent/form/:formId', mappingController.deleteMappingByFormId);

module.exports = router;
