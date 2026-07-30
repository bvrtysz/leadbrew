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

// GET /api/emails/thread/:leadId - Fetch full conversation messages for a lead
router.get('/thread/:leadId', (req, res) => {
  try {
    const db = getDb();
    const leadId = req.params.leadId;
    
    // Fetch from conversations table
    const convs = db.prepare('SELECT * FROM conversations WHERE lead_id = ? ORDER BY created_at ASC').all(leadId);
    
    if (convs && convs.length > 0) {
      const messages = convs.map(c => ({
        id: c.id,
        text: c.message,
        isSent: c.direction === 'outbound',
        time: c.created_at ? new Date(c.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Şimdi'
      }));
      return res.json(messages);
    }

    // Fallback: fetch directly from emails table if conversations table is empty for this lead
    const emails = db.prepare('SELECT * FROM emails WHERE lead_id = ? ORDER BY created_at ASC').all(leadId);
    const messages = emails.map(e => ({
      id: e.id,
      text: `${e.subject ? e.subject + '\n\n' : ''}${e.body}`,
      isSent: true,
      time: e.created_at ? new Date(e.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Şimdi'
    }));

    res.json(messages);
  } catch (error) {
    console.error('Thread alınırken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/emails/ai-reply-options - Generate 3 AI alternative replies
router.post('/ai-reply-options', async (req, res) => {
  try {
    const db = getDb();
    const { lead_id, last_message } = req.body;
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead_id);
    
    const options = await aiService.generateReplyOptions(lead, last_message);
    res.json({ options });
  } catch (error) {
    console.error('AI yanıt seçenekleri oluşturulurken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST /api/emails/webhook/inbound - Inbound Email Webhook (Catch incoming replies from Brevo/Resend/SendGrid)
router.post('/webhook/inbound', (req, res) => {
  try {
    const db = getDb();
    const senderEmail = req.body.sender?.email || req.body.from || req.body.email;
    const messageText = req.body.htmlContent || req.body.text || req.body.message || req.body.subject;

    if (!senderEmail || !messageText) {
      return res.status(400).json({ error: 'E-posta veya mesaj gövdesi bulunamadı' });
    }

    // Find lead by email
    const lead = db.prepare('SELECT * FROM leads WHERE LOWER(email) = LOWER(?)').get(senderEmail.trim());

    if (lead) {
      // Update lead status to replied
      db.prepare("UPDATE leads SET status = 'replied' WHERE id = ?").run(lead.id);

      // Insert into conversations
      const newId = uuid();
      db.prepare(`
        INSERT INTO conversations (id, lead_id, email_id, message, direction, created_at)
        VALUES (?, ?, NULL, ?, 'inbound', CURRENT_TIMESTAMP)
      `).run(newId, lead.id, messageText);

      console.log(`📥 [INBOUND WEBHOOK] Gelen yanıt kaydedildi: ${senderEmail} (Lead: ${lead.name})`);
      return res.json({ success: true, message: 'Gelen yanıt kaydedildi', lead_id: lead.id });
    } else {
      console.log(`⚠️ [INBOUND WEBHOOK] Kayıtsız adresten yanıt geldi: ${senderEmail}`);
      return res.json({ success: true, message: 'Lead sistemde kayıtlı değil' });
    }
  } catch (error) {
    console.error('Inbound webhook hatası:', error);
    res.status(500).json({ error: 'Webhook işlenemedi' });
  }
});

// POST /api/emails/compose - AI-generate personalized initial email
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

// POST /api/emails/send - Send email (real or simulation)
router.post('/send', async (req, res) => {
  try {
    const { lead_id, lead_email, campaign_id, subject, body, type = 'initial' } = req.body;
    
    const emailId = uuid();
    const result = await emailService.sendEmail({
      id: emailId,
      lead_id,
      lead_email,
      campaign_id,
      subject,
      body,
      type
    });
    
    res.json(result);
  } catch (error) {
    console.error('E-posta gönderilirken hata:', error);
    res.status(500).json({ error: error.message || 'E-posta gönderilemedi' });
  }
});

// POST /api/emails/simulate-lead-reply/:leadId - Trigger simulated reply from lead
router.post('/simulate-lead-reply/:leadId', (req, res) => {
  try {
    const leadId = req.params.leadId;
    const result = emailService.simulateReply(null);
    if (leadId) {
      const db = getDb();
      const uuid = require('uuid').v4;
      db.prepare("UPDATE leads SET status = 'replied' WHERE id = ?").run(leadId);
      const sampleReplies = [
        'Merhaba, sunduğunuz çay ve kahve teklifi ilgimizi çekti. Fiyat listesini ve numune talep formunu gönderebilir misiniz?',
        'İyi günler, önümüzdeki hafta salı günü 14:00 için kısa bir tanıtım toplantısı ayarlayabiliriz. Saygılarımla.',
        'Merhaba, ürün kataloğunuzu inceledik. Toptan alımda ödeme koşullarınız nedir?'
      ];
      const randomReply = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];
      db.prepare(`
        INSERT INTO conversations (id, lead_id, email_id, message, direction, created_at)
        VALUES (?, ?, NULL, ?, 'inbound', CURRENT_TIMESTAMP)
      `).run(uuid(), leadId, randomReply);
    }
    res.json({ success: true, message: 'Müşteri yanıtı simüle edildi' });
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
