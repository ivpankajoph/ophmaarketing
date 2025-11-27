const Storage = require('../storage');
const { sendToOpenAI, testOpenAI } = require('../utils/openai');

const createAgent = async (req, res) => {
  try {
    const { name, model, prompt, isDefault } = req.body;

    if (!name || !prompt) {
      return res.status(400).json({ error: 'Name and prompt are required' });
    }

    if (isDefault) {
      const agents = await Storage.agents.findAll();
      for (const agent of agents) {
        if (agent.isDefault) {
          await Storage.agents.update(agent.id, { isDefault: false });
        }
      }
    }

    const agent = await Storage.agents.create({
      name,
      model: model || 'gpt-4.1',
      prompt,
      isDefault: isDefault || false
    });

    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAgents = async (req, res) => {
  try {
    const agents = await Storage.agents.findAll();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await Storage.agents.findById(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, prompt, isDefault } = req.body;

    const agent = await Storage.agents.findById(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (isDefault) {
      const agents = await Storage.agents.findAll();
      for (const a of agents) {
        if (a.isDefault && a.id !== id) {
          await Storage.agents.update(a.id, { isDefault: false });
        }
      }
    }

    const updatedAgent = await Storage.agents.update(id, {
      name: name || agent.name,
      model: model || agent.model,
      prompt: prompt || agent.prompt,
      isDefault: isDefault !== undefined ? isDefault : agent.isDefault
    });

    res.json(updatedAgent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const agent = await Storage.agents.findById(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await Storage.agents.delete(id);
    
    await Storage.mapping.deleteMany({ agentId: id });

    res.json({ success: true, message: 'Agent deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const testAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const agent = await Storage.agents.findById(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const response = await sendToOpenAI(agent.model, agent.prompt, message);

    res.json({ 
      agentId: id,
      agentName: agent.name,
      userMessage: message,
      response 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const testChat = async (req, res) => {
  try {
    const { agentId, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let agent;
    if (agentId) {
      agent = await Storage.agents.findById(agentId);
    } else {
      agent = await Storage.agents.findOne({ isDefault: true });
    }

    if (!agent) {
      return res.status(404).json({ error: 'No agent found' });
    }

    const response = await sendToOpenAI(agent.model, agent.prompt, message);

    res.json({ 
      agentId: agent.id,
      agentName: agent.name,
      userMessage: message,
      response 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const testConnection = async (req, res) => {
  try {
    const result = await testOpenAI();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  testAgent,
  testChat,
  testConnection
};
