/**
 * Normalizador de Valores Monetários
 * Agent IMPORT: Converte strings de valores em formatos brasileiros/americanos para numbers
 */

/**
 * Normaliza um valor monetário de string para number
 * Suporta formatos brasileiros e americanos
 *
 * @param valueStr String com valor (ex: "R$ 1.234,56", "1234.56", "-R$ 50,00")
 * @param decimalSeparator Separador decimal esperado (',' ou '.')
 * @returns Number ou null se não puder fazer parse
 *
 * @example
 * normalizeValue('R$ 1.234,56') // 1234.56
 * normalizeValue('1234.56') // 1234.56
 * normalizeValue('-R$ 50,00') // -50
 * normalizeValue('(50,00)') // -50 (formato contábil)
 */
export function normalizeValue(
  valueStr: string,
  decimalSeparator?: ',' | '.'
): number | null {
  if (!valueStr || typeof valueStr !== 'string') {
    return null;
  }

  let cleaned = valueStr.trim();

  // Detectar valor negativo em formato contábil (entre parênteses)
  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Detectar valor negativo explícito
  if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1).trim();
  }

  // Remover símbolos de moeda e espaços
  cleaned = cleaned
    .replace(/R\$/g, '')
    .replace(/USD/g, '')
    .replace(/EUR/g, '')
    .replace(/\$/g, '')
    .replace(/€/g, '')
    .replace(/£/g, '')
    .replace(/\s/g, '');

  // Se não há separador especificado, tentar detectar
  if (!decimalSeparator) {
    decimalSeparator = detectDecimalSeparator(cleaned);
  }

  // Normalizar para formato americano (ponto como decimal)
  if (decimalSeparator === ',') {
    // Formato brasileiro: 1.234,56 → 1234.56
    cleaned = cleaned
      .replace(/\./g, '')  // Remove pontos (separadores de milhar)
      .replace(',', '.');  // Converte vírgula em ponto
  } else {
    // Formato americano: 1,234.56 → 1234.56
    cleaned = cleaned.replace(/,/g, '');  // Remove vírgulas (separadores de milhar)
  }

  // Parse final
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    return null;
  }

  return isNegative ? -parsed : parsed;
}

/**
 * Detecta qual separador decimal está sendo usado
 *
 * @param valueStr String com valor
 * @returns ',' para formato brasileiro, '.' para americano
 *
 * @example
 * detectDecimalSeparator('1.234,56') // ','
 * detectDecimalSeparator('1,234.56') // '.'
 * detectDecimalSeparator('1234.56') // '.'
 */
export function detectDecimalSeparator(valueStr: string): ',' | '.' {
  const cleaned = valueStr.trim()
    .replace(/R\$/g, '')
    .replace(/\s/g, '');

  // Se tem vírgula e ponto, o último é o decimal
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Vírgula é o decimal (formato BR)
    return ',';
  }

  // Ponto é o decimal (formato US) ou não há separador decimal
  return '.';
}

/**
 * Formata um número como valor monetário brasileiro
 *
 * @param value Número a formatar
 * @param includeSymbol Se deve incluir R$
 * @returns String formatada (ex: "R$ 1.234,56")
 *
 * @example
 * formatValueBR(1234.56) // "R$ 1.234,56"
 * formatValueBR(1234.56, false) // "1.234,56"
 * formatValueBR(-50) // "R$ -50,00"
 */
export function formatValueBR(value: number, includeSymbol = true): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  const sign = value < 0 ? '-' : '';
  const symbol = includeSymbol ? 'R$ ' : '';

  return `${symbol}${sign}${formatted}`;
}

/**
 * Verifica se uma string parece ser um valor monetário
 *
 * @param str String a verificar
 * @returns true se parece ser um valor monetário
 *
 * @example
 * isMonetaryValue('R$ 123,45') // true
 * isMonetaryValue('123.45') // true
 * isMonetaryValue('abc') // false
 */
export function isMonetaryValue(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Regex que detecta padrões comuns de valores monetários
  const patterns = [
    /^-?R\$?\s*\d+[.,]?\d*$/,           // R$ 123,45 ou R$ 123.45
    /^-?\d+[.,]\d{2}$/,                  // 123,45 ou 123.45
    /^-?\d{1,3}([.,]\d{3})*[.,]\d{2}$/, // 1.234,56 ou 1,234.56
    /^\(-?R\$?\s*\d+[.,]?\d*\)$/,       // (R$ 123,45) formato contábil
  ];

  return patterns.some((pattern) => pattern.test(str.trim()));
}
