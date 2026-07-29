const express = require('express');
const router = express.Router();
const { getDb } = require('../models/database');
const uuid = require('uuid').v4;
const leadFinder = require('../services/leadFinder');

// GET /api/leads - List all leads with filtering
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { industry, status, search } = req.query;
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (industry) {
      query += ' AND industry = ?';
      params.push(industry);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';
    const leads = db.prepare(query).all(params);
    res.json(leads);
  } catch (error) {
    console.error('Lead listesi alınırken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// GET /api/leads/:id - Get single lead with all emails and conversations
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const emails = db.prepare('SELECT * FROM emails WHERE lead_id = ? ORDER BY created_at DESC').all(lead.id);
    const conversations = db.prepare('SELECT * FROM conversations WHERE lead_id = ? ORDER BY created_at ASC').all(lead.id);

    res.json({ ...lead, emails, conversations });
  } catch (error) {
    console.error('Lead detayı alınırken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/leads - Create lead
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { name, email, company, position, industry, linkedin_url, website, phone, notes } = req.body;
    const id = uuid();
    
    const stmt = db.prepare(`
      INSERT INTO leads (id, name, email, company, position, industry, linkedin_url, website, phone, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, email, company, position, industry, linkedin_url, website, phone, notes);
    
    const newLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    res.status(201).json(newLead);
  } catch (error) {
    console.error('Lead oluşturulurken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { name, email, company, position, industry, status, notes } = req.body;
    const id = req.params.id;
    
    const stmt = db.prepare(`
      UPDATE leads 
      SET name = ?, email = ?, company = ?, position = ?, industry = ?, status = ?, notes = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(name, email, company, position, industry, status, notes, id);
    if (result.changes === 0) return res.status(404).json({ error: 'Lead bulunamadı' });
    
    const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    res.json(updatedLead);
  } catch (error) {
    console.error('Lead güncellenirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Lead bulunamadı' });
    res.json({ message: 'Lead başarıyla silindi' });
  } catch (error) {
    console.error('Lead silinirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/leads/search - Search/find leads by criteria (simulation)
router.post('/search', async (req, res) => {
  try {
    const db = getDb();
    const { industry, position } = req.body;
    const foundLeads = await leadFinder.findLeads(industry, position);
    
    // Insert found leads into DB
    const insertStmt = db.prepare(`
      INSERT INTO leads (id, name, email, company, position, industry, notes, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'search')
    `);
    
    const addedLeads = [];
    db.transaction(() => {
      for (const lead of foundLeads) {
        insertStmt.run(lead.id, lead.name, lead.email, lead.company, lead.position, lead.industry, lead.notes);
        addedLeads.push(lead);
      }
    })();
    
    res.json({ message: `${addedLeads.length} yeni lead bulundu ve eklendi`, leads: addedLeads });
  } catch (error) {
    console.error('Lead araması yapılırken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
