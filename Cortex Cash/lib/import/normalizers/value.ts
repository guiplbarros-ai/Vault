/**
 * Normalizador de Valores Monetários
 * Agent DATA: Owner
 */

export function normalizeValue(valueStr: string | number): number | null {
  if (typeof valueStr === 'number') return isNaN(valueStr) ? null : valueStr;
  if (!valueStr || typeof valueStr !== 'string') return null;

  let cleaned = valueStr.trim()
    .replace(/\s+/g, '')
    .replace(/^(R\$|USD|EUR|BRL)/, '')
    .trim();

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastCommaPos = cleaned.lastIndexOf(',');
    const lastDotPos = cleaned.lastIndexOf('.');
    if (lastCommaPos > lastDotPos) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  cleaned = cleaned.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}
