const { getDb } = require('../models/database');
const { v4: uuid } = require('uuid');
const aiService = require('./aiService');
const emailService = require('./emailService');

class AppointmentService {
  getAppointments() {
    const db = getDb();
    return db.prepare('SELECT * FROM appointments ORDER BY start_time ASC').all();
  }

  getBusySlots() {
    const db = getDb();
    return db.prepare('SELECT * FROM busy_slots ORDER BY start_time ASC').all();
  }

  createAppointment(leadId, title, startTime, endTime, status = 'confirmed', notes = '') {
    const db = getDb();
    const id = uuid();
    db.prepare(`
      INSERT INTO appointments (id, lead_id, title, start_time, end_time, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, leadId, title, startTime, endTime, status, notes);

    if (leadId) {
      db.prepare("UPDATE leads SET status = 'interested' WHERE id = ?").run(leadId);
    }

    return { id, lead_id: leadId, title, start_time: startTime, end_time: endTime, status, notes };
  }

  updateAppointmentStatus(id, status) {
    const db = getDb();
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    return { success: true };
  }

  deleteAppointment(id) {
    const db = getDb();
    db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    return { success: true };
  }

  addBusySlot(title, startTime, endTime) {
    const db = getDb();
    const id = uuid();
    db.prepare(`
      INSERT INTO busy_slots (id, title, start_time, end_time, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, title, startTime, endTime);
    return { id, title, start_time: startTime, end_time: endTime };
  }

  deleteBusySlot(id) {
    const db = getDb();
    db.prepare('DELETE FROM busy_slots WHERE id = ?').run(id);
    return { success: true };
  }

  // Check if a time interval conflicts with busy slots or existing appointments
  checkConflict(startTimeStr, endTimeStr) {
    const db = getDb();
    const start = new Date(startTimeStr).getTime();
    const end = new Date(endTimeStr).getTime();

    // 1. Check working hours: 09:00 to 18:00
    const startDate = new Date(startTimeStr);
    const hour = startDate.getHours();
    if (hour < 9 || hour >= 18) {
      return { isConflict: true, reason: 'Mesai saatleri dışı (09:00 - 18:00)' };
    }

    // 2. Check busy slots
    const busySlots = db.prepare('SELECT * FROM busy_slots').all() || [];
    for (const slot of busySlots) {
      const sStart = new Date(slot.start_time).getTime();
      const sEnd = new Date(slot.end_time).getTime();
      if (start < sEnd && end > sStart) {
        return { isConflict: true, reason: `Meşgul Zaman: ${slot.title || 'Dolu'}` };
      }
    }

    // 3. Check existing confirmed/pending appointments
    const appointments = db.prepare('SELECT * FROM appointments').all() || [];
    for (const appt of appointments) {
      if (appt.status === 'cancelled') continue;
      const aStart = new Date(appt.start_time).getTime();
      const aEnd = new Date(appt.end_time).getTime();
      if (start < aEnd && end > aStart) {
        return { isConflict: true, reason: `Çakışan Randevu: ${appt.title}` };
      }
    }

    return { isConflict: false };
  }

  // Find 3 available alternative slots during business hours (09:00 - 18:00)
  findAvailableSlots(startDateStr, count = 3) {
    const available = [];
    const baseDate = new Date(startDateStr);
    
    // Search next 3 days
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const curDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      
      // Skip weekends
      if (curDate.getDay() === 0 || curDate.getDay() === 6) continue;

      // Check hours: 10:00, 11:30, 14:00, 15:30, 16:30
      const checkHours = [10, 11, 14, 15, 16];
      for (const h of checkHours) {
        const slotStart = new Date(curDate);
        slotStart.setHours(h, 0, 0, 0);
        
        // Don't suggest past times
        if (slotStart.getTime() <= Date.now()) continue;

        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
        const startIso = slotStart.toISOString().replace('T', ' ').substring(0, 16);
        const endIso = slotEnd.toISOString().replace('T', ' ').substring(0, 16);

        const conflict = this.checkConflict(startIso, endIso);
        if (!conflict.isConflict) {
          const dateFormatted = slotStart.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
          const timeFormatted = slotStart.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          available.push(`${dateFormatted} Saat ${timeFormatted}`);
          if (available.length >= count) return available;
        }
      }
    }

    return available.length > 0 ? available : ['Önümüzdeki İş Günü Saat 14:00', 'Önümüzdeki İş Günü Saat 16:00'];
  }

  // Process incoming email body for appointment requests or smart auto-replies
  async processIncomingEmail(lead, emailBody) {
    try {
      const intent = await aiService.analyzeAppointmentIntent(emailBody);
      
      if (!intent.isAppointment) {
        // Not an appointment request -> Generate a warm, human smart reply and send automatically!
        console.log(`🤖 [AUTO-REPLY AI] Genel e-posta yanıtı üretiliyor: ${lead.name} (${lead.email})`);
        
        const smartReply = await aiService.generateSmartHumanReply(lead, emailBody);
        if (lead.email) {
          await emailService.sendEmail({
            lead_id: lead.id,
            lead_email: lead.email,
            subject: smartReply.subject,
            body: smartReply.body
          });
          console.log(`✅ [AUTO-REPLY AI] Yanıt e-postası başarıyla gönderildi: ${lead.email}`);
        }
        return;
      }

      console.log(`📅 [APPOINTMENT AI] Randevu talebi algılandı: ${lead.name} (${intent.proposedStartTime})`);

      const conflictCheck = this.checkConflict(intent.proposedStartTime, intent.proposedEndTime);

      if (!conflictCheck.isConflict) {
        // No conflict! Auto-confirm appointment
        const appt = this.createAppointment(
          lead.id,
          `Toplantı: ${lead.company || lead.name}`,
          intent.proposedStartTime,
          intent.proposedEndTime,
          'confirmed',
          `Gelen e-posta üzerinden otomatik oluşturuldu: "${emailBody.substring(0, 100)}..."`
        );

        console.log(`✅ [APPOINTMENT AI] Randevu onaylandı: ${lead.name} - ${intent.proposedStartTime}`);

        // Send confirmation email if lead has email
        if (lead.email) {
          const confEmail = await aiService.generateConfirmationEmail(lead.name, lead.company, intent.proposedStartTime);
          await emailService.sendEmail({
            lead_id: lead.id,
            lead_email: lead.email,
            subject: confEmail.subject,
            body: confEmail.body
          });
        }
      } else {
        // Conflict detected! Create pending appointment with conflict flag & send negotiation email
        const appt = this.createAppointment(
          lead.id,
          `Toplantı (Çakışma): ${lead.company || lead.name}`,
          intent.proposedStartTime,
          intent.proposedEndTime,
          'conflict',
          `Sebep: ${conflictCheck.reason}. Alternatif saatler iletildi.`
        );

        console.log(`⚠️ [APPOINTMENT AI] Çakışma tespit edildi (${conflictCheck.reason}). Alternatif saat önerisi gönderiliyor...`);

        const availableSlots = this.findAvailableSlots(intent.proposedStartTime, 3);
        if (lead.email) {
          const conflictEmail = await aiService.generateConflictEmail(
            lead.name,
            lead.company,
            intent.proposedStartTime,
            availableSlots
          );
          await emailService.sendEmail({
            lead_id: lead.id,
            lead_email: lead.email,
            subject: conflictEmail.subject,
            body: conflictEmail.body
          });
        }
      }
    } catch (err) {
      console.error('❌ [AUTO-REPLY AI] İşlem hatası:', err.message);
    }
  }
}

module.exports = new AppointmentService();
