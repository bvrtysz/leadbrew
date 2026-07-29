const { getDb } = require('../models/database');
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (process.env.EMAIL_MODE === 'REAL' && process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('✅ Gerçek SMTP E-posta Servisi Yapılandırıldı');
    }
  }

  async sendEmail(emailData) {
    const db = getDb();
    const isReal = process.env.EMAIL_MODE === 'REAL' && this.transporter;

    if (isReal) {
      try {
        console.log(`[GERÇEK MAİL] Gönderiliyor: ${emailData.subject} -> ${emailData.to || emailData.lead_email}`);
        
        await this.transporter.sendMail({
          from: `"${process.env.SMTP_FROM_NAME || 'LeadBrew Satış'}" <${process.env.SMTP_USER}>`,
          to: emailData.to || emailData.lead_email,
          subject: emailData.subject,
          text: emailData.body,
          html: emailData.body.replace(/\n/g, '<br>')
        });
        
        console.log(`✅ [GERÇEK MAİL] Başarıyla gönderildi: ${emailData.to || emailData.lead_email}`);
      } catch (err) {
        console.error('❌ E-posta gönderim hatası:', err);
        throw err;
      }
    } else {
      console.log(`[SİMÜLASYON] E-posta Gönderiliyor: ${emailData.subject} -> Lead ID: ${emailData.lead_id}`);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Veritabanına kaydet
    const stmt = db.prepare(`
      INSERT INTO emails (id, lead_id, campaign_id, subject, body, type, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)
    `);

    stmt.run(
      emailData.id, 
      emailData.lead_id || null, 
      emailData.campaign_id || null, 
      emailData.subject, 
      emailData.body, 
      emailData.type || 'initial'
    );

    if (emailData.lead_id) {
      db.prepare("UPDATE leads SET status = 'contacted' WHERE id = ?").run(emailData.lead_id);
    }

    return { 
      success: true, 
      message: isReal ? 'Gerçek e-posta başarıyla gönderildi!' : 'E-posta gönderildi (Simülasyon)', 
      id: emailData.id 
    };
  }

  simulateReply(emailId) {
    const db = getDb();
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId);
    if (!email || email.status === 'replied') return null;

    db.prepare("UPDATE emails SET status = 'replied', replied_at = CURRENT_TIMESTAMP WHERE id = ?").run(emailId);
    if (email.lead_id) {
      db.prepare("UPDATE leads SET status = 'replied' WHERE id = ?").run(email.lead_id);
    }

    const uuid = require('uuid').v4;
    db.prepare(`
      INSERT INTO conversations (id, lead_id, email_id, message, direction)
      VALUES (?, ?, ?, ?, 'inbound')
    `).run(uuid(), email.lead_id, emailId, 'Merhaba, konuyla ilgileniyoruz. Detaylı bilgi alabilir miyim?');

    return { success: true, message: 'Yanıt simüle edildi' };
  }
}

module.exports = new EmailService();
