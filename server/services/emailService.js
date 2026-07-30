const { getDb } = require('../models/database');

class EmailService {
  constructor() {
    this.mode = process.env.EMAIL_MODE || 'SIMULATION';
    console.log(`E-posta modu: ${this.mode}`);
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
      // Catch Resend testing domain restriction (sending to non-owner email)
      const errorMsg = data.message || JSON.stringify(data);
      if (errorMsg.includes('testing emails to your own email address')) {
        const ownerEmail = process.env.SMTP_USER || 'bvrtysz@gmail.com';
        console.log(`⚠️ Resend Test Modu Kısıtlaması: Mail ${ownerEmail} adresine yönlendiriliyor... (Hedef: ${to})`);
        
        const testSubject = `[Test Modu -> ${to}] ${subject}`;
        const testHtml = `
          <div style="background:#fef3c7; border:1px solid #f59e0b; color:#92400e; padding:12px; border-radius:6px; margin-bottom:16px; font-family:sans-serif; font-size:13px;">
            ⚠️ <strong>Resend Test Modu Bilgilendirmesi:</strong> Resend ücretsiz hesabı varsayılan olarak mailleri hesap sahibine iletir.<br>
            <strong>Asıl Hedef Alıcı:</strong> ${to}
          </div>
          ${htmlBody}
        `;

        return await this.sendViaResendDirect(ownerEmail, testSubject, testHtml, textBody);
      }
      throw new Error(errorMsg);
    }
    return data;
  }

  async sendViaResendDirect(to, subject, htmlBody, textBody) {
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
    if (!res.ok) throw new Error(data.message || JSON.stringify(data));
    return data;
  }

  async sendViaNodemailer(to, subject, htmlBody, textBody) {
    const nodemailer = require('nodemailer');
    
    const port = parseInt(process.env.SMTP_PORT || '465');
    const secure = port === 465 || process.env.SMTP_SECURE === 'true';
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Conbella'}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      text: textBody,
      html: htmlBody,
    });
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

      // Try Resend first (HTTP, no SMTP port needed), fallback to Nodemailer
      if (process.env.RESEND_API_KEY) {
        await this.sendViaResend(targetEmail, emailData.subject, htmlBody, emailData.body);
        console.log(`[RESEND] Basariyla gonderildi: ${targetEmail}`);
      } else if (process.env.SMTP_HOST) {
        await this.sendViaNodemailer(targetEmail, emailData.subject, htmlBody, emailData.body);
        console.log(`[SMTP] Basariyla gonderildi: ${targetEmail}`);
      } else {
        throw new Error('E-posta servisi yapilandirilmamis (RESEND_API_KEY veya SMTP_HOST gerekli)');
      }
    } else {
      console.log(`[SIMULASYON] E-posta: ${emailData.subject} -> Lead ID: ${emailData.lead_id}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save to database
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

    if (emailData.lead_id) {
      db.prepare("UPDATE leads SET status = 'contacted' WHERE id = ?").run(emailData.lead_id);
    }

    return {
      success: true,
      message: this.mode === 'REAL' ? `E-posta ${targetEmail} adresine gonderildi!` : 'E-posta gonderildi (Simulasyon)',
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
    `).run(uuid(), email.lead_id, emailId, 'Merhaba, konuyla ilgileniyoruz. Detayli bilgi alabilir miyim?');

    return { success: true, message: 'Yanit simule edildi' };
  }
}

module.exports = new EmailService();
