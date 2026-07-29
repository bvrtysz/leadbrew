import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, Building, MapPin, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import './LeadFinder.css';

const statusColors = {
  yeni: 'badge-info',
  iletisimde: 'badge-primary',
  ilgileniyor: 'badge-warning',
  musteri: 'badge-success'
};

const statusLabels = {
  yeni: 'Yeni',
  iletisimde: 'İletişimde',
  ilgileniyor: 'İlgileniyor',
  musteri: 'Müşteri'
};

const LeadFinder = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(false);
  const [leads, setLeads] = useState([]);
  const [industry, setIndustry] = useState('');
  const [position, setPosition] = useState('');
  const [city, setCity] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setInitialLoading(true);
        const data = await api.getLeads({});
        setLeads(data || []);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitial();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const results = await api.searchLeads({ industry, position, city });
      setLeads(results || []);
    } catch (err) {
      console.error(err);
      setError(true);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lead-finder-container animate-fade-in">
      <header className="mb-8">
        <h1 className="text-h1">Lead Bul</h1>
        <p className="text-secondary">Hedef kitlenize uygun çay ve kahve alıcılarını saniyeler içinde bulun.</p>
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
        <button className="btn btn-secondary"><Filter size={16} /> Filtrele</button>
      </div>

      {initialLoading ? (
        <div className="flex-center py-8">
          <Loader2 className="spin text-primary" size={32} />
        </div>
      ) : leads.length === 0 ? (
        <div className="glass-card text-center py-12 text-muted">
          Arama kriterlerinize uygun lead bulunamadı.
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
                  <p className="lead-position flex items-center gap-2 text-sm text-secondary mt-1"><Briefcase size={14} /> {lead.position}</p>
                  
                  <div className="lead-details mt-4 text-sm gap-2 flex flex-col">
                    <div className="detail-item flex items-center gap-2">
                      <Building size={14} className="text-muted" />
                      <span>{lead.company} {lead.industry && `(${lead.industry})`}</span>
                    </div>
                    <div className="detail-item flex items-center gap-2">
                      <MapPin size={14} className="text-muted" />
                      <span>{lead.location || 'Konum bilinmiyor'}</span>
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
