const { getDb } = require('../models/database');

class EmailService {
  constructor() {
    this.mode = process.env.EMAIL_MODE || 'SIMULATION';
    console.log(`E-posta modu: ${this.mode}`);
  }

  async sendViaNodemailer(to, subject, htmlBody, textBody) {
    const nodemailer = require('nodemailer');
    
    // Use Nodemailer built-in Gmail service or explicit SMTP settings
    const port = parseInt(process.env.SMTP_PORT || '465');
    const secure = port === 465 || process.env.SMTP_SECURE === 'true';
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: secure,
      auth: {
        user: process.env.SMTP_USER || 'bvrtysz@gmail.com',
        pass: process.env.SMTP_PASS || 'osza oazs kauw qyjn',
      },
      connectionTimeout: 15000,
      greetingTimeout: 8000,
      socketTimeout: 20000,
    });

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Conbella'}" <${process.env.SMTP_USER || 'bvrtysz@gmail.com'}>`,
      to: to,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });
  }

  async sendViaResend(to, subject, htmlBody, textBody) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Conbella <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: htmlBody,
        text: textBody,
      }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || JSON.stringify(data));
    }
    return data;
  }

  async sendEmail(emailData) {
    const db = getDb();

    // Determine target email
    let targetEmail = emailData.to || emailData.lead_email;
    if (!targetEmail && emailData.lead_id) {
      const lead = db.prepare('SELECT email FROM leads WHERE id = ?').get(emailData.lead_id);
      if (lead && lead.email) targetEmail = lead.email;
    }

    const htmlBody = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.6;">
      ${(emailData.body || '').replace(/\n/g, '<br>')}</body></html>`;

    if (this.mode === 'REAL') {
      if (!targetEmail) throw new Error('Alici e-posta adresi bulunamadi');

      console.log(`[GERCEK MAIL] Gonderiliyor: ${emailData.subject} -> ${targetEmail}`);

      // Try Gmail SMTP first so emails go directly to ANY address (yahoo, hotmail, etc.)
      const smtpUser = process.env.SMTP_USER || 'bvrtysz@gmail.com';
      const smtpPass = process.env.SMTP_PASS || 'osza oazs kauw qyjn';

      if (smtpUser && smtpPass) {
        try {
          await this.sendViaNodemailer(targetEmail, emailData.subject, htmlBody, emailData.body);
          console.log(`✅ [GMAIL SMTP] Basariyla gonderildi: ${targetEmail}`);
        } catch (smtpErr) {
          console.error('❌ Gmail SMTP hatasi, Resend deneniyor:', smtpErr.message);
          if (process.env.RESEND_API_KEY) {
            await this.sendViaResend(targetEmail, emailData.subject, htmlBody, emailData.body);
            console.log(`✅ [RESEND FALLBACK] Basariyla gonderildi: ${targetEmail}`);
          } else {
            throw smtpErr;
          }
        }
      } else if (process.env.RESEND_API_KEY) {
        await this.sendViaResend(targetEmail, emailData.subject, htmlBody, emailData.body);
        console.log(`✅ [RESEND] Basariyla gonderildi: ${targetEmail}`);
      } else {
        throw new Error('E-posta servisi yapilandirilmamis (SMTP_USER veya RESEND_API_KEY gerekli)');
      }
    } else {
      console.log(`[SIMULASYON] E-posta: ${emailData.subject} -> Lead ID: ${emailData.lead_id}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save email to database
    db.prepare(`
      INSERT INTO emails (id, lead_id, campaign_id, subject, body, type, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)
    `).run(
      emailData.id,
      emailData.lead_id || null,
      emailData.campaign_id || null,
      emailData.subject,
      emailData.body,
      emailData.type || 'initial'
    );

    // Save to conversations history & update lead status
    if (emailData.lead_id) {
      db.prepare("UPDATE leads SET status = 'contacted' WHERE id = ?").run(emailData.lead_id);
      
      const uuid = require('uuid').v4;
      db.prepare(`
        INSERT INTO conversations (id, lead_id, email_id, message, direction, created_at)
        VALUES (?, ?, ?, ?, 'outbound', CURRENT_TIMESTAMP)
      `).run(uuid(), emailData.lead_id, emailData.id, emailData.body);
    }

    return {
      success: true,
      message: this.mode === 'REAL' ? `E-posta ${targetEmail} adresine gonderildi!` : 'E-posta gonderildi (Simulasyon)',
      id: emailData.id
    };
  }

  simulateReply(emailId) {
    const db = getDb();
    let email = null;
    let leadId = null;

    if (emailId) {
      email = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId);
      if (email) leadId = email.lead_id;
    }

    if (!emailId && !leadId) return null;

    if (email) {
      db.prepare("UPDATE emails SET status = 'replied', replied_at = CURRENT_TIMESTAMP WHERE id = ?").run(email.id);
    }
    if (leadId) {
      db.prepare("UPDATE leads SET status = 'replied' WHERE id = ?").run(leadId);
    }

    const uuid = require('uuid').v4;
    const sampleReplies = [
      'Merhaba, sunduğunuz çay ve kahve teklifi ilgimizi çekti. Fiyat listesini ve numune talep formunu gönderebilir misiniz?',
      'İyi günler, önümüzdeki hafta salı günü 14:00 için kısa bir tanıtım toplantısı ayarlayabiliriz. Saygılarımla.',
      'Merhaba, ürün kataloğunuzu inceledik. Toptan alımda ödeme koşullarınız nedir?'
    ];
    const randomReply = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

    db.prepare(`
      INSERT INTO conversations (id, lead_id, email_id, message, direction, created_at)
      VALUES (?, ?, ?, ?, 'inbound', CURRENT_TIMESTAMP)
    `).run(uuid(), leadId || null, email ? email.id : null, randomReply);

    return { success: true, message: 'Müşteri yanıtı simüle edildi' };
  }
}

module.exports = new EmailService();
