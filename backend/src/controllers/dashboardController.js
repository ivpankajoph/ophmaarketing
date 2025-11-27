const Storage = require('../storage');

const getDashboardStats = async (req, res) => {
  try {
    const [forms, leads, agents, messages] = await Promise.all([
      Storage.forms.findAll(),
      Storage.leads.findAll(),
      Storage.agents.findAll(),
      Storage.messages.findAll()
    ]);

    const inboundMessages = messages.filter(m => m.direction === 'inbound');
    const outboundMessages = messages.filter(m => m.direction === 'outbound');

    res.json({
      totalForms: forms.length,
      totalLeads: leads.length,
      totalAgents: agents.length,
      totalMessages: messages.length,
      inboundMessages: inboundMessages.length,
      outboundMessages: outboundMessages.length,
      recentLeads: leads.slice(-5).reverse(),
      recentMessages: messages.slice(-10).reverse()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDashboardStats
};
