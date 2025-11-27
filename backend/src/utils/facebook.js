const https = require('https');

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const GRAPH_API_VERSION = 'v21.0';

const makeGraphRequest = (path, method = 'GET', body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}${path}`);
    
    if (!url.searchParams.has('access_token')) {
      url.searchParams.append('access_token', FB_ACCESS_TOKEN);
    }

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
};

const getLeadGenForms = async () => {
  if (!FB_ACCESS_TOKEN || !FB_PAGE_ID) {
    throw new Error('Facebook credentials not configured');
  }

  const response = await makeGraphRequest(`/${FB_PAGE_ID}/leadgen_forms?fields=id,name,status,leads_count,created_time`);
  return response.data || [];
};

const getFormLeads = async (formId, limit = 100) => {
  if (!FB_ACCESS_TOKEN) {
    throw new Error('Facebook credentials not configured');
  }

  const response = await makeGraphRequest(`/${formId}/leads?fields=id,created_time,field_data&limit=${limit}`);
  return response.data || [];
};

const getAllLeads = async (formIds) => {
  const allLeads = [];
  
  for (const formId of formIds) {
    try {
      const leads = await getFormLeads(formId);
      allLeads.push(...leads.map(lead => ({
        ...lead,
        formId
      })));
    } catch (error) {
      console.error(`Error fetching leads for form ${formId}:`, error.message);
    }
  }
  
  return allLeads;
};

module.exports = {
  getLeadGenForms,
  getFormLeads,
  getAllLeads,
  makeGraphRequest
};
