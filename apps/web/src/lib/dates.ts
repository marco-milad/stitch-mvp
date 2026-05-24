// Pure date helpers for the booking calendar. No external date library —
// these primitives are ~40 lines vs. shipping date-fns (~30 KB).

export interface MonthCell {
  date: Date;
  /** True when this cell belongs to the displayed month (not bleed from prev/next). */
  inMonth: boolean;
}

/**
 * Returns a 6-row × 7-col grid of dates for the calendar.
 * Weeks start Sunday. Leading days come from prev month, trailing from next.
 */
export function getMonthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0 = Sun
  const gridStart = new Date(year, month, 1 - startWeekday);

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    cells.push({ date, inMonth: date.getMonth() === month });
  }
  return cells;
}

function resolveLocale(lng: string | undefined): string {
  return lng?.startsWith('ar') ? 'ar-EG' : 'en-EG';
}

export function formatMonthYear(date: Date, lng: string | undefined): string {
  return new Intl.DateTimeFormat(resolveLocale(lng), {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatFullDate(date: Date, lng: string | undefined): string {
  return new Intl.DateTimeFormat(resolveLocale(lng), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Locale-aware short weekday names in display order (Sun..Sat). */
export function getWeekdayShortLabels(lng: string | undefined): string[] {
  const formatter = new Intl.DateTimeFormat(resolveLocale(lng), { weekday: 'short' });
  // 2024-01-07 was a Sunday — anchor so we always produce Sun..Sat.
  const sunday = new Date(2024, 0, 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return formatter.format(d);
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isPastDay(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

export function daysFromToday(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/** "2026-05-18" — stable, locale-free ISO date (no time component). */
export function toDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
