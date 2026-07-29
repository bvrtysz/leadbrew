import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LeadFinder from './components/LeadFinder';
import EmailComposer from './components/EmailComposer';
import CampaignManager from './components/CampaignManager';
import ConversationView from './components/ConversationView';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<LeadFinder />} />
            <Route path="/compose" element={<EmailComposer />} />
            <Route path="/compose/:leadId" element={<EmailComposer />} />
            <Route path="/campaigns" element={<CampaignManager />} />
            <Route path="/conversations" element={<ConversationView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
