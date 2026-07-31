import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Send, Save, User, Building, Briefcase, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import './EmailComposer.css';

const Toast = ({ message, type, onClose }) => (
  <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in z-50`} style={{background: 'var(--bg-secondary)', border: `1px solid ${type === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)'}`}}>
    {type === 'error' ? <AlertCircle className="text-danger" size={20} /> : <CheckCircle2 className="text-success" size={20} />}
    <span className="text-white text-sm">{message}</span>
    <button onClick={onClose} className="ml-4 text-white font-bold">&times;</button>
  </div>
);

const EmailComposer = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [followUpCount, setFollowUpCount] = useState("2");
  const [followUpDays, setFollowUpDays] = useState(5);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (leadId) {
      setLoading(true);
      api.getLead(leadId).then(data => {
        if (data && data.email) {
          setLead(data);
          setRecipientEmail(data.email || '');
        } else {
          throw new Error('Lead bulunamadi');
        }
      }).catch(err => {
        console.error(err);
        // Fallback: try localStorage
        try {
          const localLeads = JSON.parse(localStorage.getItem('conbella_local_leads') || '[]');
          const localLead = localLeads.find(l => l.id === leadId);
          if (localLead) {
            setLead(localLead);
            setRecipientEmail(localLead.email || '');
          } else {
            showToast('Alıcı bilgileri yüklenemedi. Lütfen Lead Bul sayfasından tekrar ekleyin.', 'error');
          }
        } catch(e) {
          showToast('Alıcı bilgileri yüklenemedi.', 'error');
        }
      }).finally(() => setLoading(false));
    }
  }, [leadId]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleGenerateAI = async () => {
    if (!lead) return;
    setGenerating(true);
    try {
      const res = await api.composeEmail(lead.id);
      setSubject(res.subject || `${lead.company || 'Şirketiniz'} İçin Premium Çay ve Kahve Tedariği`);
      setBody(res.body || `Merhaba ${lead.name || 'Yetkili'},\n\nUmarım harika bir gün geçiriyorsunuzdur.\n\n${lead.company || 'Şirketiniz'} misafirlerine sunduğunuz hizmet kalitesini yakından takip ediyoruz...`);
      showToast('İçerik AI ile oluşturuldu!');
    } catch (err) {
      console.error(err);
      showToast('İçerik oluşturulurken hata oluştu.', 'error');
      setSubject(`${lead.company || 'Şirketiniz'} İçin Özel Teklif`);
      setBody(`Merhaba ${lead.name || 'Yetkili'},\n\nÖzel kavrulmuş premium kahve çekirdeklerimiz ile size destek olmak isteriz...`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!lead || !subject || !body) {
      showToast('Lütfen konu ve mesaj alanlarını doldurun.', 'error');
      return;
    }
    if (!recipientEmail) {
      showToast('Lütfen geçerli bir alıcı e-posta adresi girin.', 'error');
      return;
    }
    if (window.confirm(`${recipientEmail} adresine e-posta gönderilsin mi?`)) {
      setSending(true);
      try {
        const res = await api.sendEmail({ 
          lead_id: lead.id, 
          lead_email: recipientEmail, 
          subject, 
          body, 
          followUpCount, 
          followUpDays 
        });
        showToast(res.message || 'E-posta başarıyla gönderildi!');
        setTimeout(() => navigate('/leads'), 2500);
      } catch (err) {
        showToast(`Gönderim Başarısız: ${err.message}`, 'error');
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <div className="email-composer-container animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="mb-8">
        <h1 className="text-h1">E-posta Oluştur</h1>
        <p className="text-secondary">Yapay zeka destekli kişiselleştirilmiş e-postalar yazın.</p>
      </header>

      <div className="composer-grid grid-2">
        <div className="lead-panel flex flex-col gap-4">
          <div className="glass-card">
            <h3 className="text-h3 mb-4">Alıcı Bilgileri</h3>
            {loading ? (
              <div className="flex-center py-8"><Loader2 className="spin text-primary" size={24} /></div>
            ) : lead ? (
              <div className="selected-lead-info">
                <div className="lead-avatar mb-4 flex-center" style={{width: 64, height: 64, fontSize: '1.5rem', background:'var(--glass)', borderRadius:'50%'}}>
                  {lead.name ? lead.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'U'}
                </div>
                <h4 className="text-h3 mb-1">{lead.name}</h4>
                <p className="text-secondary mb-4 flex items-center gap-2"><Briefcase size={16} /> {lead.position}</p>
                
                <div className="info-list flex flex-col gap-3">
                  <div className="info-item flex items-center gap-2">
                    <Building size={16} className="text-muted" />
                    <span>{lead.company}</span>
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label text-xs">Alıcı E-posta Adresi (Düzenlenebilir)</label>
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-muted" />
                      <input 
                        type="email" 
                        className="form-input text-sm" 
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="ornek@domain.com"
                      />
                    </div>
                  </div>
                </div>
                
                <button className="btn btn-secondary w-full mt-4" onClick={() => setLead(null)}>Alıcıyı Değiştir</button>
              </div>
            ) : (
              <div className="empty-lead flex-center flex-col gap-4 text-center p-4">
                <User size={48} className="text-muted" />
                <p className="text-secondary">Henüz bir alıcı seçilmedi.</p>
                <button className="btn btn-primary" onClick={() => navigate('/leads')}>Lead Bul</button>
              </div>
            )}
          </div>
          
          <div className="glass-card">
            <h3 className="text-h3 mb-4">Takip (Follow-up) Planı</h3>
            <div className="form-group">
              <label className="form-label">Otomatik Takip Sayısı</label>
              <select className="form-input form-select" value={followUpCount} onChange={e => setFollowUpCount(e.target.value)}>
                <option value="0">Yok</option>
                <option value="1">1 kez</option>
                <option value="2">2 kez</option>
                <option value="3">3 kez</option>
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Aralık (Gün)</label>
              <input type="number" className="form-input" value={followUpDays} onChange={e => setFollowUpDays(Number(e.target.value))} min={1} />
            </div>
          </div>
        </div>

        <div className="editor-panel glass-card flex flex-col">
          <div className="editor-header flex-between mb-4">
            <h3 className="text-h3 mb-0">İçerik Editörü</h3>
            <button 
              className="btn btn-primary"
              onClick={handleGenerateAI}
              disabled={generating || !lead}
            >
              {generating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {generating ? 'Oluşturuluyor...' : 'AI ile Oluştur'}
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Konu</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="E-posta konusu..." 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group flex-1 flex flex-col">
            <label className="form-label">Mesaj</label>
            <textarea 
              className="form-input flex-1" 
              placeholder="Mesajınızı buraya yazın..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{minHeight: '300px', resize: 'vertical'}}
            ></textarea>
          </div>

          <div className="editor-footer flex-between mt-4">
            <button className="btn btn-ghost" onClick={() => showToast('Taslak kaydedildi!')}><Save size={18} /> Taslak Kaydet</button>
            <button className="btn btn-primary" onClick={handleSend} disabled={sending || !lead}>
              {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />} 
              {sending ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;
