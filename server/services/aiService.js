class AiService {
  async generateEmail(lead, type = 'initial', context = '') {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let subject = '';
    let body = '';
    const firstName = (lead.name || 'Yetkili').split(' ')[0];
    
    if (type === 'initial') {
      if (lead.industry === 'Kafe' || lead.industry === 'Restoran' || lead.industry === 'Otelcilik') {
        subject = `${lead.company || 'İşletmeniz'} misafirleri için premium çay ve kahve deneyimi`;
        body = `Sayın ${firstName} Bey/Hanım,\n\n${lead.company || 'İşletmeniz'} kalitesini yakından takip ediyoruz. İçecek kalitesinin misafir memnuniyetindeki önemini bildiğinizi tahmin ediyorum.\n\nÖzenle seçilmiş yöresel kahve çekirdeklerimiz ve özel harman çay çeşitlerimizle işletmenize özel toptan çözümler sunuyoruz.\n\nÜrünlerimizin tadımı ve fiyat avantajlarımız hakkında kısa bir görüşme yapabilir miyiz?\n\nSaygılarımla,`;
      } else {
        subject = `${lead.company || 'Şirketiniz'} çalışanları için kaliteli çay ve kahve çözümleri`;
        body = `Sayın ${firstName} Bey/Hanım,\n\n${lead.company || 'Şirketiniz'} ekibinin günlük enerjisini tazelemek ve ofis içi memnuniyeti artırmak ister misiniz?\n\nKurumsal ofisler için özel olarak hazırladığımız taze kavrum kahve ve çay abonelik paketlerimizle tanışmanızı isteriz.\n\nSize özel teklifimizi görüşmek için ne zaman müsaitsiniz?\n\nSaygılarımla,`;
      }
    } else if (type.startsWith('follow_up')) {
      subject = `Yeniden: ${lead.company || 'İşletmeniz'} için özel çay ve kahve çözümleri`;
      body = `Merhaba ${firstName} Bey/Hanım,\n\nGeçtiğimiz günlerde size sunduğumuz çözümlerle ilgili ulaşmıştım.\n\nSadece ürün kalitemizi denemeniz için ücretsiz tadım numune seti göndermek isteriz. Adresinizi paylaşırsanız hemen kargolayabiliriz.\n\nİyi çalışmalar dilerim,`;
    }
    
    return { subject, body };
  }

  async generateReplyOptions(lead, lastMessage = '') {
    await new Promise(resolve => setTimeout(resolve, 600));
    const name = lead ? (lead.name || 'Yetkili').split(' ')[0] : 'Yetkili';
    const company = lead ? (lead.company || 'Şirketiniz') : 'Şirketiniz';

    return [
      {
        tone: 'Kurumsal & Profesyonel',
        badge: 'badge-primary',
        text: `Merhaba ${name} Bey/Hanım,\n\nGeri dönüşünüz için teşekkür ederiz. ${company} için hazırladığımız özel ürün kataloğumuzu ve toptan fiyat listemizi ekte sunabilirim.\n\nÖnümüzdeki hafta müsait olduğunuz bir gün detayları görüşmek isteriz.\n\nSaygılarımla,`
      },
      {
        tone: 'Sıcak & Samimi',
        badge: 'badge-success',
        text: `Harika haber ${name} Hanım/Bey! ☕\n\nİlginiz için çok teşekkürler. Size özel kavurduğumuz taze kahve numune paketimizi hemen kargoya vermek isteriz. Kargoyu nereye yönlendirelim?\n\nKeyifli çalışmalar!`
      },
      {
        tone: 'Teklif & İndirim Odaklı',
        badge: 'badge-warning',
        text: `Merhaba ${name} Bey/Hanım,\n\n${company} işletmenize özel ilk siparişe özel %15 indirimli toptan fiyat teklifimizi hazırladık.\n\nKısa bir telefon görüşmesi ile detayları aktarmak isterim, ne zaman arayabiliriz?\n\nİyi günler!`
      }
    ];
  }
}

module.exports = new AiService();
