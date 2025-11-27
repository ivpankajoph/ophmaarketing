const Storage = require('../storage');

const createMapping = async (req, res) => {
  try {
    const { formId, agentId, senderId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    if (!formId && !senderId) {
      return res.status(400).json({ error: 'Either formId or senderId is required' });
    }

    const agent = await Storage.agents.findById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (formId) {
      const existingMapping = await Storage.mapping.findOne({ formId });
      if (existingMapping) {
        const updated = await Storage.mapping.update(existingMapping.id, { agentId });
        return res.json(updated);
      }
    }

    if (senderId) {
      const existingMapping = await Storage.mapping.findOne({ senderId });
      if (existingMapping) {
        const updated = await Storage.mapping.update(existingMapping.id, { agentId });
        return res.json(updated);
      }
    }

    const mapping = await Storage.mapping.create({
      formId,
      senderId,
      agentId
    });

    res.status(201).json(mapping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMappings = async (req, res) => {
  try {
    const mappings = await Storage.mapping.findAll();
    
    const enrichedMappings = await Promise.all(
      mappings.map(async (mapping) => {
        const agent = await Storage.agents.findById(mapping.agentId);
        let form = null;
        if (mapping.formId) {
          form = await Storage.forms.findById(mapping.formId);
        }
        return {
          ...mapping,
          agent: agent ? { id: agent.id, name: agent.name } : null,
          form: form ? { id: form.id, name: form.name } : null
        };
      })
    );

    res.json(enrichedMappings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMappingByFormId = async (req, res) => {
  try {
    const { formId } = req.params;
    const mapping = await Storage.mapping.findOne({ formId });

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    const agent = await Storage.agents.findById(mapping.agentId);
    
    res.json({
      ...mapping,
      agent: agent ? { id: agent.id, name: agent.name } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMapping = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await Storage.mapping.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    res.json({ success: true, message: 'Mapping deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMappingByFormId = async (req, res) => {
  try {
    const { formId } = req.params;
    
    const deleted = await Storage.mapping.deleteMany({ formId });
    
    res.json({ success: true, message: `Deleted ${deleted} mapping(s)` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createMapping,
  getMappings,
  getMappingByFormId,
  deleteMapping,
  deleteMappingByFormId
};
