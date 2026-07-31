import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, Building, MapPin, Briefcase, Plus, X, CheckCircle2, AlertCircle, Mail, Phone, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import './LeadFinder.css';

const statusColors = {
  new: 'badge-info',
  contacted: 'badge-primary',
  replied: 'badge-warning',
  interested: 'badge-success',
  customer: 'badge-success'
};

const statusLabels = {
  new: 'Yeni',
  contacted: 'İletişimde',
  replied: 'Yanıtladı',
  interested: 'İlgileniyor',
  customer: 'Müşteri'
};

const Toast = ({ message, type, onClose }) => (
  <div className="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in z-50" style={{background: 'var(--bg-secondary)', border: `1px solid ${type === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)'}`}}>
    {type === 'error' ? <AlertCircle size={20} style={{color: 'var(--accent-danger)'}} /> : <CheckCircle2 size={20} style={{color: 'var(--accent-success)'}} />}
    <span className="text-white text-sm">{message}</span>
    <button onClick={onClose} className="ml-4 text-white font-bold">&times;</button>
  </div>
);

const AddLeadModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '', email: '', company: '', position: '', industry: '', phone: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      await onSave(form);
      setForm({ name: '', email: '', company: '', position: '', industry: '', phone: '', notes: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{maxWidth: 520, width: '90%'}}>
        <div className="flex-between mb-6">
          <h2 className="text-h2 mb-0" style={{fontSize: '1.3rem'}}>Yeni Lead Ekle</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{padding: '0.4rem'}}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="form-group mb-0 flex-1">
              <label className="form-label">Ad Soyad *</label>
              <div className="flex items-center gap-2">
                <User size={16} className="text-muted" />
                <input type="text" className="form-input" placeholder="Ahmet Yılmaz" value={form.name} onChange={e => handleChange('name', e.target.value)} required />
              </div>
            </div>
            <div className="form-group mb-0 flex-1">
              <label className="form-label">E-posta *</label>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-muted" />
                <input type="email" className="form-input" placeholder="ahmet@firma.com" value={form.email} onChange={e => handleChange('email', e.target.value)} required />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="form-group mb-0 flex-1">
              <label className="form-label">Şirket</label>
              <div className="flex items-center gap-2">
                <Building size={16} className="text-muted" />
                <input type="text" className="form-input" placeholder="ABC Otel" value={form.company} onChange={e => handleChange('company', e.target.value)} />
              </div>
            </div>
            <div className="form-group mb-0 flex-1">
              <label className="form-label">Pozisyon</label>
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-muted" />
                <input type="text" className="form-input" placeholder="Genel Müdür" value={form.position} onChange={e => handleChange('position', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="form-group mb-0 flex-1">
              <label className="form-label">Sektör</label>
              <select className="form-input form-select" value={form.industry} onChange={e => handleChange('industry', e.target.value)}>
                <option value="">Seçiniz</option>
                <option value="Otelcilik">Otelcilik</option>
                <option value="Restoran">Restoran</option>
                <option value="Kafe">Kafe</option>
                <option value="Kurumsal Ofis">Kurumsal Ofis</option>
                <option value="Catering">Catering</option>
                <option value="Perakende">Perakende</option>
                <option value="Diger">Diğer</option>
              </select>
            </div>
            <div className="form-group mb-0 flex-1">
              <label className="form-label">Telefon</label>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-muted" />
                <input type="tel" className="form-input" placeholder="+90 5xx xxx xx xx" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Notlar</label>
            <textarea className="form-input" placeholder="Bu müşteri hakkında notlarınız..." value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={2} style={{resize: 'vertical'}} />
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving || !form.name || !form.email}>
              {saving ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              {saving ? 'Kaydediliyor...' : 'Lead Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LeadFinder = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(false);
  const [leads, setLeads] = useState([]);
  const [industry, setIndustry] = useState('');
  const [position, setPosition] = useState('');
  const [city, setCity] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getLocalLeads = () => {
    try {
      return JSON.parse(localStorage.getItem('conbella_local_leads') || '[]');
    } catch { return []; }
  };

  const saveLocalLead = (lead) => {
    try {
      const existing = getLocalLeads();
      const updated = [lead, ...existing.filter(l => l.id !== lead.id)];
      localStorage.setItem('conbella_local_leads', JSON.stringify(updated));
    } catch (e) { console.error(e); }
  };

  const fetchLeads = async () => {
    try {
      const serverLeads = await api.getLeads({});
      const localLeads = getLocalLeads();
      
      // Remove local leads that already exist on server (matched by email)
      const serverEmails = new Set((serverLeads || []).map(l => l.email?.toLowerCase()));
      const uniqueLocalLeads = localLeads.filter(ll => 
        !serverEmails.has(ll.email?.toLowerCase())
      );
      
      // Update localStorage to only keep truly local-only leads
      if (uniqueLocalLeads.length !== localLeads.length) {
        localStorage.setItem('conbella_local_leads', JSON.stringify(uniqueLocalLeads));
      }

      // Combine: local-only leads first, then server leads
      const combined = [...uniqueLocalLeads, ...(serverLeads || [])];
      setLeads(combined);
      setError(false);
    } catch (err) {
      console.error(err);
      const localLeads = getLocalLeads();
      if (localLeads.length > 0) {
        setLeads(localLeads);
      } else {
        setError(true);
      }
    }
  };

  useEffect(() => {
    setInitialLoading(true);
    fetchLeads().finally(() => setInitialLoading(false));
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const results = await api.searchLeads({ industry, position, city });
      const serverLeads = results?.leads || results || [];
      const localLeads = getLocalLeads();
      const serverEmails = new Set(serverLeads.map(l => l.email?.toLowerCase()));
      const uniqueLocalLeads = localLeads.filter(ll => 
        !serverEmails.has(ll.email?.toLowerCase())
      );
      setLeads([...uniqueLocalLeads, ...serverLeads]);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (formData) => {
    try {
      const created = await api.createLead(formData);
      if (created && created.id) {
        // Server returned the lead with correct UUID - save this to localStorage
        saveLocalLead(created);
      }
      showToast(`${formData.name} başarıyla eklendi!`);
      setShowAddModal(false);
      await fetchLeads();
    } catch (err) {
      // Even if API fails, save locally so user work is never lost!
      const fallbackLead = { ...formData, id: 'local_' + Date.now(), status: 'new', created_at: new Date().toISOString() };
      saveLocalLead(fallbackLead);
      showToast(`${formData.name} yerel olarak kaydedildi (sunucu bağlantısı yok).`, 'error');
      setShowAddModal(false);
      await fetchLeads();
    }
  };

  return (
    <div className="lead-finder-container animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <AddLeadModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddLead} />

      <header className="flex-between mb-8">
        <div>
          <h1 className="text-h1">Lead Bul</h1>
          <p className="text-secondary">Hedef kitlenize uygun çay ve kahve alıcılarını saniyeler içinde bulun.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Yeni Lead Ekle
        </button>
      </header>

      {error && (
        <div className="glass-card mb-8 p-4 text-center" style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)'}}>
          <p className="text-danger">Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.</p>
        </div>
      )}

      <div className="glass-card search-panel mb-8">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-grid flex items-center gap-4 flex-wrap">
            <div className="form-group mb-0 flex-1">
              <label className="form-label">Sektör</label>
              <select className="form-input form-select" value={industry} onChange={e => setIndustry(e.target.value)}>
                <option value="">Tümü</option>
                <option value="otel">Otelcilik</option>
                <option value="restoran">Restoran</option>
                <option value="kafe">Kafe</option>
                <option value="kurumsal">Kurumsal Ofis</option>
                <option value="catering">Catering</option>
              </select>
            </div>
            <div className="form-group mb-0 flex-1">
              <label className="form-label">Pozisyon</label>
              <select className="form-input form-select" value={position} onChange={e => setPosition(e.target.value)}>
                <option value="">Tümü</option>
                <option value="satin_alma">Satın Alma Müdürü</option>
                <option value="genel_mudur">Genel Müdür</option>
                <option value="isletme">İşletme Müdürü</option>
                <option value="operasyon">Operasyon Müdürü</option>
                <option value="fb">F&B Müdürü</option>
              </select>
            </div>
            <div className="form-group mb-0 flex-1">
              <label className="form-label">Şehir</label>
              <input type="text" className="form-input" placeholder="Örn: İstanbul" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="search-btn-container" style={{marginTop: '1.5rem'}}>
              <button type="submit" className="btn btn-primary search-btn" disabled={loading}>
                {loading ? <Loader2 className="spin" size={20} /> : <Search size={20} />}
                {loading ? 'Aranıyor...' : 'Lead Bul'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="results-header flex-between mb-4">
        <h3 className="text-h3 mb-0">{leads.length} Sonuç Bulundu</h3>
      </div>

      {initialLoading ? (
        <div className="flex-center py-8">
          <Loader2 className="spin text-primary" size={32} />
        </div>
      ) : leads.length === 0 ? (
        <div className="glass-card text-center py-12 text-muted">
          Henüz lead eklenmemiş. Yukarıdaki "Yeni Lead Ekle" butonuyla başlayın.
        </div>
      ) : (
        <div className="grid-3">
          {leads.map(lead => (
            <div key={lead.id} className="glass-card lead-card flex flex-col justify-between">
              <div>
                <div className="lead-card-header flex-between mb-4">
                  <div className="lead-avatar" style={{width:40, height:40, background:'var(--glass)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    {lead.name ? lead.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'L'}
                  </div>
                  <span className={`badge ${statusColors[lead.status] || 'badge-info'}`}>{statusLabels[lead.status] || 'Yeni'}</span>
                </div>
                <div className="lead-info">
                  <h4 className="lead-name font-semibold text-lg">{lead.name}</h4>
                  <p className="lead-position flex items-center gap-2 text-sm text-secondary mt-1"><Briefcase size={14} /> {lead.position || 'Pozisyon belirtilmemiş'}</p>
                  
                  <div className="lead-details mt-4 text-sm gap-2 flex flex-col">
                    <div className="detail-item flex items-center gap-2">
                      <Building size={14} className="text-muted" />
                      <span>{lead.company || 'Şirket belirtilmemiş'} {lead.industry && `(${lead.industry})`}</span>
                    </div>
                  </div>
                  <div className="lead-email mt-3 text-sm">
                    <a href={`mailto:${lead.email}`} className="text-cyan">{lead.email}</a>
                  </div>
                </div>
              </div>
              
              <div className="lead-actions mt-4 flex gap-2">
                <button 
                  className="btn btn-primary flex-1"
                  onClick={() => navigate(`/compose/${lead.id}`)}
                >
                  E-posta Yaz
                </button>
                <button className="btn btn-secondary flex-1" onClick={() => alert('Kampanyaya eklendi!')}>Ekle</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadFinder;
