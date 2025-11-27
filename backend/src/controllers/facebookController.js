const Storage = require('../storage');
const { getLeadGenForms, getFormLeads, getAllLeads } = require('../utils/facebook');

const syncForms = async (req, res) => {
  try {
    const forms = await getLeadGenForms();
    
    for (const form of forms) {
      const existingForm = await Storage.forms.findById(form.id);
      if (existingForm) {
        await Storage.forms.update(form.id, {
          name: form.name,
          status: form.status,
          leadsCount: form.leads_count,
          fbCreatedTime: form.created_time
        });
      } else {
        await Storage.forms.create({
          id: form.id,
          name: form.name,
          status: form.status,
          leadsCount: form.leads_count,
          fbCreatedTime: form.created_time
        });
      }
    }

    const updatedForms = await Storage.forms.findAll();
    res.json({ 
      success: true, 
      message: `Synced ${forms.length} forms`,
      forms: updatedForms 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getForms = async (req, res) => {
  try {
    const forms = await Storage.forms.findAll();
    res.json(forms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const syncLeads = async (req, res) => {
  try {
    const forms = await Storage.forms.findAll();
    const formIds = forms.map(f => f.id);
    
    if (formIds.length === 0) {
      return res.status(400).json({ error: 'No forms found. Please sync forms first.' });
    }

    const leads = await getAllLeads(formIds);
    
    let newLeadsCount = 0;
    for (const lead of leads) {
      const existingLead = await Storage.leads.findById(lead.id);
      if (!existingLead) {
        const fieldData = {};
        if (lead.field_data) {
          lead.field_data.forEach(field => {
            fieldData[field.name] = field.values?.[0] || '';
          });
        }
        
        await Storage.leads.create({
          id: lead.id,
          formId: lead.formId,
          fieldData,
          fbCreatedTime: lead.created_time
        });
        newLeadsCount++;
      }
    }

    const allLeads = await Storage.leads.findAll();
    res.json({ 
      success: true, 
      message: `Synced ${newLeadsCount} new leads (${leads.length} total from FB)`,
      leads: allLeads 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLeads = async (req, res) => {
  try {
    const { formId } = req.query;
    let leads;
    
    if (formId) {
      leads = await Storage.leads.find({ formId });
    } else {
      leads = await Storage.leads.findAll();
    }
    
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Storage.leads.findById(id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  syncForms,
  getForms,
  syncLeads,
  getLeads,
  getLeadById
};
