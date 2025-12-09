import { Router, Request, Response } from 'express';
import * as integrationService from './integration.service';
import { requireAuth, getUserId } from '../auth/auth.routes';

const router = Router();

router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = await integrationService.getAllProviders();
    res.json(providers);
  } catch (error) {
    console.error('[Integrations] Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

router.get('/providers/:providerId', async (req: Request, res: Response) => {
  try {
    const provider = await integrationService.getProviderDetails(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.json(provider);
  } catch (error) {
    console.error('[Integrations] Error fetching provider:', error);
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

router.get('/connections', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const connections = await integrationService.getUserConnections(userId);
    res.json(connections);
  } catch (error) {
    console.error('[Integrations] Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

router.get('/connections/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const connectionsWithStatus = await integrationService.getConnectionsWithStatus(userId);
    res.json(connectionsWithStatus);
  } catch (error) {
    console.error('[Integrations] Error fetching connection status:', error);
    res.status(500).json({ error: 'Failed to fetch connection status' });
  }
});

router.get('/connections/:connectionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const connection = await integrationService.getConnectionById(userId, req.params.connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    const maskedCredentials = await integrationService.getMaskedCredentials(userId, req.params.connectionId);
    res.json({ 
      ...connection, 
      credentials: maskedCredentials 
    });
  } catch (error) {
    console.error('[Integrations] Error fetching connection:', error);
    res.status(500).json({ error: 'Failed to fetch connection' });
  }
});

router.post('/connect', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { providerId, credentials, metadata, setAsDefault } = req.body;
    
    if (!providerId || !credentials) {
      return res.status(400).json({ error: 'Provider ID and credentials are required' });
    }

    const result = await integrationService.connectIntegration(userId, {
      providerId,
      credentials,
      metadata,
      setAsDefault: setAsDefault !== false
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ 
      success: true, 
      connection: result.connection,
      message: 'Integration connected successfully'
    });
  } catch (error) {
    console.error('[Integrations] Error connecting integration:', error);
    res.status(500).json({ error: 'Failed to connect integration' });
  }
});

router.post('/connections/:connectionId/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await integrationService.verifyConnection(userId, req.params.connectionId);
    res.json(result);
  } catch (error) {
    console.error('[Integrations] Error verifying connection:', error);
    res.status(500).json({ error: 'Failed to verify connection' });
  }
});

router.post('/connections/:connectionId/set-default', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await integrationService.setDefaultConnection(userId, req.params.connectionId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ success: true, message: 'Default connection updated' });
  } catch (error) {
    console.error('[Integrations] Error setting default connection:', error);
    res.status(500).json({ error: 'Failed to set default connection' });
  }
});

router.delete('/connections/:connectionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await integrationService.disconnectIntegration(userId, req.params.connectionId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ success: true, message: 'Integration disconnected successfully' });
  } catch (error) {
    console.error('[Integrations] Error disconnecting integration:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

router.get('/credentials/:providerId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const credentials = await integrationService.getDecryptedCredentials(userId, req.params.providerId);
    
    if (!credentials) {
      return res.status(404).json({ error: 'No active connection found for this provider' });
    }
    
    res.json(credentials);
  } catch (error) {
    console.error('[Integrations] Error fetching credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

export default router;
