const express = require('express');
const router = express.Router();
const appointmentService = require('../services/appointmentService');

// GET /api/appointments - List all appointments
router.get('/', (req, res) => {
  try {
    const appointments = appointmentService.getAppointments();
    res.json(appointments);
  } catch (error) {
    console.error('Randevular alinirken hata:', error);
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});

// POST /api/appointments - Create manual appointment
router.post('/', (req, res) => {
  try {
    const { lead_id, title, start_time, end_time, status, notes } = req.body;
    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'Baslangic ve bitis zamanlari zorunludur' });
    }
    const appt = appointmentService.createAppointment(lead_id, title || 'Toplanti', start_time, end_time, status || 'confirmed', notes || '');
    res.status(201).json(appt);
  } catch (error) {
    console.error('Randevu olusturulurken hata:', error);
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});

// PUT /api/appointments/:id/status - Update status
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const result = appointmentService.updateAppointmentStatus(req.params.id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});

// DELETE /api/appointments/:id - Delete appointment
router.delete('/:id', (req, res) => {
  try {
    const result = appointmentService.deleteAppointment(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});

// BUSY SLOTS ROUTES
// GET /api/appointments/busy-slots - List all busy slots
router.get('/busy-slots', (req, res) => {
  try {
    const slots = appointmentService.getBusySlots();
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});

// POST /api/appointments/busy-slots - Add a busy slot
router.post('/busy-slots', (req, res) => {
  try {
    const { title, start_time, end_time } = req.body;
    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'Baslangic ve bitis zamani gereklidir' });
    }
    const slot = appointmentService.addBusySlot(title || 'Dolu / Mesai Dısı', start_time, end_time);
    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});

// DELETE /api/appointments/busy-slots/:id - Remove a busy slot
router.delete('/busy-slots/:id', (req, res) => {
  try {
    const result = appointmentService.deleteBusySlot(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatasi' });
  }
});

module.exports = router;
