import { Router } from 'express';
import * as controller from './mapping.controller';

const router = Router();

router.get('/', controller.listMappings);
router.get('/form/:formId', controller.getMappingByForm);
router.get('/:id', controller.getMapping);
router.post('/', controller.createMapping);
router.put('/:id', controller.updateMapping);
router.delete('/:id', controller.deleteMapping);

export default router;
