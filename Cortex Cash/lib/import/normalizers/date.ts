/**
 * Normalizador de Datas
 * Agent IMPORT: Converte strings de data em vários formatos para Date objects
 */

import { parseISO, parse, isValid, format } from 'date-fns';

/**
 * Formatos de data suportados (Brasil)
 */
const DATE_FORMATS = [
  'dd/MM/yyyy',       // 25/12/2024
  'dd-MM-yyyy',       // 25-12-2024
  'yyyy-MM-dd',       // 2024-12-25 (ISO)
  'dd/MM/yy',         // 25/12/24
  'dd-MM-yy',         // 25-12-24
  'yyyy/MM/dd',       // 2024/12/25
  'dd.MM.yyyy',       // 25.12.2024
  'dd.MM.yy',         // 25.12.24
];

/**
 * Normaliza uma string de data para Date object
 *
 * @param dateStr String de data em vários formatos possíveis
 * @param formatHint Formato esperado (opcional, acelera parse)
 * @returns Date object ou null se não puder fazer parse
 *
 * @example
 * normalizeDate('25/12/2024') // Date object
 * normalizeDate('2024-12-25') // Date object
 * normalizeDate('invalid') // null
 */
export function normalizeDate(
  dateStr: string,
  formatHint?: string
): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  // Limpar espaços
  const cleaned = dateStr.trim();

  // Tentar formato ISO primeiro (mais rápido)
  try {
    const isoDate = parseISO(cleaned);
    if (isValid(isoDate)) {
      return isoDate;
    }
  } catch {
    // Continuar para outros formatos
  }

  // Se há um hint de formato, tentar ele primeiro
  if (formatHint) {
    try {
      const hintDate = parse(cleaned, formatHint, new Date());
      if (isValid(hintDate)) {
        return hintDate;
      }
    } catch {
      // Continuar para outros formatos
    }
  }

  // Tentar todos os formatos conhecidos
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      // Tentar próximo formato
      continue;
    }
  }

  // Não conseguiu fazer parse
  return null;
}

/**
 * Detecta qual formato de data está sendo usado
 * Útil para otimizar parse de múltiplas linhas
 *
 * @param dateStr String de data de exemplo
 * @returns Formato detectado ou null
 *
 * @example
 * detectDateFormat('25/12/2024') // 'dd/MM/yyyy'
 * detectDateFormat('2024-12-25') // 'yyyy-MM-dd'
 */
export function detectDateFormat(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const cleaned = dateStr.trim();

  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(cleaned, fmt, new Date());
      if (isValid(parsed)) {
        return fmt;
      }
    } catch {
      continue;
    }
  }

  // Formato ISO
  try {
    const isoDate = parseISO(cleaned);
    if (isValid(isoDate)) {
      return 'ISO';
    }
  } catch {
    // Não conseguiu detectar
  }

  return null;
}

/**
 * Converte Date para string no formato padrão brasileiro
 *
 * @param date Date object
 * @returns String no formato DD/MM/YYYY
 */
export function formatDateBR(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

/**
 * Converte Date para string ISO (para salvar no DB)
 *
 * @param date Date object
 * @returns String no formato ISO YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
