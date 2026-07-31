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

  async analyzeAppointmentIntent(emailBody) {
    if (!emailBody) return { isAppointment: false };

    const text = emailBody.toLowerCase();
    const keywords = ['randevu', 'toplantı', 'görüşme', 'görüşelim', 'saat', 'salı', 'çarşamba', 'perşembe', 'cuma', 'pazartesi', 'bugün', 'yarın', 'gelebilirim', 'uygun'];
    const hasKeyword = keywords.some(k => text.includes(k));

    if (!hasKeyword) return { isAppointment: false };

    // Extract proposed time/date using standard regex patterns or fallbacks
    const dateMatch = text.match(/(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})/);
    const timeMatch = text.match(/(\d{1,2})[:\.](\d{2})/);

    let targetDate = new Date();
    if (text.includes('yarın')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (text.includes('pazartesi')) {
      targetDate.setDate(targetDate.getDate() + ((1 + 7 - targetDate.getDay()) % 7 || 7));
    } else if (text.includes('salı')) {
      targetDate.setDate(targetDate.getDate() + ((2 + 7 - targetDate.getDay()) % 7 || 7));
    } else if (text.includes('çarşamba')) {
      targetDate.setDate(targetDate.getDate() + ((3 + 7 - targetDate.getDay()) % 7 || 7));
    } else if (text.includes('perşembe')) {
      targetDate.setDate(targetDate.getDate() + ((4 + 7 - targetDate.getDay()) % 7 || 7));
    } else if (text.includes('cuma')) {
      targetDate.setDate(targetDate.getDate() + ((5 + 7 - targetDate.getDay()) % 7 || 7));
    } else if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = parseInt(dateMatch[3]);
      targetDate = new Date(year, month, day);
    } else {
      targetDate.setDate(targetDate.getDate() + 1); // Default to tomorrow
    }

    let hour = 14; // Default to 14:00 if not specified
    let minute = 0;
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = parseInt(timeMatch[2]);
    } else {
      const simpleHour = text.match(/saat\s*(\d{1,2})/);
      if (simpleHour) hour = parseInt(simpleHour[1]);
    }

    targetDate.setHours(hour, minute, 0, 0);

    const startTimeStr = targetDate.toISOString().replace('T', ' ').substring(0, 16);
    const endDate = new Date(targetDate.getTime() + 30 * 60 * 1000); // 30 min duration
    const endTimeStr = endDate.toISOString().replace('T', ' ').substring(0, 16);

    return {
      isAppointment: true,
      proposedStartTime: startTimeStr,
      proposedEndTime: endTimeStr,
      summary: `${hour}:${minute < 10 ? '0' + minute : minute} Randevu Talebi`
    };
  }

  async generateConflictEmail(leadName, companyName, requestedTime, availableOptions) {
    const firstName = (leadName || 'Yetkili').split(' ')[0];
    const optionsFormatted = availableOptions.map(opt => `• ${opt}`).join('\n');

    const subject = `Re: Toplantı Randevusu - Alternatif Saat Önerisi`;
    const body = `Sayın ${firstName} Bey/Hanım,\n\n${companyName || 'Şirketiniz'} ile yapacağımız görüşme talebiniz için teşekkür ederiz.\n\nBelirttiğiniz ${requestedTime} zaman diliminde takvimimde önceden planlanmış bir randevum/meşguliyetim bulunmaktadır.\n\nSize daha iyi hizmet verebilmek adına aşağıdaki alternatif zaman dilimlerinden biri sizin için uygun olur mu?\n\n${optionsFormatted}\n\nUygun olduğunuz saati iletirseniz randevunuzu derhal onaylayabilirim.\n\nİyi çalışmalar dilerim,\nConbella Ekibi`;

    return { subject, body };
  }

  async generateConfirmationEmail(leadName, companyName, confirmedTime) {
    const firstName = (leadName || 'Yetkili').split(' ')[0];
    const subject = `Re: Randevunuz Onaylandı - ${confirmedTime}`;
    const body = `Sayın ${firstName} Bey/Hanım,\n\n${companyName || 'Şirketiniz'} ile görüşme randevunuz ${confirmedTime} tarihi için başarıyla takvimimize eklenmiş ve onaylanmıştır.\n\nToplantı saatinde görüşmek üzere, iyi çalışmalar dileriz.\n\nSaygılarımızla,\nConbella Ekibi`;

    return { subject, body };
  }
}

module.exports = new AiService();
