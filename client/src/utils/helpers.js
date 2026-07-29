export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const getStatusConfig = (status) => {
  const configs = {
    yeni: { label: 'Yeni', color: 'badge-info' },
    iletisimde: { label: 'İletişimde', color: 'badge-primary' },
    ilgileniyor: { label: 'İlgileniyor', color: 'badge-warning' },
    musteri: { label: 'Müşteri', color: 'badge-success' },
    aktif: { label: 'Aktif', color: 'badge-success' },
    duraklatildi: { label: 'Duraklatıldı', color: 'badge-warning' },
    tamamlandi: { label: 'Tamamlandı', color: 'badge-info' },
  };
  return configs[status] || { label: status, color: 'badge-secondary' };
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('tr-TR').format(num);
};

export const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
