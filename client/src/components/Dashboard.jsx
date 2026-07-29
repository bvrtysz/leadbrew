import React, { useState, useEffect } from 'react';
import { Users, Send, Eye, MessageSquare, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../utils/api';
import './Dashboard.css';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

const StatCard = ({ title, value, icon: Icon, trend, trendUp, colorClass }) => (
  <div className={`glass-card stat-card ${colorClass}`}>
    <div className="stat-header flex-between">
      <h3 className="stat-title">{title}</h3>
      <div className="stat-icon-wrapper">
        <Icon size={20} />
      </div>
    </div>
    <div className="stat-value">{value}</div>
    <div className={`stat-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
      {trendUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
      <span>{trend} geçen haftaya göre</span>
    </div>
  </div>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    sentEmails: 0,
    openRate: 0,
    replyRate: 0,
    activityData: [],
    statusDistribution: [],
    recentActivities: [],
    activeCampaigns: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.getDashboardStats();
        setStats({
          totalLeads: data.totalLeads || 0,
          sentEmails: data.sentEmails || 0,
          openRate: data.openRate || 0,
          replyRate: data.replyRate || 0,
          activityData: data.activityData || [],
          statusDistribution: data.statusDistribution || [],
          recentActivities: data.recentActivities || [],
          activeCampaigns: data.activeCampaigns || []
        });
        setError(false);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in dashboard-loading flex-center flex-col gap-4" style={{minHeight: '60vh'}}>
        <div className="loading-spinner spin" style={{width: 40, height: 40, border: '4px solid var(--glass-border)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%'}}></div>
        <p className="text-secondary">Veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="flex-between dashboard-header">
        <div>
          <h1 className="text-h1">Genel Bakış</h1>
          <p className="text-secondary">LeadBrew satış otomasyonu özet istatistikleriniz.</p>
        </div>
        <button className="btn btn-primary">Yeni Kampanya</button>
      </header>
      
      {error && (
        <div className="glass-card mb-8 p-4 bg-danger text-center" style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)'}}>
          <p className="text-danger">Sunucuya bağlanılamadı. Veriler geçici olarak gösterilemiyor.</p>
        </div>
      )}

      <div className="grid-4 mb-8">
        <StatCard title="Toplam Lead" value={stats.totalLeads} icon={Users} trend="%0 artış" trendUp={true} colorClass="stat-purple" />
        <StatCard title="Gönderilen E-posta" value={stats.sentEmails} icon={Send} trend="%0 artış" trendUp={true} colorClass="stat-cyan" />
        <StatCard title="Açılma Oranı" value={`%${stats.openRate}`} icon={Eye} trend="%0 düşüş" trendUp={false} colorClass="stat-green" />
        <StatCard title="Cevap Oranı" value={`%${stats.replyRate}`} icon={MessageSquare} trend="%0 artış" trendUp={true} colorClass="stat-amber" />
      </div>

      <div className="dashboard-charts mb-8">
        <div className="glass-card chart-container">
          <h3 className="text-h3 mb-4">Son 7 Günlük E-posta Aktivitesi</h3>
          <div style={{ height: '300px' }}>
            {stats.activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.activityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="gonderilen" name="Gönderilen" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="acilan" name="Açılan" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-center h-full text-muted">Veri bulunamadı</div>
            )}
          </div>
        </div>

        <div className="glass-card chart-container">
          <h3 className="text-h3 mb-4">Lead Durumu Dağılımı</h3>
          <div style={{ height: '300px' }}>
            {stats.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value">
                    {stats.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(10,10,15,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-center h-full text-muted">Veri bulunamadı</div>
            )}
          </div>
          {stats.statusDistribution.length > 0 && (
            <div className="flex-center gap-4 mt-4 pie-legend">
               {stats.statusDistribution.map((entry, index) => (
                 <div key={index} className="legend-item flex-center gap-2">
                   <div className="legend-color" style={{ backgroundColor: COLORS[index % COLORS.length], width: 12, height: 12, borderRadius: '50%' }}></div>
                   <span className="text-sm text-secondary">{entry.name}</span>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-bottom grid-2 gap-4">
        <div className="glass-card recent-activity">
          <h3 className="text-h3 mb-4">Son Aktiviteler</h3>
          <div className="timeline">
            {stats.recentActivities.length > 0 ? stats.recentActivities.map((act, i) => (
              <div key={i} className="timeline-item mb-4">
                <div className="timeline-icon bg-cyan"><Send size={14} /></div>
                <div className="timeline-content">
                  <p>{act.description}</p>
                  <span className="time flex-center gap-2"><Clock size={12}/> {act.time}</span>
                </div>
              </div>
            )) : <p className="text-muted">Aktivite bulunamadı.</p>}
          </div>
        </div>

        <div className="glass-card active-campaigns">
          <h3 className="text-h3 mb-4">Aktif Kampanyalar</h3>
          <div className="campaign-mini-cards">
            {stats.activeCampaigns.length > 0 ? stats.activeCampaigns.map((camp, i) => (
              <div key={i} className="campaign-mini mb-4">
                <div className="flex-between mb-2">
                  <span className="font-semibold">{camp.name}</span>
                  <span className="badge badge-info">Aktif</span>
                </div>
                <div className="progress-bar-bg mb-2"><div className="progress-bar-fill" style={{width: `${camp.progress}%`}}></div></div>
                <p className="text-sm text-secondary">{camp.sent} / {camp.total} E-posta gönderildi</p>
              </div>
            )) : <p className="text-muted">Aktif kampanya bulunamadı.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
