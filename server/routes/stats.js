const express = require('express');
const router = express.Router();
const { getDb } = require('../models/database');

// GET /api/stats/dashboard - Dashboard istatistikleri
router.get('/dashboard', (req, res) => {
  try {
    const db = getDb();
    // Toplam lead sayısı
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    
    // Lead durum dağılımı (pie chart için)
    const leadStatuses = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM leads 
      GROUP BY status
    `).all();

    const statusLabelMap = {
      'new': 'Yeni',
      'contacted': 'İletişimde',
      'replied': 'Cevapladı',
      'interested': 'İlgileniyor',
      'not_interested': 'İlgilenmiyor',
      'converted': 'Dönüşüm'
    };

    const statusDistribution = leadStatuses.map(s => ({
      name: statusLabelMap[s.status] || s.status,
      value: s.count
    }));
    
    // E-posta istatistikleri
    const emailStats = db.prepare(`
      SELECT 
        COUNT(*) as total_sent,
        COALESCE(SUM(CASE WHEN status IN ('opened', 'replied') THEN 1 ELSE 0 END), 0) as total_opened,
        COALESCE(SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END), 0) as total_replied
      FROM emails 
      WHERE status != 'draft'
    `).get();

    const sentEmails = emailStats.total_sent || 0;
    const openRate = sentEmails > 0 ? parseFloat((emailStats.total_opened / sentEmails * 100).toFixed(1)) : 0;
    const replyRate = sentEmails > 0 ? parseFloat((emailStats.total_replied / sentEmails * 100).toFixed(1)) : 0;
    
    // Son 7 günlük aktivite verisi (line chart için)
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const today = new Date();
    const activityData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const sent = db.prepare(`
        SELECT COUNT(*) as count FROM emails 
        WHERE date(sent_at) = ? AND status != 'draft'
      `).get(dateStr);
      
      const opened = db.prepare(`
        SELECT COUNT(*) as count FROM emails 
        WHERE date(opened_at) = ? AND status IN ('opened', 'replied')
      `).get(dateStr);
      
      activityData.push({
        name: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
        gonderilen: sent?.count || 0,
        acilan: opened?.count || 0
      });
    }
    
    // Son aktiviteler (timeline için)
    const recentEmails = db.prepare(`
      SELECT e.id, e.subject, e.status, e.sent_at, e.created_at,
             l.name as lead_name, l.company as lead_company
      FROM emails e
      LEFT JOIN leads l ON e.lead_id = l.id
      WHERE e.status != 'draft'
      ORDER BY e.sent_at DESC
      LIMIT 5
    `).all();

    const recentLeads = db.prepare(`
      SELECT id, name, company, status, created_at
      FROM leads
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    const recentActivities = [];
    
    recentEmails.forEach(e => {
      recentActivities.push({
        description: `${e.lead_name || 'Bilinmeyen'} (${e.lead_company || ''}) kişisine e-posta ${e.status === 'replied' ? 'cevaplandı' : e.status === 'opened' ? 'açıldı' : 'gönderildi'}`,
        time: e.sent_at || e.created_at,
        type: 'email'
      });
    });

    recentLeads.forEach(l => {
      recentActivities.push({
        description: `${l.name} - ${l.company} lead olarak eklendi`,
        time: l.created_at,
        type: 'lead'
      });
    });

    // Zaman sırasına göre sırala
    recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    // Aktif kampanyalar
    const activeCampaigns = db.prepare(`
      SELECT c.id, c.name, c.status,
        (SELECT COUNT(*) FROM emails WHERE campaign_id = c.id) as total,
        (SELECT COUNT(*) FROM emails WHERE campaign_id = c.id AND status != 'draft') as sent
      FROM campaigns c
      WHERE c.status = 'active'
      ORDER BY c.created_at DESC
      LIMIT 5
    `).all().map(c => ({
      name: c.name,
      total: c.total || 0,
      sent: c.sent || 0,
      progress: c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0
    }));

    res.json({
      totalLeads,
      sentEmails,
      openRate,
      replyRate,
      activityData,
      statusDistribution,
      recentActivities: recentActivities.slice(0, 10),
      activeCampaigns
    });
  } catch (error) {
    console.error('İstatistikler alınırken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
