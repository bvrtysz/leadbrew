require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

// Routes
const leadsRouter = require('./routes/leads');
const emailsRouter = require('./routes/emails');
const campaignsRouter = require('./routes/campaigns');
const statsRouter = require('./routes/stats');

app.use('/api/leads', leadsRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LeadBrew API calisiyor', mode: process.env.EMAIL_MODE || 'SIMULATION' });
});

// Production: Serve React frontend build
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../client/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Bir seyler ters gitti!' });
});

// Initialize DB first, then start server
const { initDb } = require('./models/database');

initDb().then(() => {
  // Start Follow-up Service after DB is ready
  const followUpService = require('./services/followUpService');
  followUpService.start();

  app.listen(port, () => {
    console.log(`LeadBrew Sunucu http://localhost:${port} adresinde calisiyor`);
    console.log(`Mod: ${process.env.EMAIL_MODE || 'SIMULATION'}`);
  });
}).catch(err => {
  console.error('Veritabani baslatma hatasi:', err);
  process.exit(1);
});
