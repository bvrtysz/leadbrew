const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbJsonPath = path.join(dataDir, 'db.json');

let store = {
  leads: [],
  campaigns: [],
  emails: [],
  conversations: [],
  appointments: [],
  busy_slots: []
};

function loadStore() {
  if (fs.existsSync(dbJsonPath)) {
    try {
      const content = fs.readFileSync(dbJsonPath, 'utf8');
      store = JSON.parse(content);
    } catch (e) {
      console.error('db.json okunurken hata, sifirlaniyor:', e);
    }
  }
}

function saveStore() {
  try {
    fs.writeFileSync(dbJsonPath, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('db.json kaydedilirken hata:', e);
  }
}

class PureDb {
  pragma(str) {}

  exec(sql) {}

  prepare(sql) {
    const self = this;
    const cleanSql = sql.trim();

    return {
      run(...args) {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        self._executeRun(cleanSql, params);
        saveStore();
        return { changes: 1 };
      },
      get(...args) {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = self._executeSelect(cleanSql, params);
        return res[0] || undefined;
      },
      all(...args) {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return self._executeSelect(cleanSql, params);
      }
    };
  }

  transaction(fn) {
    return () => {
      fn();
      saveStore();
    };
  }

  _executeSelect(sql, params) {
    const sqlUpper = sql.toUpperCase();

    // SELECT count(*) as count FROM leads
    if (sqlUpper.includes('COUNT(*)') && sqlUpper.includes('FROM LEADS') && !sqlUpper.includes('WHERE')) {
      return [{ count: store.leads.length }];
    }

    // SELECT count(*) as count FROM emails
    if (sqlUpper.includes('COUNT(*)') && sqlUpper.includes('FROM EMAILS')) {
      if (sqlUpper.includes("STATUS != 'DRAFT'")) {
        const count = store.emails.filter(e => e.status !== 'draft').length;
        return [{ count }];
      }
      return [{ count: store.emails.length }];
    }

    // Lead Statuses Group By (stats.js)
    if (sqlUpper.includes('FROM LEADS') && sqlUpper.includes('GROUP BY STATUS')) {
      const counts = {};
      store.leads.forEach(l => {
        const st = l.status || 'new';
        counts[st] = (counts[st] || 0) + 1;
      });
      return Object.keys(counts).map(status => ({ status, count: counts[status] }));
    }

    // Email Stats SUM (stats.js)
    if (sqlUpper.includes('TOTAL_SENT') || sqlUpper.includes('TOTAL_OPENED')) {
      const sentEmails = store.emails.filter(e => e.status !== 'draft');
      const total_sent = sentEmails.length;
      const total_opened = sentEmails.filter(e => e.status === 'opened' || e.status === 'replied').length;
      const total_replied = sentEmails.filter(e => e.status === 'replied').length;
      return [{ total_sent, total_opened, total_replied }];
    }

    // SELECT FROM leads
    if (sqlUpper.includes('FROM LEADS')) {
      let result = [...store.leads];

      if (params && params.length > 0) {
        let pIndex = 0;
        if (sqlUpper.includes('INDUSTRY = ?')) {
          const val = params[pIndex++];
          if (val) result = result.filter(l => (l.industry || '').toLowerCase() === val.toLowerCase());
        }
        if (sqlUpper.includes('STATUS = ?')) {
          const val = params[pIndex++];
          if (val) result = result.filter(l => (l.status || 'new') === val);
        }
        if (sqlUpper.includes('LIKE ?')) {
          const term = (params[pIndex] || '').replace(/%/g, '').toLowerCase();
          result = result.filter(l =>
            (l.name && l.name.toLowerCase().includes(term)) ||
            (l.company && l.company.toLowerCase().includes(term)) ||
            (l.email && l.email.toLowerCase().includes(term))
          );
        }
        if (sqlUpper.includes('WHERE ID = ?') || sqlUpper.includes('WHERE L.ID = ?')) {
          const val = params[0];
          result = result.filter(l => l.id === val);
        }
      }

      if (sqlUpper.includes('ORDER BY CREATED_AT DESC')) {
        result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }
      if (sqlUpper.includes('LIMIT')) {
        const match = sqlUpper.match(/LIMIT\s+(\d+)/);
        if (match) result = result.slice(0, parseInt(match[1]));
      }
      return result;
    }

    // SELECT FROM emails
    if (sqlUpper.includes('FROM EMAILS')) {
      let result = store.emails.map(e => {
        const lead = store.leads.find(l => l.id === e.lead_id);
        return {
          ...e,
          lead_name: lead ? lead.name : null,
          lead_email: lead ? lead.email : null,
          lead_company: lead ? lead.company : null
        };
      });

      if (sqlUpper.includes('WHERE ID = ?') || sqlUpper.includes('WHERE E.ID = ?')) {
        if (params && params[0]) result = result.filter(e => e.id === params[0]);
      }
      if (sqlUpper.includes('WHERE LEAD_ID = ?') || sqlUpper.includes('WHERE E.LEAD_ID = ?')) {
        if (params && params[0]) result = result.filter(e => e.lead_id === params[0]);
      }
      if (sqlUpper.includes('WHERE CAMPAIGN_ID = ?') || sqlUpper.includes('WHERE E.CAMPAIGN_ID = ?')) {
        if (params && params[0]) result = result.filter(e => e.campaign_id === params[0]);
      }
      if (sqlUpper.includes("E.STATUS IN ('SENT', 'OPENED')")) {
        result = result.filter(e => e.status === 'sent' || e.status === 'opened');
      }

      if (sqlUpper.includes('ORDER BY')) {
        result.sort((a, b) => new Date(b.created_at || b.sent_at || 0) - new Date(a.created_at || a.sent_at || 0));
      }
      if (sqlUpper.includes('LIMIT')) {
        const match = sqlUpper.match(/LIMIT\s+(\d+)/);
        if (match) result = result.slice(0, parseInt(match[1]));
      }
      return result;
    }

    // SELECT FROM campaigns
    if (sqlUpper.includes('FROM CAMPAIGNS')) {
      let result = store.campaigns.map(c => {
        const campaignEmails = store.emails.filter(e => e.campaign_id === c.id);
        const sent = campaignEmails.filter(e => e.status !== 'draft').length;
        const total = campaignEmails.length;
        return { ...c, total, sent };
      });

      if (sqlUpper.includes('WHERE ID = ?') || sqlUpper.includes('WHERE C.ID = ?')) {
        if (params && params[0]) result = result.filter(c => c.id === params[0]);
      }
      if (sqlUpper.includes("C.STATUS = 'ACTIVE'")) {
        result = result.filter(c => c.status === 'active');
      }

      if (sqlUpper.includes('ORDER BY')) {
        result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }
      if (sqlUpper.includes('LIMIT')) {
        const match = sqlUpper.match(/LIMIT\s+(\d+)/);
        if (match) result = result.slice(0, parseInt(match[1]));
      }
      return result;
    }

    // SELECT FROM conversations
    if (sqlUpper.includes('FROM CONVERSATIONS')) {
      let result = [...store.conversations];
      if (params && params[0]) {
        result = result.filter(c => c.lead_id === params[0] || c.email_id === params[0]);
      }
      if (params && params[1]) {
        result = result.filter(c => c.direction === params[1]);
      }
      result.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      return result;
    }

    // SELECT FROM appointments
    if (sqlUpper.includes('FROM APPOINTMENTS')) {
      if (!store.appointments) store.appointments = [];
      let result = [...store.appointments];
      if (params && params[0]) {
        result = result.filter(a => a.id === params[0] || a.lead_id === params[0]);
      }
      result.sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
      return result;
    }

    // SELECT FROM busy_slots
    if (sqlUpper.includes('FROM BUSY_SLOTS')) {
      if (!store.busy_slots) store.busy_slots = [];
      let result = [...store.busy_slots];
      result.sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
      return result;
    }

    return [];
  }

  _executeRun(sql, params) {
    const sqlUpper = sql.toUpperCase();

    // INSERT INTO leads
    if (sqlUpper.includes('INSERT INTO LEADS')) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      let newLead = {};
      if (params && typeof params[0] === 'object' && !Array.isArray(params[0])) {
        newLead = { ...params[0], status: params[0].status || 'new', created_at: now };
      } else if (Array.isArray(params)) {
        newLead = {
          id: params[0] || uuid(),
          name: params[1] || '',
          email: params[2] || '',
          company: params[3] || '',
          position: params[4] || '',
          industry: params[5] || '',
          linkedin_url: params[6] || '',
          website: params[7] || '',
          phone: params[8] || '',
          notes: params[9] || '',
          status: 'new',
          source: 'manual',
          created_at: now
        };
      }
      store.leads.unshift(newLead); // Add to beginning of array
    }

    // UPDATE leads SET status = ? WHERE id = ?
    else if (sqlUpper.includes('UPDATE LEADS SET STATUS = ? WHERE ID = ?')) {
      const status = params[0];
      const id = params[1];
      const lead = store.leads.find(l => l.id === id);
      if (lead) lead.status = status;
    }

    // UPDATE leads
    else if (sqlUpper.includes('UPDATE LEADS')) {
      if (params && params.length >= 2) {
        const id = params[params.length - 1];
        const lead = store.leads.find(l => l.id === id);
        if (lead) {
          if (params.length > 2) {
            lead.name = params[0] || lead.name;
            lead.email = params[1] || lead.email;
            lead.company = params[2] || lead.company;
            lead.position = params[3] || lead.position;
            lead.industry = params[4] || lead.industry;
            if (params[5]) lead.status = params[5];
          }
        }
      }
    }

    // DELETE FROM leads WHERE id = ?
    else if (sqlUpper.includes('DELETE FROM LEADS')) {
      const id = params[0];
      store.leads = store.leads.filter(l => l.id !== id);
    }

    // INSERT INTO emails
    else if (sqlUpper.includes('INSERT INTO EMAILS')) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newEmail = {
        id: params[0] || uuid(),
        lead_id: params[1] || null,
        campaign_id: params[2] || null,
        subject: params[3] || '',
        body: params[4] || '',
        type: params[5] || 'initial',
        status: 'sent',
        sent_at: now,
        created_at: now
      };
      store.emails.push(newEmail);
    }

    // UPDATE emails SET status = ...
    else if (sqlUpper.includes('UPDATE EMAILS SET STATUS =')) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      if (sqlUpper.includes("STATUS = 'OPENED'")) {
        const id = params[0];
        const email = store.emails.find(e => e.id === id);
        if (email) { email.status = 'opened'; email.opened_at = now; }
      } else if (sqlUpper.includes("STATUS = 'REPLIED'")) {
        const id = params[0];
        const email = store.emails.find(e => e.id === id);
        if (email) { email.status = 'replied'; email.replied_at = now; }
      }
    }

    // INSERT INTO campaigns
    else if (sqlUpper.includes('INSERT INTO CAMPAIGNS')) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newCampaign = {
        id: params[0] || uuid(),
        name: params[1] || '',
        industry: params[2] || '',
        target_position: params[3] || '',
        description: params[4] || '',
        follow_up_days: params[5] || 5,
        max_follow_ups: params[6] || 3,
        status: 'active',
        created_at: now
      };
      store.campaigns.push(newCampaign);
    }

    // UPDATE campaigns SET status = ? WHERE id = ?
    else if (sqlUpper.includes('UPDATE CAMPAIGNS SET STATUS = ? WHERE ID = ?')) {
      const status = params[0];
      const id = params[1];
      const campaign = store.campaigns.find(c => c.id === id);
      if (campaign) campaign.status = status;
    }

    // DELETE FROM campaigns WHERE id = ?
    else if (sqlUpper.includes('DELETE FROM CAMPAIGNS')) {
      const id = params[0];
      store.campaigns = store.campaigns.filter(c => c.id !== id);
    }

    // INSERT INTO conversations
    else if (sqlUpper.includes('INSERT INTO CONVERSATIONS')) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newConv = {
        id: params[0] || uuid(),
        lead_id: params[1] || null,
        email_id: params[2] || null,
        message: params[3] || '',
        direction: params[4] || 'inbound',
        created_at: now
      };
      store.conversations.push(newConv);
    }

    // INSERT INTO appointments
    else if (sqlUpper.includes('INSERT INTO APPOINTMENTS')) {
      if (!store.appointments) store.appointments = [];
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newAppt = {
        id: params[0] || uuid(),
        lead_id: params[1] || null,
        title: params[2] || 'Toplantı',
        start_time: params[3] || '',
        end_time: params[4] || '',
        status: params[5] || 'confirmed',
        notes: params[6] || '',
        created_at: now
      };
      store.appointments.push(newAppt);
    }

    // UPDATE appointments
    else if (sqlUpper.includes('UPDATE APPOINTMENTS')) {
      if (!store.appointments) store.appointments = [];
      const status = params[0];
      const id = params[1];
      const appt = store.appointments.find(a => a.id === id);
      if (appt) appt.status = status;
    }

    // DELETE FROM appointments
    else if (sqlUpper.includes('DELETE FROM APPOINTMENTS')) {
      if (!store.appointments) store.appointments = [];
      const id = params[0];
      store.appointments = store.appointments.filter(a => a.id !== id);
    }

    // INSERT INTO busy_slots
    else if (sqlUpper.includes('INSERT INTO BUSY_SLOTS')) {
      if (!store.busy_slots) store.busy_slots = [];
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newSlot = {
        id: params[0] || uuid(),
        title: params[1] || 'Dolu / Mesai Dışı',
        start_time: params[2] || '',
        end_time: params[3] || '',
        created_at: now
      };
      store.busy_slots.push(newSlot);
    }

    // DELETE FROM busy_slots
    else if (sqlUpper.includes('DELETE FROM BUSY_SLOTS')) {
      if (!store.busy_slots) store.busy_slots = [];
      const id = params[0];
      store.busy_slots = store.busy_slots.filter(b => b.id !== id);
    }
  }
}

