class AiService {
  async generateEmail(lead, type = 'initial', context = '') {
    // Simüle edilmiş AI bekleme süresi
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let subject = '';
    let body = '';
    
    const firstName = lead.name.split(' ')[0];
    
    if (type === 'initial') {
      if (lead.industry === 'Kafe' || lead.industry === 'Restoran' || lead.industry === 'Otelcilik') {
        subject = \`\${lead.company} misafirleri için premium çay ve kahve deneyimi\`;
        body = \`Sayın \${firstName} Bey/Hanım,

\${lead.company} işletmenizin sektördeki kalitesini yakından takip ediyoruz. Bir \${lead.position} olarak misafirlerinize sunduğunuz içecek kalitesinin ne kadar önemli olduğunu bildiğinizi tahmin ediyorum.

Özenle seçilmiş yöresel kahve çekirdeklerimiz ve dökme/poşet çay çeşitlerimizle \${lead.industry} sektöründeki işletmelere özel toptan çözümler sunuyoruz. 

Ürünlerimizin tadımı ve fiyat avantajlarımız hakkında görüşmek üzere önümüzdeki hafta 10 dakikalık bir toplantı veya telefon görüşmesi ayarlayabilir miyiz?

Saygılarımla,\`;
      } else {
        subject = \`\${lead.company} çalışanları için kaliteli çay ve kahve çözümleri\`;
        body = \`Sayın \${firstName} Bey/Hanım,

\${lead.company} ekibinin günlük enerjisini tazelemek ve ofis içi memnuniyeti artırmak ister misiniz?

Kurumsal ofisler için özel olarak hazırladığımız çay ve kahve abonelik paketlerimizle tanışmanızı isteriz. Yüksek kaliteli ürünlerimizle hem çalışanlarınızın motivasyonunu artırabilir hem de maliyetlerinizi optimize edebilirsiniz.

Size özel hazırlayabileceğimiz teklifi görüşmek için ne zaman müsaitsiniz?

Saygılarımla,\`;
      }
    } else if (type.startsWith('follow_up')) {
      subject = \`Yeniden: \${lead.company} için çay ve kahve çözümleri\`;
      body = \`Merhaba \${firstName} Bey/Hanım,

Geçtiğimiz günlerde size \${lead.company} için sunduğumuz çay ve kahve çözümlerimizle ilgili ulaşmıştım. 

Yoğunluğunuzu anlıyorum. Sadece ürünlerimizi denemeniz için size ücretsiz bir tadım seti göndermek istediğimizi hatırlatmak istedim.

Adresinizi paylaşırsanız hemen kargolayabiliriz.

İyi çalışmalar dilerim,\`;
    }
    
    return { subject, body };
  }
}

module.exports = new AiService();
