const { getDb } = require('../models/database');
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  createTransporter(port, secure) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 10000,
      socketTimeout: 30000,
      pool: {
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
      }
    });
  }

  initTransporter() {
    if (process.env.EMAIL_MODE === 'REAL' && process.env.SMTP_HOST) {
      const port = parseInt(process.env.SMTP_PORT || '587');
      const secure = port === 465 || process.env.SMTP_SECURE === 'true';
      this.transporter = this.createTransporter(port, secure);
      console.log(`✅ Gerçek SMTP E-posta Servisi Yapılandırıldı (Port: ${port}, Secure: ${secure})`);
    }
  }

  async sendEmail(emailData) {
    const db = getDb();
    
    // Re-init transporter if env vars populated dynamically
    if (!this.transporter && process.env.EMAIL_MODE === 'REAL' && process.env.SMTP_HOST) {
      this.initTransporter();
    }

    const isReal = process.env.EMAIL_MODE === 'REAL' && this.transporter;

    // Fetch lead email if lead_id is provided and to/lead_email is missing
    let targetEmail = emailData.to || emailData.lead_email;
    if (!targetEmail && emailData.lead_id) {
      const lead = db.prepare('SELECT email FROM leads WHERE id = ?').get(emailData.lead_id);
      if (lead && lead.email) {
        targetEmail = lead.email;
      }
    }

    if (isReal) {
      if (!targetEmail) {
        throw new Error('Alıcı e-posta adresi bulunamadı');
      }

      console.log(`[GERÇEK MAİL] Gönderiliyor: ${emailData.subject} -> ${targetEmail}`);
      
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.6;">
          ${(emailData.body || '').replace(/\n/g, '<br>')}
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'LeadBrew Satış'}" <${process.env.SMTP_USER}>`,
        to: targetEmail,
        subject: emailData.subject,
        text: emailData.body,
        html: htmlBody
      };

      try {
        await this.transporter.sendMail(mailOptions);
        console.log(`✅ [GERÇEK MAİL] Başarıyla gönderildi: ${targetEmail}`);
      } catch (err) {
        console.error('❌ Port üzerinden ilk gönderim hatası, Port 465 SSL deneniyor:', err.message);
        
        // Port 587 / STARTTLS timeout fallback: Try Port 465 Direct SSL
        try {
          const fallbackTransporter = this.createTransporter(465, true);
          await fallbackTransporter.sendMail(mailOptions);
          console.log(`✅ [GERÇEK MAİL - FALLBACK 465 SSL] Başarıyla gönderildi: ${targetEmail}`);
        } catch (fallbackErr) {
          console.error('❌ E-posta gönderim hatası (Fallback da başarısız):', fallbackErr);
          throw new Error(fallbackErr.message || 'SMTP E-posta gönderim zaman aşımı');
        }
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
      message: isReal ? `E-posta ${targetEmail} adresine başarıyla gönderildi!` : 'E-posta gönderildi (Simülasyon)', 
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

