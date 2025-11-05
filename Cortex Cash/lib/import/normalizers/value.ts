/**
 * Normalizador de Valores Monetários
 * Agent DATA: Owner
 */

export function normalizeValue(valueStr: string | number): number | null {
  if (typeof valueStr === 'number') return isNaN(valueStr) ? null : valueStr;
  if (!valueStr || typeof valueStr !== 'string') return null;

  // Remove espaços e símbolos de moeda
  let cleaned = valueStr.trim()
    .replace(/\s+/g, '')
    .replace(/^(R\$|USD|EUR|BRL)/, '')
    .trim();

  // Detecta formato (vírgula ou ponto como separador decimal)
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Ambos presentes: determina qual é o separador decimal
    const lastCommaPos = cleaned.lastIndexOf(',');
    const lastDotPos = cleaned.lastIndexOf('.');

    if (lastCommaPos > lastDotPos) {
      // Vírgula é decimal (formato BR: 1.234,56)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Ponto é decimal (formato US: 1,234.56)
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Apenas vírgula: verifica se é decimal ou separador de milhar
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Provavelmente decimal (ex: 1234,56)
      cleaned = cleaned.replace(',', '.');
    } else {
      // Provavelmente separador de milhar (ex: 1,234)
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Apenas ponto: verifica se é decimal ou separador de milhar
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // Múltiplos pontos = separador de milhar (ex: 1.234.567)
      cleaned = cleaned.replace(/\./g, '');
    }
    // Senão, assume que é decimal (formato US: 1234.56)
  }

  // Remove caracteres não numéricos (exceto ponto e sinal negativo)
  cleaned = cleaned.replace(/[^\d.-]/g, '');

  // Converte para número
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}
