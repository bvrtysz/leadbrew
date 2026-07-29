const express = require('express');
const router = express.Router();
const { getDb } = require('../models/database');
const uuid = require('uuid').v4;
const emailService = require('../services/emailService');
const aiService = require('../services/aiService');

// GET /api/emails - List all emails
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const emails = db.prepare(`
      SELECT e.*, l.name as lead_name, l.company as lead_company 
      FROM emails e
      LEFT JOIN leads l ON e.lead_id = l.id
      ORDER BY e.created_at DESC
    `).all();
    res.json(emails);
  } catch (error) {
    console.error('E-postalar alınırken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// GET /api/emails/follow-ups - Get pending follow-ups
router.get('/follow-ups', (req, res) => {
  try {
    const db = getDb();
    // Basic logic for pending follow-ups
    const pending = db.prepare(`
      SELECT e.*, l.name, l.email, l.company 
      FROM emails e
      JOIN leads l ON e.lead_id = l.id
      WHERE e.status IN ('sent', 'opened') AND l.status = 'contacted'
      AND e.type IN ('initial', 'follow_up_1', 'follow_up_2')
    `).all();
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/emails/compose - AI-generate personalized email for a lead
router.post('/compose', async (req, res) => {
  try {
    const db = getDb();
    const { lead_id, type = 'initial', context = '' } = req.body;
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead_id);
    
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    
    const emailContent = await aiService.generateEmail(lead, type, context);
    
    res.json({
      subject: emailContent.subject,
      body: emailContent.body
    });
  } catch (error) {
    console.error('E-posta taslağı oluşturulurken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/emails/send - Send email (simulation mode)
router.post('/send', async (req, res) => {
  try {
    const { lead_id, campaign_id, subject, body, type = 'initial' } = req.body;
    
    const emailId = uuid();
    const result = await emailService.sendEmail({
      id: emailId,
      lead_id,
      campaign_id,
      subject,
      body,
      type
    });
    
    res.json(result);
  } catch (error) {
    console.error('E-posta gönderilirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/emails/bulk-send - Send emails to all leads in a campaign
router.post('/bulk-send', async (req, res) => {
  try {
    const db = getDb();
    const { campaign_id, lead_ids } = req.body;
    const results = [];
    
    for (const lead_id of lead_ids) {
      const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead_id);
      if (lead) {
        const emailContent = await aiService.generateEmail(lead, 'initial');
        const emailId = uuid();
        const result = await emailService.sendEmail({
          id: emailId,
          lead_id,
          campaign_id,
          subject: emailContent.subject,
          body: emailContent.body,
          type: 'initial'
        });
        results.push(result);
      }
    }
    
    res.json({ message: \`\${results.length} e-posta başarıyla gönderildi (Simülasyon)\`, results });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/emails/simulate-reply/:id - Simulate a reply
router.post('/simulate-reply/:id', (req, res) => {
  try {
    const emailId = req.params.id;
    const result = emailService.simulateReply(emailId);
    if (!result) return res.status(404).json({ error: 'E-posta bulunamadı veya yanıtlanmaya uygun değil' });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// GET /api/emails/:id - Get single email
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(req.params.id);
    if (!email) return res.status(404).json({ error: 'E-posta bulunamadı' });
    res.json(email);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
