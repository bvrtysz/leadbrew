require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

// API Routes
const leadsRouter = require('./routes/leads');
const emailsRouter = require('./routes/emails');
const campaignsRouter = require('./routes/campaigns');
const statsRouter = require('./routes/stats');

app.use('/api/leads', leadsRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/stats', statsRouter);

// Inbox check endpoint
const inboxService = require('./services/inboxService');
app.post('/api/inbox/check', async (req, res) => {
  try {
    const result = await inboxService.checkInbox();
    res.json(result);
  } catch (error) {
    console.error('Inbox kontrol hatasi:', error);
    res.status(500).json({ error: 'Gelen kutusu kontrol edilemedi' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Conbella API calisiyor', mode: process.env.EMAIL_MODE || 'SIMULATION' });
});

// Serve React frontend build if dist folder exists
const frontendPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Bir seyler ters gitti!' });
});

// Initialize DB first, then start server on 0.0.0.0 for Cloud/Railway compatibility
const { initDb } = require('./models/database');

initDb().then(() => {
  const followUpService = require('./services/followUpService');
  followUpService.start();

  // Start periodic Gmail inbox checking (every 5 minutes)
  inboxService.startPeriodicCheck(5);

  app.listen(port, '0.0.0.0', () => {
    console.log(`Conbella Sunucu 0.0.0.0:${port} üzerinde çalışıyor`);
    console.log(`Mod: ${process.env.EMAIL_MODE || 'SIMULATION'}`);
  });
}).catch(err => {
  console.error('Veritabani baslatma hatasi:', err);
  process.exit(1);
});
