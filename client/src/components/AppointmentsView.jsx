import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Plus, Trash2, CheckCircle2, AlertTriangle, User, Building, Loader2, Sparkles, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { api } from '../utils/api';
import './AppointmentsView.css';

const AppointmentsView = () => {
  const [appointments, setAppointments] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'busy'
  const [showAddBusyModal, setShowAddBusyModal] = useState(false);
  const [showAddApptModal, setShowAddApptModal] = useState(false);

  // New Busy Slot Form State
  const [busyTitle, setBusyTitle] = useState('Dolu / Mesai Dışı');
  const [busyDate, setBusyDate] = useState('');
  const [busyStartTime, setBusyStartTime] = useState('09:00');
  const [busyEndTime, setBusyEndTime] = useState('12:00');
  const [savingBusy, setSavingBusy] = useState(false);

  // New Appt Form State
  const [apptLeadId, setApptLeadId] = useState('');
  const [apptTitle, setApptTitle] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('14:00');
  const [savingAppt, setSavingAppt] = useState(false);

  const autoRefreshRef = useRef(null);

  const fetchData = async () => {
    try {
      const [apptsData, slotsData, leadsData] = await Promise.all([
        api.getAppointments(),
        api.getBusySlots(),
        api.getLeads({})
      ]);
      setAppointments(apptsData || []);
      setBusySlots(slotsData || []);
      setLeads(leadsData || []);
    } catch (err) {
      console.error('Veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Live background polling every 10 seconds (no manual refresh needed!)
    autoRefreshRef.current = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(autoRefreshRef.current);
  }, []);

  const handleAddBusySlot = async (e) => {
    e.preventDefault();
    if (!busyDate || !busyStartTime || !busyEndTime) return;
    setSavingBusy(true);
    try {
      const start = `${busyDate} ${busyStartTime}`;
      const end = `${busyDate} ${busyEndTime}`;
      await api.createBusySlot({ title: busyTitle, start_time: start, end_time: end });
      setShowAddBusyModal(false);
      setBusyTitle('Dolu / Mesai Dışı');
      await fetchData();
    } catch (err) {
      alert(`Hata: ${err.message}`);
    } finally {
      setSavingBusy(false);
    }
  };

  const handleDeleteBusySlot = async (id) => {
    if (!window.confirm('Bu meşgul saat kilidini kaldırmak istiyor musunuz?')) return;
    try {
      await api.deleteBusySlot(id);
      await fetchData();
    } catch (err) {
      alert(`Silme hatası: ${err.message}`);
    }
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    if (!apptDate || !apptTime) return;
    setSavingAppt(true);
    try {
      const start = `${apptDate} ${apptTime}`;
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
      const end = endDate.toISOString().replace('T', ' ').substring(0, 16);

      const lead = leads.find(l => l.id === apptLeadId);
      const title = apptTitle || (lead ? `Toplantı: ${lead.company || lead.name}` : 'Toplantı');

      await api.createAppointment({
        lead_id: apptLeadId || null,
        title,
        start_time: start,
        end_time: end,
        status: 'confirmed'
      });
      setShowAddApptModal(false);
      await fetchData();
    } catch (err) {
      alert(`Hata: ${err.message}`);
    } finally {
      setSavingAppt(false);
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!window.confirm('Bu randevuyu silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteAppointment(id);
      await fetchData();
    } catch (err) {
      alert(`Hata: ${err.message}`);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateAppointmentStatus(id, newStatus);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const leadMap = {};
  leads.forEach(l => { leadMap[l.id] = l; });

  return (
    <div className="appointments-container animate-fade-in">
      <header className="flex-between mb-8">
        <div>
          <h1 className="text-h1 flex items-center gap-3">
            <Calendar className="text-cyan" size={32} /> Takvim & Randevu Yönetimi
          </h1>
          <p className="text-secondary">AI destekli otomatik randevu oluşturucu ve meşgul saat planlayıcı.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary text-xs flex items-center gap-1" onClick={fetchData} title="Verileri yenile">
            <RefreshCw size={14} /> Canlı Senkron
          </button>
          <button className="btn btn-secondary text-sm flex items-center gap-1" onClick={() => setShowAddBusyModal(true)}>
            <Clock size={16} className="text-warning" /> Meşgul Saat İşaretle
          </button>
          <button className="btn btn-primary text-sm flex items-center gap-1" onClick={() => setShowAddApptModal(true)}>
            <Plus size={16} /> Randevu Ekle
          </button>
        </div>
      </header>

      {/* Tabs Header */}
      <div className="flex gap-3 mb-6">
        <button className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
          📅 Randevular ({appointments.length})
        </button>
        <button className={`tab-btn ${activeTab === 'busy' ? 'active' : ''}`} onClick={() => setActiveTab('busy')}>
          🔒 Dolu / Mesai Dışı Saatlerim ({busySlots.length})
        </button>
      </div>

      {loading ? (
        <div className="flex-center py-20 flex-col gap-3">
          <Loader2 className="spin text-primary" size={36} />
          <p className="text-secondary text-sm">Takvim ve randevu verileri yükleniyor...</p>
        </div>
      ) : activeTab === 'appointments' ? (
        /* APPOINTMENTS TAB */
        <div className="calendar-grid-card">
          <h3 className="text-h3 mb-4">Müşteri Randevuları</h3>
          {appointments.length === 0 ? (
            <div className="text-center py-12 text-muted flex-center flex-col gap-2">
              <Calendar size={48} className="opacity-30" />
              <p>Henüz kayıtlı randevu bulunmuyor.</p>
              <p className="text-xs">Gelen e-postalarda randevu talebi olduğunda AI otomatik olarak buraya ekleyecektir.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {appointments.map(appt => {
                const lead = leadMap[appt.lead_id];
                const isConflict = appt.status === 'conflict';
                const isConfirmed = appt.status === 'confirmed';

                return (
                  <div key={appt.id} className="slot-item flex-between" style={{borderColor: isConflict ? 'rgba(239,68,68,0.4)' : isConfirmed ? 'rgba(34,197,94,0.4)' : 'var(--glass-border)'}}>
                    <div className="flex gap-4 items-center">
                      <div className={`w-12 h-12 rounded-xl flex-center shrink-0 ${isConflict ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`} style={{background: isConflict ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}}>
                        {isConflict ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-semibold text-base mb-0">{appt.title}</h4>
                          <span className={`badge ${isConflict ? 'badge-conflict' : isConfirmed ? 'badge-confirmed' : 'badge-pending'}`}>
                            {isConflict ? '⚠️ Çakışma / Alternatif Teklif Edildi' : isConfirmed ? '✅ Onaylandı' : 'Bekliyor'}
                          </span>
                        </div>

                        <p className="text-xs text-cyan mt-1 flex items-center gap-2">
                          <Clock size={14} /> Tarih & Saat: <strong>{appt.start_time}</strong> - {appt.end_time}
                        </p>

                        {lead && (
                          <p className="text-xs text-secondary mt-1 flex items-center gap-2">
                            <User size={13} /> {lead.name} ({lead.company}) &bull; <span className="text-muted">{lead.email}</span>
                          </p>
                        )}

                        {appt.notes && (
                          <p className="text-xs text-muted mt-2 italic bg-black/20 p-2 rounded border border-white/5">{appt.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <select 
                        className="form-input form-select text-xs" 
                        value={appt.status} 
                        onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                        style={{width: 140, padding: '0.4rem'}}
                      >
                        <option value="confirmed">Onaylandı</option>
                        <option value="conflict">Çakışma Var</option>
                        <option value="cancelled">İptal Edildi</option>
                      </select>

                      <button className="btn btn-ghost text-danger hover:bg-danger/20 p-2 rounded" onClick={() => handleDeleteAppointment(appt.id)} title="Sil">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* BUSY SLOTS TAB */
        <div className="calendar-grid-card">
          <div className="flex-between mb-4">
            <div>
              <h3 className="text-h3 mb-0">Dolu / Mesai Dışı Saatleriniz</h3>
              <p className="text-xs text-secondary mt-1">İşaretlediğiniz saatlerde müşteri randevu talep ederse AI otomatik olarak dolu olduğunuza karar verir ve alternatif saat maili gönderir.</p>
            </div>
            <button className="btn btn-primary text-xs" onClick={() => setShowAddBusyModal(true)}>
              <Plus size={14} /> Meşgul Saat Ekle
            </button>
          </div>

          {busySlots.length === 0 ? (
            <div className="text-center py-12 text-muted flex-center flex-col gap-2">
              <ShieldAlert size={48} className="opacity-30" />
              <p>Henüz meşgul bir saat dilimi eklenmemiş.</p>
              <p className="text-xs">Varsayılan mesai saatleri dışı (18:00 - 09:00) zaten sistem tarafından otomatik korunmaktadır.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {busySlots.map(slot => (
                <div key={slot.id} className="slot-item flex-between border-amber-500/30" style={{borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)'}}>
                  <div>
                    <h4 className="text-white font-medium text-sm flex items-center gap-2">
                      <Clock size={16} className="text-warning" /> {slot.title}
                    </h4>
                    <p className="text-xs text-secondary mt-1">
                      Başlangıç: <strong className="text-white">{slot.start_time}</strong>
                    </p>
                    <p className="text-xs text-secondary">
                      Bitiş: <strong className="text-white">{slot.end_time}</strong>
                    </p>
                  </div>
                  <button className="btn btn-ghost text-danger hover:bg-danger/20 p-2 rounded" onClick={() => handleDeleteBusySlot(slot.id)} title="Sil">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Add Busy Slot */}
      {showAddBusyModal && (
        <div className="modal-overlay" onClick={() => setShowAddBusyModal(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{maxWidth: 450, width: '90%'}}>
            <div className="flex-between mb-4">
              <h3 className="text-h3 mb-0">Meşgul / Dolu Saat Ekle</h3>
              <button className="btn btn-ghost p-1" onClick={() => setShowAddBusyModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddBusySlot} className="flex flex-col gap-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Açıklama / Başlık</label>
                <input type="text" className="form-input text-sm" value={busyTitle} onChange={e => setBusyTitle(e.target.value)} required />
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Tarih</label>
                <input type="date" className="form-input text-sm" value={busyDate} onChange={e => setBusyDate(e.target.value)} required />
              </div>

              <div className="flex gap-3">
                <div className="form-group mb-0 flex-1">
                  <label className="form-label text-xs">Başlangıç Saati</label>
                  <input type="time" className="form-input text-sm" value={busyStartTime} onChange={e => setBusyStartTime(e.target.value)} required />
                </div>
                <div className="form-group mb-0 flex-1">
                  <label className="form-label text-xs">Bitiş Saati</label>
                  <input type="time" className="form-input text-sm" value={busyEndTime} onChange={e => setBusyEndTime(e.target.value)} required />
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowAddBusyModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={savingBusy}>
                  {savingBusy ? <Loader2 size={16} className="spin" /> : <Clock size={16} />}
                  {savingBusy ? 'Kaydediliyor...' : 'Meşgul Saati İşaretle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Manual Appointment */}
      {showAddApptModal && (
        <div className="modal-overlay" onClick={() => setShowAddApptModal(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{maxWidth: 480, width: '90%'}}>
            <div className="flex-between mb-4">
              <h3 className="text-h3 mb-0">Yeni Randevu Ekle</h3>
              <button className="btn btn-ghost p-1" onClick={() => setShowAddApptModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddAppointment} className="flex flex-col gap-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Müşteri Seçin (Opsiyonel)</label>
                <select className="form-input form-select text-sm" value={apptLeadId} onChange={e => setApptLeadId(e.target.value)}>
                  <option value="">-- Müşteri Seçin --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} - {l.company} ({l.email})</option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Toplantı / Randevu Başlığı</label>
                <input type="text" className="form-input text-sm" placeholder="Örn: Kahve Tadımı & Teklif Görüşmesi" value={apptTitle} onChange={e => setApptTitle(e.target.value)} />
              </div>

              <div className="flex gap-3">
                <div className="form-group mb-0 flex-1">
                  <label className="form-label text-xs">Tarih</label>
                  <input type="date" className="form-input text-sm" value={apptDate} onChange={e => setApptDate(e.target.value)} required />
                </div>
                <div className="form-group mb-0 flex-1">
                  <label className="form-label text-xs">Saat</label>
                  <input type="time" className="form-input text-sm" value={apptTime} onChange={e => setApptTime(e.target.value)} required />
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowAddApptModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={savingAppt}>
                  {savingAppt ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                  {savingAppt ? 'Kaydediliyor...' : 'Randevuyu Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsView;
