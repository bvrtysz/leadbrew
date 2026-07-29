export const api = {
  // Leads
  getLeads: async (filters) => {
    try {
      const res = await fetch(`/api/leads?${new URLSearchParams(filters)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  getLead: async (id) => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  createLead: async (data) => {
    try {
      const res = await fetch(`/api/leads`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  searchLeads: async (criteria) => {
    try {
      const res = await fetch(`/api/leads/search`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(criteria) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  
  // Emails
  composeEmail: async (leadId) => {
    try {
      const res = await fetch(`/api/emails/compose`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ lead_id: leadId }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  sendEmail: async (data) => {
    try {
      const res = await fetch(`/api/emails/send`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'E-posta gönderilemedi');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  getFollowUps: async () => {
    try {
      const res = await fetch(`/api/emails/follow-ups`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  simulateReply: async (id) => {
    try {
      const res = await fetch(`/api/emails/simulate-reply/${id}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  
  // Campaigns
  getCampaigns: async () => {
    try {
      const res = await fetch(`/api/campaigns`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  getCampaign: async (id) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  createCampaign: async (data) => {
    try {
      const res = await fetch(`/api/campaigns`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  addLeadsToCampaign: async (id, leadIds) => {
    try {
      const res = await fetch(`/api/campaigns/${id}/add-leads`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ lead_ids: leadIds }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  },
  
  // Stats
  getDashboardStats: async () => {
    try {
      const res = await fetch(`/api/stats/dashboard`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API Error');
      return json;
    } catch(e) { console.error(e); throw e; }
  }
};
