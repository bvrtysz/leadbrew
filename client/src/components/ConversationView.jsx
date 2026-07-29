import React, { useState, useEffect } from 'react';
import { Search, Send, Clock, CheckCircle2, Building, MoreVertical, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import './ConversationView.css';

const ConversationView = () => {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeId) {
      fetchThread(activeId);
    }
  }, [activeId]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      // Try to fetch replied leads
      const data = await api.getLeads({ status: 'iletisimde' }); 
      setConversations(data || []);
      if (data && data.length > 0) {
        setActiveId(data[0].id);
      }
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (id) => {
    try {
      setThreadLoading(true);
      // Simulated thread fetching
      const res = await fetch(`/api/emails/thread/${id}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setMessages(data || []);
      } else {
        // Fallback mock thread
        setMessages([
          { id: 1, text: 'Gönderdiğiniz kahve numuneleri için teşekkür ederiz. Haftaya detayları görüşebilir miyiz?', isSent: false, time: 'Bugün, 10:42' },
          { id: 2, text: 'Harika! Size uygun bir saat var mı?', isSent: true, time: 'Bugün, 11:00' }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleSend = async () => {
    if (!replyText.trim() || !activeId) return;
    setSending(true);
    try {
      await api.sendEmail({ lead_id: activeId, subject: 'Re: İletişim', body: replyText });
      setMessages([...messages, { id: Date.now(), text: replyText, isSent: true, time: 'Şimdi' }]);
      setReplyText('');
    } catch (err) {
      alert('Mesaj gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      await fetch(`/api/leads/${activeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      alert('Durum güncellendi!');
    } catch (err) {
      console.error(err);
    }
  };

  const activeConv = conversations.find(c => c.id === activeId);

  if (loading && conversations.length === 0) {
    return (
      <div className="flex-center h-full flex-col gap-4 py-20 animate-fade-in">
        <Loader2 className="spin text-primary" size={40} />
        <p className="text-secondary">Mesajlar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="conversations-container animate-fade-in h-full">
      <div className="glass-card chat-layout flex h-[80vh]">
        <div className="chat-sidebar border-r flex flex-col w-1/3" style={{borderColor: 'var(--glass-border)'}}>
          <div className="p-4 border-b" style={{borderColor: 'var(--glass-border)'}}>
            <h2 className="text-h3 mb-4">Gelen Kutusu</h2>
            <div className="search-box relative">
              <Search size={16} className="text-muted absolute left-3 top-3" />
              <input type="text" placeholder="Mesaj veya kişi ara..." className="search-input w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-primary" />
            </div>
          </div>
          
          <div className="conversation-list overflow-y-auto flex-1">
            {error ? (
              <div className="p-4 text-center text-danger">Sunucu hatası.</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-muted">Mesaj bulunamadı.</div>
            ) : conversations.map(conv => (
              <div 
                key={conv.id} 
                className={`conv-item p-4 border-b cursor-pointer transition-colors ${activeId === conv.id ? 'bg-white/5 border-l-4 border-l-primary' : 'hover:bg-white/5'} ${conv.unread ? 'font-semibold' : ''}`}
                style={{borderColor: 'var(--glass-border)'}}
                onClick={() => setActiveId(conv.id)}
              >
                <div className="flex gap-3">
                  <div className="conv-avatar w-10 h-10 rounded-full bg-glass flex-center shrink-0">
                    {conv.name ? conv.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'U'}
                  </div>
                  <div className="conv-content flex-1 min-w-0">
                    <div className="flex-between">
                      <span className="conv-name text-white truncate">{conv.name}</span>
                      <span className="conv-time text-xs text-muted">Bugün</span>
                    </div>
                    <div className="conv-company text-sm text-secondary mb-1 truncate">{conv.company}</div>
                    <div className="conv-preview text-sm text-muted truncate">Son mesaj...</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-main flex-1 flex flex-col w-2/3">
          {activeConv ? (
            <>
              <div className="chat-header p-4 border-b flex-between bg-black/10" style={{borderColor: 'var(--glass-border)'}}>
                <div className="flex items-center gap-3">
                  <div className="conv-avatar w-12 h-12 rounded-full bg-glass flex-center">
                    {activeConv.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-h3 mb-1">{activeConv.name}</h3>
                    <p className="text-sm text-secondary flex items-center gap-2">
                      <Building size={14} /> {activeConv.company}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <select className="form-input form-select" defaultValue={activeConv.status} onChange={handleStatusChange} style={{width: 150, padding: '0.5rem 1rem'}}>
                    <option value="yeni">Yeni</option>
                    <option value="iletisimde">İletişimde</option>
                    <option value="ilgileniyor">İlgileniyor</option>
                    <option value="musteri">Müşteri</option>
                  </select>
                  <button className="btn btn-ghost icon-btn p-2"><MoreVertical size={20} /></button>
                </div>
              </div>

              <div className="chat-messages p-4 flex-1 overflow-y-auto flex flex-col gap-4 bg-black/5">
                {threadLoading ? (
                  <div className="flex-center h-full"><Loader2 className="spin text-primary" size={32} /></div>
                ) : messages.length === 0 ? (
                  <div className="flex-center h-full text-muted">Mesajlaşma geçmişi yok.</div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`message-wrapper flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`message p-4 rounded-xl max-w-[70%] ${msg.isSent ? 'bg-primary/20 border border-primary/30 rounded-br-none' : 'glass-card rounded-bl-none'}`}>
                        <p className="text-white text-sm whitespace-pre-wrap">{msg.text}</p>
                        <div className="message-time text-xs text-muted mt-2 flex items-center gap-1 justify-end"><Clock size={12} /> {msg.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="chat-reply p-4 border-t bg-black/10" style={{borderColor: 'var(--glass-border)'}}>
                <div className="reply-box relative">
                  <textarea 
                    className="form-input w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary resize-none" 
                    placeholder="Yanıtınızı yazın..." 
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  ></textarea>
                  <div className="flex-between mt-3">
                    <div className="flex gap-2 text-muted text-sm items-center">
                      <CheckCircle2 size={16} /> Enter ile gönder
                    </div>
                    <button className="btn btn-primary" onClick={handleSend} disabled={sending || !replyText.trim()}>
                      {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />} 
                      {sending ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-center h-full flex-col text-muted">
              <MoreVertical size={48} className="mb-4 opacity-50" />
              <p>Bir görüşme seçin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationView;
