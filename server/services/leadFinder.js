const uuid = require('uuid').v4;

const firstNames = ['Ali', 'Ayşe', 'Mehmet', 'Fatma', 'Mustafa', 'Zeynep', 'Emre', 'Burcu', 'Cem', 'Deniz', 'Eren', 'Gizem', 'Hakan', 'İpek', 'Kaan'];
const lastNames = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Öztürk', 'Kılıç', 'Arslan', 'Erdoğan', 'Çetin', 'Polat', 'Can', 'Korkmaz', 'Şen'];
const companies = ['Grup', 'Holding', 'A.Ş.', 'Ltd. Şti.', 'Sanayi', 'Ticaret'];

const industries = {
  'Otelcilik': ['Resort', 'Boutique Hotel', 'Grand Hotel', 'Konaklama'],
  'Restoran': ['Lezzet', 'Gurme', 'Mutfak', 'Gastronomi'],
  'Kafe': ['Kahve', 'Cafe', 'Roastery', 'Bistro'],
  'Kurumsal Ofis': ['Tech', 'Yazılım', 'Danışmanlık', 'Ajans'],
  'Catering': ['Catering', 'Davet', 'Organizasyon', 'Ziyafet']
};

function generateRandomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

function generateCompany(industry) {
  const prefix = lastNames[Math.floor(Math.random() * lastNames.length)];
  let suffix = '';
  if (industries[industry]) {
    suffix = industries[industry][Math.floor(Math.random() * industries[industry].length)];
  } else {
    suffix = 'İşletmeleri';
  }
  const type = companies[Math.floor(Math.random() * companies.length)];
  return `${prefix} ${suffix} ${type}`;
}

function generateEmail(name, company) {
  const map = { 'ı': 'i', 'i': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'I': 'i', 'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c' };
  
  const cleanName = name.replace(/ /g, '.').replace(/[ıiğüşöçIİĞÜŞÖÇ]/gi, match => map[match] || match).toLowerCase();
  const cleanCompany = company.split(' ')[0].replace(/[ıiğüşöçIİĞÜŞÖÇ]/gi, match => map[match] || match).toLowerCase();
  
  return `${cleanName}@${cleanCompany}.com.tr`;
}

class LeadFinderService {
  async findLeads(industry = 'Kurumsal Ofis', position = 'Genel Müdür', count = 5) {
    // Simüle edilmiş bekleme süresi
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const leads = [];
    for (let i = 0; i < count; i++) {
      const name = generateRandomName();
      const company = generateCompany(industry);
      
      leads.push({
        id: uuid(),
        name,
        email: generateEmail(name, company),
        company,
        position,
        industry,
        notes: 'API üzerinden otomatik bulundu (Simülasyon)'
      });
    }
    
    return leads;
  }
}

module.exports = new LeadFinderService();