const dbInstance = new PureDb();

function seedInitialData() {
  if (store.leads.length === 0) {
    console.log('Ornek veriler ekleniyor...');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    store.leads = [
      { id: uuid(), name: 'Ahmet Yilmaz', email: 'ahmet.yilmaz@grandhotelistanbul.com', company: 'Grand Hotel Istanbul', position: 'Genel Mudur', industry: 'Otelcilik', status: 'new', created_at: now },
      { id: uuid(), name: 'Ayse Kaya', email: 'ayse.kaya@lezzetrestoran.com', company: 'Lezzet Restoranlari', position: 'Satin Alma Muduru', industry: 'Restoran', status: 'new', created_at: now },
      { id: uuid(), name: 'Mehmet Demir', email: 'mehmet.demir@kahvedukkani.com.tr', company: 'Kahve Dukkani Zinciri', position: 'Isletme Muduru', industry: 'Kafe', status: 'new', created_at: now },
      { id: uuid(), name: 'Fatma Celik', email: 'fatma.celik@kurumsalofisim.com', company: 'Kurumsal Ofis AS', position: 'Operasyon Muduru', industry: 'Kurumsal Ofis', status: 'new', created_at: now },
      { id: uuid(), name: 'Mustafa Sahin', email: 'mustafa.sahin@elitcatering.com', company: 'Elit Catering', position: 'F&B Muduru', industry: 'Catering', status: 'new', created_at: now },
      { id: uuid(), name: 'Emre Yildiz', email: 'emre.yildiz@techcorp.com.tr', company: 'TechCorp Turkiye', position: 'Ofis Yoneticisi', industry: 'Kurumsal Ofis', status: 'new', created_at: now },
      { id: uuid(), name: 'Zeynep Ozturk', email: 'zeynep.ozturk@boutiquehotel.com', company: 'Boutique Hotel', position: 'Genel Mudur', industry: 'Otelcilik', status: 'new', created_at: now },
      { id: uuid(), name: 'Ali Kilic', email: 'ali.kilic@gurmerestoran.com', company: 'Gurme Restoran', position: 'Mutfak Sefi', industry: 'Restoran', status: 'new', created_at: now },
      { id: uuid(), name: 'Burcu Arslan', email: 'burcu.arslan@trendycafe.com', company: 'Trendy Cafe', position: 'Isletme Sahibi', industry: 'Kafe', status: 'new', created_at: now },
      { id: uuid(), name: 'Cem Erdogan', email: 'cem.erdogan@megaavm.com', company: 'Mega AVM Yonetimi', position: 'Satin Alma Sorumlusu', industry: 'Perakende', status: 'new', created_at: now },
      { id: uuid(), name: 'Deniz Cetin', email: 'deniz.cetin@startupturkey.com', company: 'Startup Turkiye', position: 'IK Muduru', industry: 'Kurumsal Ofis', status: 'new', created_at: now },
      { id: uuid(), name: 'Eren Polat', email: 'eren.polat@luxuryresort.com', company: 'Luxury Resort Antalya', position: 'F&B Direktoru', industry: 'Otelcilik', status: 'new', created_at: now },
      { id: uuid(), name: 'Gizem Can', email: 'gizem.can@coffeeshop.com.tr', company: 'Local Coffee Shop', position: 'Kurucu', industry: 'Kafe', status: 'new', created_at: now },
      { id: uuid(), name: 'Hakan Korkmaz', email: 'hakan.korkmaz@anadolulezzetleri.com', company: 'Anadolu Lezzetleri', position: 'Satin Alma Muduru', industry: 'Restoran', status: 'new', created_at: now },
      { id: uuid(), name: 'Ipek Sen', email: 'ipek.sen@eventmanagement.com', company: 'Event Management Co', position: 'Operasyon Direktoru', industry: 'Catering', status: 'new', created_at: now }
    ];
    saveStore();
    console.log('15 ornek lead basariyla eklendi.');
  }
}

async function initDb() {
  loadStore();
  seedInitialData();
  return dbInstance;
}

function getDb() {
  return dbInstance;
}

module.exports = { initDb, getDb };
