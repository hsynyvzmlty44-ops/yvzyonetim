/**
 * Türkiye saatiyle (UTC+3 / Europe/Istanbul) çalışan tarih yardımcıları.
 * Supabase'e kaydedilen veriler UTC'dir; period hesaplamaları için
 * doğru ayı bulmak amacıyla Türkiye saatini kullanıyoruz.
 */

/** Şu anki Türkiye zamanını Date olarak döner. */
export function getTurkeyNow(): Date {
  // Intl API ile güvenilir timezone dönüşümü
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';

  return new Date(
    `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
  );
}

/**
 * Türkiye saatiyle geçerli ayın ilk günü, 'YYYY-MM-DD' biçiminde.
 * Aidat periyodu hesaplamalarında kullanılır.
 */
export function getTurkeyPeriodStart(): string {
  const turkey = getTurkeyNow();
  const year = turkey.getFullYear();
  const month = String(turkey.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Tarih verisini Türkiye saatine göre okunabilir formata çevirir.
 * @example formatTurkeyDate('2025-01-15T21:30:00Z') → '16 Ocak 2025, 00:30'
 */
export function formatTurkeyDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
