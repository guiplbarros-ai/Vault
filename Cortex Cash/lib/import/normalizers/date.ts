/**
 * Normalizador de Datas
 * Agent DATA: Owner
 *
 * Normaliza datas em vários formatos para ISO string (YYYY-MM-DD)
 * IMPORTANTE: Validação usa timezone local para evitar problemas de "voltar um dia"
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

/**
 * Valida se uma data ISO é válida
 *
 * IMPORTANTE: Usa new Date(year, month, day) para timezone local
 * ao invés de new Date(isoString) que usa UTC
 */
function isValidDate(isoDate: string): boolean {
  const [year, month, day] = isoDate.split('-').map(Number);

  // Validar ranges básicos
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  // Criar data no timezone local (não UTC)
  const date = new Date(year, month - 1, day, 12, 0, 0);

  if (isNaN(date.getTime())) return false;

  // Verificar se a data criada corresponde aos componentes
  // (pega casos como 31 de fevereiro que rola para março)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
