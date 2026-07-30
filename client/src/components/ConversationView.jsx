import React, { useState, useEffect } from 'react';
import { Search, Send, Clock, CheckCircle2, Building, MoreVertical, Loader2, Sparkles, Bot, RefreshCw } from 'lucide-react';
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
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState(false);
  const [aiOptions, setAiOptions] = useState(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      const data = await api.getLeads({}); 
      setConversations(data || []);
      if (data && data.length > 0 && !activeId) {
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

  const fetchThread = async (leadId) => {
    try {
      setThreadLoading(true);
      setAiOptions(null);
      const threadData = await api.getThread(leadId);
      setMessages(threadData || []);
    } catch (err) {
      console.error(err);
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleSend = async () => {
    if (!replyText.trim() || !activeId) return;
    setSending(true);
    try {
      const activeLead = conversations.find(c => c.id === activeId);
      await api.sendEmail({ 
        lead_id: activeId, 
        lead_email: activeLead ? activeLead.email : undefined,
        subject: 'Re: Conbella İletişim', 
        body: replyText 
      });
      await fetchThread(activeId);
      setReplyText('');
      setAiOptions(null);
    } catch (err) {
      alert(`Gönderim hatası: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateAiReplies = async () => {
    if (!activeId) return;
    setGeneratingAi(true);
    try {
      const lastMsg = messages.length > 0 ? messages[messages.length - 1].text : '';
      const options = await api.getAiReplyOptions(activeId, lastMsg);
      setAiOptions(options);
    } catch (err) {
      console.error(err);
      alert('AI yanıt seçenekleri oluşturulurken hata oluştu.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSimulateReply = async () => {
    if (!activeId) return;
    setSimulating(true);
    try {
      await api.simulateReply(activeId);
      await fetchThread(activeId);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
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
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const activeConv = conversations.find(c => c.id === activeId);
  const filteredConvs = conversations.filter(c => 
    !searchQuery || 
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && conversations.length === 0) {
    return (
      <div className="flex-center h-full flex-col gap-4 py-20 animate-fade-in">
        <Loader2 className="spin text-primary" size={40} />
        <p className="text-secondary">Gelen kutusu yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="conversations-container animate-fade-in h-full">
      <div className="glass-card chat-layout flex h-[82vh]">
        
        {/* Sidebar: Conversation List */}
        <div className="chat-sidebar border-r flex flex-col w-1/3" style={{borderColor: 'var(--glass-border)'}}>
          <div className="p-4 border-b" style={{borderColor: 'var(--glass-border)'}}>
            <h2 className="text-h3 mb-4">Konuşmalar</h2>
            <div className="search-box relative">
              <Search size={16} className="text-muted absolute left-3 top-3" style={{top: 12}} />
              <input 
                type="text" 
                placeholder="Müşteri veya şirket ara..." 
                className="search-input w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-primary"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="conversation-list overflow-y-auto flex-1">
            {error ? (
              <div className="p-4 text-center text-danger">Sunucu hatası.</div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-4 text-center text-muted">Aramaya uygun müşteri bulunamadı.</div>
            ) : filteredConvs.map(conv => (
              <div 
                key={conv.id} 
                className={`conv-item p-4 border-b cursor-pointer transition-colors ${activeId === conv.id ? 'bg-white/10 border-l-4 border-l-primary' : 'hover:bg-white/5'}`}
                style={{borderColor: 'var(--glass-border)'}}
                onClick={() => setActiveId(conv.id)}
              >
                <div className="flex gap-3">
                  <div className="conv-avatar w-10 h-10 rounded-full bg-glass flex-center shrink-0" style={{background: 'var(--glass)', border: '1px solid var(--glass-border)', fontSize: '0.9rem'}}>
                    {conv.name ? conv.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'L'}
                  </div>
                  <div className="conv-content flex-1 min-w-0">
                    <div className="flex-between">
                      <span className="conv-name text-white font-medium text-sm truncate">{conv.name}</span>
                      <span className="conv-time text-xs text-muted">Aktif</span>
                    </div>
                    <div className="conv-company text-xs text-secondary mb-1 truncate">{conv.company}</div>
                    <div className="conv-email text-xs text-muted truncate">{conv.email}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main: Active Chat Thread */}
        <div className="chat-main flex-1 flex flex-col w-2/3">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="chat-header p-4 border-b flex-between bg-black/10" style={{borderColor: 'var(--glass-border)'}}>
                <div className="flex items-center gap-3">
                  <div className="conv-avatar w-11 h-11 rounded-full bg-glass flex-center" style={{background: 'var(--glass)', border: '1px solid var(--glass-border)', fontSize: '1rem'}}>
                    {activeConv.name ? activeConv.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'L'}
                  </div>
                  <div>
                    <h3 className="text-h3 mb-0" style={{fontSize: '1.1rem'}}>{activeConv.name}</h3>
                    <p className="text-xs text-secondary flex items-center gap-2 mt-1">
                      <Building size={14} /> {activeConv.company} &bull; <span className="text-cyan">{activeConv.email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <button 
                    className="btn btn-secondary text-xs flex items-center gap-1"
                    onClick={handleSimulateReply}
                    disabled={simulating}
                    title="Müşteriden test mesajı simüle et"
                  >
                    {simulating ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                    {simulating ? 'Yanıt Yanıtlanıyor...' : 'Müşteri Yanıtı Simüle Et'}
                  </button>

                  <select className="form-input form-select text-xs" value={activeConv.status || 'new'} onChange={handleStatusChange} style={{width: 130, padding: '0.4rem 0.6rem'}}>
                    <option value="new">Yeni</option>
                    <option value="contacted">İletişimde</option>
                    <option value="replied">Yanıtladı</option>
                    <option value="interested">İlgileniyor</option>
                    <option value="customer">Müşteri</option>
                  </select>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="chat-messages p-4 flex-1 overflow-y-auto flex flex-col gap-4 bg-black/5">
                {threadLoading ? (
                  <div className="flex-center h-full"><Loader2 className="spin text-primary" size={32} /></div>
                ) : messages.length === 0 ? (
                  <div className="flex-center h-full flex-col text-muted gap-2">
                    <p>Bu müşteri ile henüz mesajlaşma geçmişi yok.</p>
                    <p className="text-xs">Aşağıdaki editörden mesaj yazıp gönderebilirsiniz.</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`message-wrapper flex ${msg.isSent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`message p-4 rounded-xl max-w-[75%] ${msg.isSent ? 'bg-primary/20 border border-primary/30 rounded-br-none' : 'glass-card rounded-bl-none'}`} style={{background: msg.isSent ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)', border: `1px solid ${msg.isSent ? 'rgba(99, 102, 241, 0.4)' : 'var(--glass-border)'}`}}>
                        <div className="text-xs font-semibold mb-1" style={{color: msg.isSent ? 'var(--accent-primary)' : 'var(--accent-success)'}}>
                          {msg.isSent ? 'Siz (Gönderilen E-posta)' : `${activeConv.name} (Gelen Mesaj)`}
                        </div>
                        <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        <div className="message-time text-xs text-muted mt-2 flex items-center gap-1 justify-end">
                          <Clock size={12} /> {msg.time}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* AI Reply Options Picker */}
              {aiOptions && (
                <div className="ai-options-panel p-4 border-t bg-black/20" style={{borderColor: 'var(--glass-border)'}}>
                  <div className="flex-between mb-3">
                    <span className="text-xs font-bold text-cyan flex items-center gap-1">
                      <Sparkles size={14} /> AI Tarafından Üretilen Alternatif Yanıtlar (1 Tıkla Seçin)
                    </span>
                    <button className="text-xs text-muted hover:text-white" onClick={() => setAiOptions(null)}>&times; Kapat</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {aiOptions.map((opt, idx) => (
                      <div 
                        key={idx} 
                        className="glass-card p-3 cursor-pointer hover:border-primary transition-all text-xs flex flex-col justify-between"
                        style={{background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)'}}
                        onClick={() => setReplyText(opt.text)}
                      >
                        <div>
                          <span className={`badge ${opt.badge} text-[10px] mb-2 inline-block`}>{opt.tone}</span>
                          <p className="text-white text-xs line-clamp-3 whitespace-pre-wrap">{opt.text}</p>
                        </div>
                        <button className="btn btn-secondary text-[11px] w-full mt-2 py-1">Bu Yanıtı Seç</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Reply Input */}
              <div className="chat-reply p-4 border-t bg-black/10" style={{borderColor: 'var(--glass-border)'}}>
                <div className="reply-box relative">
                  <div className="flex-between mb-2">
                    <span className="text-xs text-secondary">Yanıt Yazın:</span>
                    <button 
                      className="btn btn-secondary text-xs flex items-center gap-1 py-1"
                      onClick={handleGenerateAiReplies}
                      disabled={generatingAi}
                    >
                      {generatingAi ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} className="text-cyan" />}
                      {generatingAi ? 'AI Yanıtları Üretiliyor...' : '✨ AI ile Alternatif Yanıt Üret'}
                    </button>
                  </div>

                  <textarea 
                    className="form-input w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary resize-none" 
                    placeholder="E-posta yanıtınızı buraya yazın veya AI butonunu kullanın..." 
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  ></textarea>

                  <div className="flex-between mt-3">
                    <div className="flex gap-2 text-muted text-xs items-center">
                      <CheckCircle2 size={14} /> Gönderildiğinde gerçek e-posta iletilir ve geçmişe kaydedilir.
                    </div>
                    <button className="btn btn-primary text-sm px-5" onClick={handleSend} disabled={sending || !replyText.trim()}>
                      {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />} 
                      {sending ? 'Gönderiliyor...' : 'E-posta Gönder'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-center h-full flex-col text-muted gap-2">
              <Bot size={48} className="opacity-40" />
              <p className="text-secondary">Sol listeden bir müşteri seçerek konuşma geçmişini görün.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationView;
