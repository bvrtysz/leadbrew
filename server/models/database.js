const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'leads.db');

let db;

function getDb() {
  return db;
}

// sql.js wrapper to mimic better-sqlite3 synchronous API
class SyncDb {
  constructor(sqlJsDb) {
    this._db = sqlJsDb;
  }

  pragma(str) { /* no-op for sql.js */ }

  exec(sql) {
    this._db.run(sql);
    this._save();
  }

  prepare(sql) {
    const self = this;
    // Normalize params: flatten single-array arg, handle object, or keep spread
    function normalizeParams(args) {
      if (args.length === 0) return [];
      if (args.length === 1) {
        if (Array.isArray(args[0])) return args[0]; // .all([a,b,c]) → [a,b,c]
        if (typeof args[0] === 'object' && args[0] !== null) return args[0]; // named params object
        return args; // single primitive
      }
      return args; // multiple positional args
    }
    return {
      run(...args) {
        const params = normalizeParams(args);
        if (params && (Array.isArray(params) ? params.length > 0 : Object.keys(params).length > 0)) {
          self._db.run(sql, params);
        } else {
          self._db.run(sql);
        }
        self._save();
        return { changes: 1 };
      },
      get(...args) {
        const params = normalizeParams(args);
        const stmt = self._db.prepare(sql);
        if (params && (Array.isArray(params) ? params.length > 0 : Object.keys(params).length > 0)) {
          stmt.bind(params);
        }
        if (stmt.step()) {
          const result = stmt.getAsObject();
          stmt.free();
          return result;
        }
        stmt.free();
        return undefined;
      },
      all(...args) {
        const params = normalizeParams(args);
        const results = [];
        const stmt = self._db.prepare(sql);
        if (params && (Array.isArray(params) ? params.length > 0 : Object.keys(params).length > 0)) {
          stmt.bind(params);
        }
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  transaction(fn) {
    return () => {
      this._db.run('BEGIN');
      try {
        fn();
        this._db.run('COMMIT');
      } catch(e) {
        this._db.run('ROLLBACK');
        throw e;
      }
      this._save();
    };
  }

  _save() {
    const data = this._db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

async function initDb() {
  const SQL = await initSqlJs();
  
  let sqlJsDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlJsDb = new SQL.Database(fileBuffer);
  } else {
    sqlJsDb = new SQL.Database();
  }

  db = new SyncDb(sqlJsDb);

  console.log('Veritabani baslatiliyor...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT NOT NULL,
      position TEXT,
      industry TEXT,
      linkedin_url TEXT,
      website TEXT,
      phone TEXT,
      notes TEXT,
      status TEXT DEFAULT 'new',
      source TEXT DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      target_position TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      follow_up_days INTEGER DEFAULT 5,
      max_follow_ups INTEGER DEFAULT 3,
      email_template TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      campaign_id TEXT,
      subject TEXT,
      body TEXT,
      type TEXT,
      status TEXT DEFAULT 'draft',
      sent_at DATETIME,
      opened_at DATETIME,
      replied_at DATETIME,
      scheduled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      email_id TEXT,
      message TEXT,
      direction TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed data
  const count = db.prepare('SELECT count(*) as count FROM leads').get().count;
  if (!count || count === 0) {
    console.log('Ornek veriler ekleniyor...');
    const { v4: uuid } = require('uuid');

    const sampleLeads = [
      { id: uuid(), name: 'Ahmet Yilmaz', email: 'ahmet.yilmaz@grandhotelistanbul.com', company: 'Grand Hotel Istanbul', position: 'Genel Mudur', industry: 'Otelcilik', status: 'new' },
      { id: uuid(), name: 'Ayse Kaya', email: 'ayse.kaya@lezzetrestoran.com', company: 'Lezzet Restoranlari', position: 'Satin Alma Muduru', industry: 'Restoran', status: 'new' },
      { id: uuid(), name: 'Mehmet Demir', email: 'mehmet.demir@kahvedukkani.com.tr', company: 'Kahve Dukkani Zinciri', position: 'Isletme Muduru', industry: 'Kafe', status: 'new' },
      { id: uuid(), name: 'Fatma Celik', email: 'fatma.celik@kurumsalofisim.com', company: 'Kurumsal Ofis AS', position: 'Operasyon Muduru', industry: 'Kurumsal Ofis', status: 'new' },
      { id: uuid(), name: 'Mustafa Sahin', email: 'mustafa.sahin@elitcatering.com', company: 'Elit Catering', position: 'F&B Muduru', industry: 'Catering', status: 'new' },
      { id: uuid(), name: 'Emre Yildiz', email: 'emre.yildiz@techcorp.com.tr', company: 'TechCorp Turkiye', position: 'Ofis Yoneticisi', industry: 'Kurumsal Ofis', status: 'new' },
      { id: uuid(), name: 'Zeynep Ozturk', email: 'zeynep.ozturk@boutiquehotel.com', company: 'Boutique Hotel', position: 'Genel Mudur', industry: 'Otelcilik', status: 'new' },
      { id: uuid(), name: 'Ali Kilic', email: 'ali.kilic@gurmerestoran.com', company: 'Gurme Restoran', position: 'Mutfak Sefi', industry: 'Restoran', status: 'new' },
      { id: uuid(), name: 'Burcu Arslan', email: 'burcu.arslan@trendycafe.com', company: 'Trendy Cafe', position: 'Isletme Sahibi', industry: 'Kafe', status: 'new' },
      { id: uuid(), name: 'Cem Erdogan', email: 'cem.erdogan@megaavm.com', company: 'Mega AVM Yonetimi', position: 'Satin Alma Sorumlusu', industry: 'Perakende', status: 'new' },
      { id: uuid(), name: 'Deniz Cetin', email: 'deniz.cetin@startupturkey.com', company: 'Startup Turkiye', position: 'IK Muduru', industry: 'Kurumsal Ofis', status: 'new' },
      { id: uuid(), name: 'Eren Polat', email: 'eren.polat@luxuryresort.com', company: 'Luxury Resort Antalya', position: 'F&B Direktoru', industry: 'Otelcilik', status: 'new' },
      { id: uuid(), name: 'Gizem Can', email: 'gizem.can@coffeeshop.com.tr', company: 'Local Coffee Shop', position: 'Kurucu', industry: 'Kafe', status: 'new' },
      { id: uuid(), name: 'Hakan Korkmaz', email: 'hakan.korkmaz@anadolulezzetleri.com', company: 'Anadolu Lezzetleri', position: 'Satin Alma Muduru', industry: 'Restoran', status: 'new' },
      { id: uuid(), name: 'Ipek Sen', email: 'ipek.sen@eventmanagement.com', company: 'Event Management Co', position: 'Operasyon Direktoru', industry: 'Catering', status: 'new' }
    ];

    const insertLead = db.prepare(
      'INSERT INTO leads (id, name, email, company, position, industry, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    for (const lead of sampleLeads) {
      insertLead.run(lead.id, lead.name, lead.email, lead.company, lead.position, lead.industry, lead.status);
    }

    console.log('15 ornek lead basariyla eklendi.');
  }
}

// Initialize and export a promise + sync getter
module.exports = { initDb, getDb };
