const cron = require('node-cron');
const { getDb } = require('../models/database');
const uuid = require('uuid').v4;
const emailService = require('./emailService');
const aiService = require('./aiService');

class FollowUpService {
  constructor() {
    this.intervalDays = 5;
  }

  start() {
    console.log('Follow-up servisi başlatıldı. Her saat başı kontrol edilecek.');
    
    // Gerçekte '0 * * * *' (her saat) olmalı, ancak test/simülasyon için 
    // daha sık çalışacak şekilde (her dakika) ayarlıyoruz fakat 5 gün şartını koruyoruz.
    cron.schedule('* * * * *', async () => {
      await this.checkAndSendFollowUps();
    });
  }

  async checkAndSendFollowUps() {
    try {
      const db = getDb();
      // Gönderilmiş ama yanıtlanmamış ve follow-up zamanı gelmiş emailleri bul
      // SQLite'da tarih hesaplaması
      const query = `
        SELECT e.*, l.id as lead_id, l.name, l.company, l.position, l.industry, c.follow_up_days, c.max_follow_ups
        FROM emails e
        JOIN leads l ON e.lead_id = l.id
        JOIN campaigns c ON e.campaign_id = c.id
        WHERE e.status IN ('sent', 'opened') 
        AND l.status = 'contacted'
        AND (julianday('now') - julianday(e.sent_at)) >= c.follow_up_days
        AND NOT EXISTS (
          SELECT 1 FROM emails sub_e 
          WHERE sub_e.lead_id = e.lead_id 
          AND sub_e.created_at > e.created_at
        )
      `;

      const emailsToFollowUp = db.prepare(query).all();

      if (emailsToFollowUp.length > 0) {
        console.log(`${emailsToFollowUp.length} adet follow-up email bulundu.`);
        
        for (const prevEmail of emailsToFollowUp) {
          const nextType = this.getNextType(prevEmail.type, prevEmail.max_follow_ups);
          if (!nextType) continue; // Max follow-up ulaşıldı
          
          console.log(\`[\${nextType}] \${prevEmail.company} için follow-up hazırlanıyor...\`);
          
          const lead = {
            id: prevEmail.lead_id,
            name: prevEmail.name,
            company: prevEmail.company,
            position: prevEmail.position,
            industry: prevEmail.industry
          };
          
          const emailContent = await aiService.generateEmail(lead, nextType);
          
          await emailService.sendEmail({
            id: uuid(),
            lead_id: lead.id,
            campaign_id: prevEmail.campaign_id,
            subject: emailContent.subject,
            body: emailContent.body,
            type: nextType
          });
        }
      }
    } catch (error) {
      console.error('Follow-up kontrolünde hata:', error);
    }
  }

  getNextType(currentType, maxFollowUps) {
    if (currentType === 'initial' && maxFollowUps >= 1) return 'follow_up_1';
    
    if (currentType.startsWith('follow_up_')) {
      const currentIndex = parseInt(currentType.replace('follow_up_', ''));
      if (currentIndex < maxFollowUps) {
        return `follow_up_${currentIndex + 1}`;
      }
    }
    return null;
  }
}

module.exports = new FollowUpService();
