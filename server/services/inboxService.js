const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { getDb } = require('../models/database');
const { v4: uuid } = require('uuid');

class InboxService {
  constructor() {
    this.lastCheckTime = null;
    this.isChecking = false;
  }

  async checkInbox() {
    if (this.isChecking) {
      console.log('[INBOX] Zaten kontrol ediliyor, atlaniyor...');
      return { success: true, newMessages: 0, message: 'Kontrol zaten devam ediyor' };
    }

    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || '').trim();

    if (!user || !pass) {
      console.log('[INBOX] SMTP_USER veya SMTP_PASS tanimli degil');
      return { success: false, message: 'Gmail bilgileri tanimli degil' };
    }

    this.isChecking = true;
    let newMessages = 0;

    try {
      const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user, pass },
        logger: false
      });

      await client.connect();
      console.log('[INBOX] Gmail IMAP baglatisi basarili');

      const lock = await client.getMailboxLock('INBOX');

      try {
        // Search for recent unseen emails (last 3 days)
        const since = new Date();
        since.setDate(since.getDate() - 3);

        const messages = client.fetch(
          { since, seen: false },
          { source: true, envelope: true, uid: true }
        );

        const db = getDb();
        const allLeads = db.prepare('SELECT * FROM leads').all();
        const leadEmailMap = {};
        allLeads.forEach(l => {
          if (l.email) leadEmailMap[l.email.toLowerCase().trim()] = l;
        });

        for await (const msg of messages) {
          try {
            const parsed = await simpleParser(msg.source);
            const fromAddr = (parsed.from?.value?.[0]?.address || '').toLowerCase().trim();
            const subject = parsed.subject || '(Konu yok)';
            const textBody = parsed.text || parsed.html?.replace(/<[^>]*>/g, '') || '';
            const bodyPreview = textBody.substring(0, 1000).trim();

            // Skip emails sent FROM our own address
            if (fromAddr === user.toLowerCase()) continue;

            // Check if sender is a known lead
            const lead = leadEmailMap[fromAddr];
            if (!lead) continue;

            // Check if we already recorded this message (by matching direction+message substring)
            const existing = db.prepare('SELECT * FROM conversations WHERE lead_id = ? AND direction = ? ORDER BY created_at DESC').all(lead.id, 'inbound');
            const isDuplicate = existing.some(c => 
              bodyPreview.length > 10 && c.message && c.message.substring(0, 50) === bodyPreview.substring(0, 50)
            );
            if (isDuplicate) continue;

            // Insert new inbound message
            const convId = uuid();
            db.prepare(`
              INSERT INTO conversations (id, lead_id, email_id, message, direction, created_at)
              VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(convId, lead.id, null, bodyPreview, 'inbound');

            // Update lead status
            db.prepare("UPDATE leads SET status = 'replied' WHERE id = ?").run(lead.id);

            console.log(`📥 [INBOX] Yeni gelen yanit: ${fromAddr} (Lead: ${lead.name}) - Konu: ${subject}`);
            newMessages++;
          } catch (parseErr) {
            console.error('[INBOX] Mesaj parse hatasi:', parseErr.message);
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
      this.lastCheckTime = new Date().toISOString();
      console.log(`[INBOX] Kontrol tamamlandi. ${newMessages} yeni mesaj bulundu.`);

    } catch (err) {
      console.error('[INBOX] Gmail IMAP hatasi:', err.message);
      return { success: false, message: `IMAP hatasi: ${err.message}`, newMessages: 0 };
    } finally {
      this.isChecking = false;
    }

    return { success: true, newMessages, message: `${newMessages} yeni mesaj bulundu ve kaydedildi` };
  }

  startPeriodicCheck(intervalMinutes = 5) {
    console.log(`[INBOX] Otomatik gelen kutusu kontrolu baslatildi (her ${intervalMinutes} dakika)`);
    
    // First check after 30 seconds
    setTimeout(() => this.checkInbox(), 30000);
    
    // Then check periodically
    setInterval(() => this.checkInbox(), intervalMinutes * 60 * 1000);
  }
}

module.exports = new InboxService();
