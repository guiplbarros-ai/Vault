/**
 * Normalizador de Datas
 * Agent DATA: Owner
 */

const DATE_PATTERNS = [
  /^(\d{2})[\/-](\d{2})[\/-](\d{4})$/,
  /^(\d{2})[\/-](\d{2})[\/-](\d{2})$/,
  /^(\d{4})-(\d{2})-(\d{2})$/,
  /^(\d{4})\/(\d{2})\/(\d{2})$/,
  /^(\d{2})\.(\d{2})\.(\d{4})$/,
];

export function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();

  for (const pattern of DATE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      if (pattern.source.startsWith('^(\\d{2})')) {
        let [, day, month, year] = match;
        if (year.length === 2) {
          year = parseInt(year, 10) < 50 ? `20${year}` : `19${year}`;
        }
        const isoDate = `${year}-${month}-${day}`;
        if (isValidDate(isoDate)) return isoDate;
      }
      if (pattern.source.startsWith('^(\\d{4})')) {
        const [, year, month, day] = match;
        const isoDate = `${year}-${month}-${day}`;
        if (isValidDate(isoDate)) return isoDate;
      }
    }
  }
  return null;
}

function isValidDate(isoDate: string): boolean {
  const date = new Date(isoDate + 'T00:00:00');
  if (isNaN(date.getTime())) return false;
  const [year, month, day] = isoDate.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
