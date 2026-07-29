import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Mail, FolderOpen, MessageSquare, Settings, Coffee } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Coffee className="brand-icon" size={28} />
        <h2 className="brand-title">LeadBrew</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/leads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Search size={20} />
          <span>Lead Bul</span>
        </NavLink>
        <NavLink to="/compose" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Mail size={20} />
          <span>E-posta Yaz</span>
        </NavLink>
        <NavLink to="/campaigns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FolderOpen size={20} />
          <span>Kampanyalar</span>
        </NavLink>
        <NavLink to="/conversations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} />
          <span>Konuşmalar</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item btn-ghost w-full">
          <Settings size={20} />
          <span>Ayarlar</span>
        </button>
        <div className="user-profile">
          <div className="avatar">AD</div>
          <div className="user-info">
            <span className="user-name">Admin Kullanıcı</span>
            <span className="user-role">Satış Yöneticisi</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
