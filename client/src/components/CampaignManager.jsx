import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Play, Pause, Settings, Trash2, Users, Mail, Eye, MessageSquare, Loader2, X } from 'lucide-react';
import { api } from '../utils/api';
import './CampaignManager.css';

const statusConfig = {
  aktif: { label: 'Aktif', badge: 'badge-success', icon: Play },
  duraklatildi: { label: 'Duraklatıldı', badge: 'badge-warning', icon: Pause },
  tamamlandi: { label: 'Tamamlandı', badge: 'badge-info', icon: FolderOpen }
};

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', desc: '', status: 'aktif' });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await api.getCampaigns();
      setCampaigns(data || []);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createCampaign(formData);
      setShowModal(false);
      setFormData({ name: '', desc: '', status: 'aktif' });
      fetchCampaigns();
    } catch (err) {
      alert('Kampanya oluşturulamadı.');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'aktif' ? 'duraklatildi' : 'aktif';
    try {
      // Assuming we have an update endpoint or we just simulate for now
      // await api.updateCampaign(id, { status: newStatus });
      setCampaigns(campaigns.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      alert('Durum güncellenemedi.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) {
      try {
        // await api.deleteCampaign(id);
        setCampaigns(campaigns.filter(c => c.id !== id));
      } catch (err) {
        alert('Kampanya silinemedi.');
      }
    }
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex-center h-full flex-col gap-4 py-20 animate-fade-in">
        <Loader2 className="spin text-primary" size={40} />
        <p className="text-secondary">Kampanyalar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="campaigns-container animate-fade-in relative">
      <header className="flex-between mb-8">
        <div>
          <h1 className="text-h1">Kampanyalar</h1>
          <p className="text-secondary">Otomatik e-posta kampanyalarınızı yönetin ve takip edin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Yeni Kampanya
        </button>
      </header>

      {error && (
        <div className="glass-card mb-8 p-4 bg-danger text-center" style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)'}}>
          <p className="text-danger">Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.</p>
        </div>
      )}

      {campaigns.length === 0 && !error ? (
        <div className="glass-card text-center py-16">
          <FolderOpen size={48} className="text-muted mx-auto mb-4" />
          <h3 className="text-h3 mb-2">Henüz kampanya yok</h3>
          <p className="text-secondary mb-6">Yeni bir kampanya oluşturarak hemen e-posta göndermeye başlayın.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Kampanya Oluştur</button>
        </div>
      ) : (
        <div className="campaign-grid">
          {campaigns.map(camp => {
            const StatusIcon = statusConfig[camp.status]?.icon || FolderOpen;
            const badgeClass = statusConfig[camp.status]?.badge || 'badge-info';
            const statusLabel = statusConfig[camp.status]?.label || camp.status;
            
            return (
              <div key={camp.id} className="glass-card campaign-card flex flex-col justify-between">
                <div>
                  <div className="campaign-header mb-4">
                    <div className="flex-between mb-2">
                      <h3 className="text-h3 mb-0 campaign-title">{camp.name}</h3>
                      <span className={`badge ${badgeClass} flex items-center gap-1`}>
                        <StatusIcon size={12} /> {statusLabel}
                      </span>
                    </div>
                    <p className="text-secondary text-sm">{camp.desc}</p>
                  </div>

                  <div className="campaign-stats mb-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="camp-stat flex items-center gap-2"><Users size={16} className="text-primary"/> <span>{camp.leads || 0} Lead</span></div>
                    <div className="camp-stat flex items-center gap-2 text-cyan"><Mail size={16}/> <span>{camp.sent || 0} Gönderilen</span></div>
                    <div className="camp-stat flex items-center gap-2 text-green"><Eye size={16}/> <span>{camp.opened || 0} Açılan</span></div>
                    <div className="camp-stat flex items-center gap-2 text-amber"><MessageSquare size={16}/> <span>{camp.replied || 0} Cevap</span></div>
                  </div>

                  <div className="campaign-progress mb-6">
                    <div className="flex-between text-sm mb-1">
                      <span className="text-secondary">İlerleme</span>
                      <span className="font-semibold">% {camp.progress || 0}</span>
                    </div>
                    <div className="progress-bar-bg w-full h-2 rounded-full overflow-hidden" style={{background: 'rgba(255,255,255,0.1)'}}>
                      <div 
                        className="progress-bar-fill h-full" 
                        style={{
                          width: `${camp.progress || 0}%`, 
                          background: camp.status === 'tamamlandi' ? 'var(--accent-success)' : camp.status === 'duraklatildi' ? 'var(--accent-warning)' : 'var(--accent-gradient)',
                          transition: 'width 0.3s ease'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="campaign-actions flex-between pt-4 mt-4 border-t" style={{borderColor: 'var(--glass-border)'}}>
                  <button className="btn btn-ghost" onClick={() => alert('Detaylara gidiliyor...')}><Settings size={18} /> Yönet</button>
                  <div className="flex gap-2">
                    {camp.status === 'aktif' ? (
                      <button className="btn btn-secondary icon-btn p-2" title="Duraklat" onClick={() => toggleStatus(camp.id, camp.status)}><Pause size={18} /></button>
                    ) : camp.status === 'duraklatildi' ? (
                      <button className="btn btn-secondary icon-btn p-2" title="Devam Et" onClick={() => toggleStatus(camp.id, camp.status)}><Play size={18} /></button>
                    ) : null}
                    <button className="btn btn-danger icon-btn p-2" title="Sil" onClick={() => handleDelete(camp.id)}><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex-center z-50 animate-fade-in" style={{background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'}}>
          <div className="glass-card w-full max-w-md p-6 relative">
            <button className="absolute top-4 right-4 text-secondary hover:text-white" onClick={() => setShowModal(false)}><X size={24} /></button>
            <h2 className="text-h2 mb-4">Yeni Kampanya Oluştur</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Kampanya Adı</label>
                <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Örn: Otel Satınalma Kış Kampanyası" />
              </div>
              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <textarea required className="form-input" value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} placeholder="Kampanya hakkında kısa bilgi..."></textarea>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary">Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
