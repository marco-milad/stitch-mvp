// Locale-aware formatting helpers. Egyptian-Arabic and Egyptian-English
// targets — currency renders as "EGP 5,000,000" in EN and "٥٬٠٠٠٬٠٠٠ ج.م.‏"
// in AR (Eastern Arabic numerals + Arabic currency suffix).

export type Locale = 'en' | 'ar';

function resolveLocale(lng: string | undefined): Locale {
  return lng?.startsWith('ar') ? 'ar' : 'en';
}

export function formatEgp(value: number, lng: string | undefined): string {
  const locale = resolveLocale(lng);
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, lng: string | undefined): string {
  const locale = resolveLocale(lng);
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(value);
}
