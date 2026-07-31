class AiService {
  async generateEmail(lead, type = 'initial', context = '') {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let subject = '';
    let body = '';
    const name = lead.name ? lead.name.split(' ')[0] : 'Bey/Hanım';
    const salutation = `Merhaba ${name},`;
    
    if (type === 'initial') {
      if (lead.industry === 'Kafe' || lead.industry === 'Restoran' || lead.industry === 'Otelcilik') {
        subject = `${lead.company || 'İşletmeniz'} için özel çay ve kahve seçkimiz`;
        body = `${salutation}\n\n${lead.company || 'İşletmenizde'} misafirlerinize sunduğunuz kaliteyi yakından takip ediyoruz. İçecek menünüze değer katacak taze kavrulmuş yöresel kahve çekirdeklerimiz ve özel harman çaylarımızla ilgili size özel bir tadım paketi hazırlamak istedik.\n\nKısa bir telefon görüşmesi veya yüz yüze tadım için uygun bir zamanınızı öğrenebilir miyim?\n\nİyi çalışmalar,\nBaver`;
      } else {
        subject = `${lead.company || 'Şirketiniz'} ekibi için taze kahve çözümleri`;
        body = `${salutation}\n\n${lead.company || 'Şirketiniz'} ekibine motivasyon katacak taze kavrulmuş kahve ve premium çay tedariğimiz hakkında bilgi vermek istedim.\n\nOfisinize özel toptan fiyat avantajlarımızı ve ücretsiz tadım setimizi paylaşmak isteriz. Kısa bir görüşme için ne zaman müsaitsiniz?\n\nSelamlar,\nBaver`;
      }
    } else if (type.startsWith('follow_up')) {
      subject = `Re: ${lead.company || 'İşletmeniz'} için çay ve kahve çözümleri`;
      body = `${salutation}\n\nGeçtiğimiz günlerde ilettiğim mesajla ilgili kısa bir hatırlatma yapmak istedim.\n\nÜrünlerimizin tazeliğini ve kalitesini doğrudan deneyimlemeniz adına adresinize ücretsiz bir numune seti kargolayabiliriz. İlgilenirseniz adresi iletmeniz yeterlidir.\n\nGörüşmek üzere,\nBaver`;
    }
    
    return { subject, body };
  }

  async generateReplyOptions(lead, lastMessage = '') {
    await new Promise(resolve => setTimeout(resolve, 400));
    const name = lead ? (lead.name || 'Bey/Hanım').split(' ')[0] : '';
    const salutation = name ? `Merhaba ${name},` : 'Merhaba,';

    return [
      {
        tone: 'Kurumsal & Profesyonel',
        badge: 'badge-primary',
        text: `${salutation}\n\nİlginiz ve geri dönüşünüz için teşekkür ederim. Şirketimiz bünyesindeki taze kavrum kahve çekirdekleri ve özel harman çay kataloğumuzu incelemeniz için paylaşmaktan memnuniyet duyarım.\n\nÖnümüzdeki günlerde kısa bir telefon görüşmesi ile detayları netleştirebiliriz.\n\nSaygılarımla,\nBaver`
      },
      {
        tone: 'Sıcak & Samimi',
        badge: 'badge-success',
        text: `Harika haber ${name}! ☕\n\nGeri dönüşün için çok teşekkürler. İçecek menünüz için hazırladığımız özel tadım paketini hemen kargoya vermek isterim. Kargo adresini paylaşabilir misin?\n\nKeyifli çalışmalar,\nBaver`
      },
      {
        tone: 'Teklif & İndirim Odaklı',
        badge: 'badge-warning',
        text: `${salutation}\n\nDetaylı ilginiz için teşekkürler! ${lead?.company || 'İşletmenize'} özel ilk toptan siparişte geçerli %15 indirimli fiyat tablomuzu hazırladım.\n\nNe zaman müsaitsiniz, 5 dakikalık bir görüşmede detayları aktarayım?\n\nSelamlar,\nBaver`
      }
    ];
  }

  async analyzeAppointmentIntent(emailBody) {
    if (!emailBody) return { isAppointment: false };

    const text = emailBody.toLowerCase();
    const keywords = ['randevu', 'toplantı', 'görüşme', 'görüşelim', 'saat', 'salı', 'çarşamba', 'perşembe', 'cuma', 'pazartesi', 'bugün', 'yarın', 'gelebilirim', 'uygun'];
    const hasKeyword = keywords.some(k => text.includes(k));

    if (!hasKeyword) return { isAppointment: false };

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
      targetDate.setDate(targetDate.getDate() + 1);
    }

    let hour = 14;
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
    const endDate = new Date(targetDate.getTime() + 30 * 60 * 1000);
    const endTimeStr = endDate.toISOString().replace('T', ' ').substring(0, 16);

    return {
      isAppointment: true,
      proposedStartTime: startTimeStr,
      proposedEndTime: endTimeStr,
      summary: `${hour}:${minute < 10 ? '0' + minute : minute} Randevu Talebi`
    };
  }

  async generateConflictEmail(leadName, companyName, requestedTime, availableOptions) {
    const firstName = leadName ? leadName.split(' ')[0] : '';
    const salutation = firstName ? `Merhaba ${firstName},` : 'Merhaba,';
    const optionsFormatted = availableOptions.map(opt => `• ${opt}`).join('\n');

    const subject = `Re: Toplantı saatimiz hakkında`;
    const body = `${salutation}\n\nMesajınız için teşekkür ederim. Belirttiğiniz ${requestedTime} saat diliminde önceden planlanmış bir görüşmem bulunuyor.\n\nSizin için de uygunsa aşağıdaki zaman dilimlerinden birinde görüşmeyi gerçekleştirebiliriz:\n\n${optionsFormatted}\n\nHangi saat size daha uygun olursa iletmeniz yeterlidir, hemen takvimime ekleyeceğim.\n\nSelamlar,\nBaver`;

    return { subject, body };
  }

  async generateConfirmationEmail(leadName, companyName, confirmedTime) {
    const firstName = leadName ? leadName.split(' ')[0] : '';
    const salutation = firstName ? `Merhaba ${firstName},` : 'Merhaba,';
    const subject = `Re: Randevu Onayı - ${confirmedTime}`;
    const body = `${salutation}\n\nToplantı talebiniz için teşekkür ederim. ${confirmedTime} tarihindeki görüşmemizi takvime ekledim ve onayladım.\n\nBelirtilen saatte görüşmek üzere,\n\nİyi çalışmalar,\nBaver`;

    return { subject, body };
  }

  async generateSmartHumanReply(lead, incomingText = '') {
    const name = lead.name ? lead.name.split(' ')[0] : '';
    const salutation = name ? `Merhaba ${name},` : 'Merhaba,';
    const lower = incomingText.toLowerCase();

    let subject = 'Re: Conbella İletişim';
    let body = '';

    if (lower.includes('fiyat') || lower.includes('katalog') || lower.includes('ücret') || lower.includes('maliyet') || lower.includes('toptan')) {
      subject = 'Re: Ürün kataloğumuz ve toptan fiyat listesi';
      body = `${salutation}\n\nDetaylı ilginiz için teşekkürler! İşletmenize özel taze kavrum kahve çekirdeklerimiz ve ithal çay menümüz için özel indirimli fiyat tablomuzu hazırladık.\n\nDilerseniz ürün kalitemizi doğrudan test etmeniz için ücretsiz numune paketimizi adresinize yönlendirebilirim. Kargo adresinizi iletmeniz yeterlidir.\n\nSelamlar,\nBaver`;
    } else if (lower.includes('numune') || lower.includes('tadım') || lower.includes('örnek') || lower.includes('adres')) {
      subject = 'Re: Numune paketi gönderimi';
      body = `${salutation}\n\nHarika! Özel kavurduğumuz espresso ve filtre kahve numunelerimiz ile organik çay seçkimizi hemen kargoya hazırlıyorum.\n\nKargonuz yola çıktığında bilgi ileteceğim. Başka bir sorunuz olursa bana buradan her zaman ulaşabilirsiniz.\n\nKeyifli çalışmalar,\nBaver`;
    } else if (lower.includes('teşekkür') || lower.includes('tamam') || lower.includes('olur') || lower.includes('anlaştık')) {
      subject = 'Re: İletişimimiz hakkında';
      body = `${salutation}\n\nBen teşekkür ederim! Süreci yakından takip ediyor olacağım. İstediğiniz zaman bana bu mail adresi üzerinden ulaşabilirsiniz.\n\nİyi çalışmalar dilerim,\nBaver`;
    } else {
      subject = 'Re: Geri dönüşünüz hakkında';
      body = `${salutation}\n\nMesajınız ve geri dönüşünüz için çok teşekkür ederim. Talebinizi aldım ve memnuniyetle yardımcı olmak isterim.\n\nKonuyu daha detaylı netleştirmek için ne zaman kısa bir görüşme yapabiliriz?\n\nSaygılarımla,\nBaver`;
    }

    return { subject, body };
  }
}

module.exports = new AiService();
