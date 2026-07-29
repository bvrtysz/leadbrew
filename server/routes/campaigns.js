const express = require('express');
const router = express.Router();
const { getDb } = require('../models/database');
const uuid = require('uuid').v4;

// GET /api/campaigns - List all campaigns
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// GET /api/campaigns/:id - Get campaign with stats
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });
    
    const stats = db.prepare(`
      SELECT 
        COUNT(id) as total_emails,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied
      FROM emails 
      WHERE campaign_id = ?
    `).get(campaign.id);
    
    res.json({ ...campaign, stats });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/campaigns - Create campaign
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { name, industry, target_position, description, follow_up_days = 5, max_follow_ups = 3, email_template } = req.body;
    const id = uuid();
    
    const stmt = db.prepare(`
      INSERT INTO campaigns (id, name, industry, target_position, description, follow_up_days, max_follow_ups, email_template)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, industry, target_position, description, follow_up_days, max_follow_ups, email_template);
    
    const newCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    res.status(201).json(newCampaign);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { name, status, description, follow_up_days, max_follow_ups, email_template } = req.body;
    
    const stmt = db.prepare(`
      UPDATE campaigns 
      SET name = ?, status = ?, description = ?, follow_up_days = ?, max_follow_ups = ?, email_template = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(name, status, description, follow_up_days, max_follow_ups, email_template, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Kampanya bulunamadı' });
    
    const updatedCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    res.json(updatedCampaign);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Kampanya bulunamadı' });
    res.json({ message: 'Kampanya başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/campaigns/:id/add-leads - Add leads to a campaign
router.post('/:id/add-leads', (req, res) => {
  try {
    const db = getDb();
    const { lead_ids } = req.body;
    const campaign_id = req.params.id;
    
    if (!Array.isArray(lead_ids)) {
      return res.status(400).json({ error: 'lead_ids dizisi gereklidir' });
    }

    let count = 0;
    const insertEmail = db.prepare(`
      INSERT INTO emails (id, lead_id, campaign_id, status, type)
      VALUES (?, ?, ?, 'draft', 'initial')
    `);
    
    db.transaction(() => {
      for (const lead_id of lead_ids) {
        insertEmail.run(uuid(), lead_id, campaign_id);
        count++;
      }
    })();
    
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
