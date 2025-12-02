import { Router, Request, Response } from 'express';
import * as prefilledTextService from './prefilledText.service';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const mappings = await prefilledTextService.getAllMappings();
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching prefilled text mappings:', error);
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const mapping = await prefilledTextService.getMappingById(req.params.id);
    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    res.json(mapping);
  } catch (error) {
    console.error('Error fetching mapping:', error);
    res.status(500).json({ error: 'Failed to fetch mapping' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { prefilledText, agentId, agentName } = req.body;
    
    if (!prefilledText || !agentId || !agentName) {
      return res.status(400).json({ error: 'Missing required fields: prefilledText, agentId, agentName' });
    }
    
    const mapping = await prefilledTextService.createMapping({
      prefilledText,
      agentId,
      agentName,
    });
    
    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error creating mapping:', error);
    res.status(500).json({ error: 'Failed to create mapping' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const mapping = await prefilledTextService.updateMapping(req.params.id, req.body);
    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    res.json(mapping);
  } catch (error) {
    console.error('Error updating mapping:', error);
    res.status(500).json({ error: 'Failed to update mapping' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prefilledTextService.deleteMapping(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

export default router;
