/**
 * Detector de Formato de Arquivo
 * Agent IMPORT: Detecta automaticamente o tipo de arquivo (CSV, OFX, Excel)
 */

import type { FileFormat, TipoArquivo } from '@/lib/types';

/**
 * Detecta o formato de um arquivo baseado no conteúdo
 *
 * @param content Conteúdo do arquivo como string
 * @returns Objeto com tipo detectado e metadados
 *
 * @example
 * const format = await detectFormat(fileContent)
 * if (format.tipo === 'csv') {
 *   console.log('Separador:', format.detectado.separador)
 * }
 */
export async function detectFormat(content: string): Promise<FileFormat> {
  if (!content || typeof content !== 'string') {
    return {
      tipo: 'csv',
      confianca: 0,
      detectado: {},
    };
  }

  const trimmed = content.trim();

  // Detectar OFX (tem tags XML específicas)
  if (isOFX(trimmed)) {
    return {
      tipo: 'ofx',
      confianca: 0.95,
      detectado: {
        encoding: detectEncoding(trimmed),
      },
    };
  }

  // Detectar CSV
  if (isCSV(trimmed)) {
    const separador = detectSeparator(trimmed);
    const headers = detectHeaders(trimmed, separador);

    return {
      tipo: 'csv',
      confianca: 0.9,
      detectado: {
        separador,
        headers,
        encoding: detectEncoding(trimmed),
      },
    };
  }

  // Por padrão, assumir CSV
  return {
    tipo: 'csv',
    confianca: 0.5,
    detectado: {
      separador: ',',
      encoding: 'utf-8',
    },
  };
}

/**
 * Verifica se o conteúdo parece ser OFX
 */
function isOFX(content: string): boolean {
  const ofxSignatures = ['<OFX>', 'OFXHEADER:', '<BANKTRANLIST>'];
  return ofxSignatures.some((sig) => content.includes(sig));
}

/**
 * Verifica se o conteúdo parece ser CSV
 */
function isCSV(content: string): boolean {
  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length < 2) return false;

  // Detectar se primeira linha tem separadores
  const firstLine = lines[0];
  const separadores = [',', ';', '\t', '|'];

  return separadores.some((sep) => firstLine.includes(sep));
}

/**
 * Detecta o separador usado no CSV
 * Testa vírgula, ponto-e-vírgula, tab e pipe
 */
export function detectSeparator(content: string): string {
  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length === 0) return ',';

  const firstLine = lines[0];
  const separadores = [';', ',', '\t', '|'];

  // Contar ocorrências de cada separador
  const counts: Record<string, number> = {};

  for (const sep of separadores) {
    counts[sep] = (firstLine.match(new RegExp(`\\${sep}`, 'g')) || []).length;
  }

  // Retornar o separador mais frequente
  let maxCount = 0;
  let bestSep = ',';

  for (const [sep, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestSep = sep;
    }
  }

  return bestSep;
}

/**
 * Detecta se a primeira linha é cabeçalho
 * Retorna os headers se detectados
 */
export function detectHeaders(
  content: string,
  separator: string
): string[] | undefined {
  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length === 0) return undefined;

  const firstLine = lines[0].split(separator).map((h) => h.trim());

  // Heurística: Se a primeira linha tem apenas texto (sem números),
  // provavelmente é header
  const hasOnlyText = firstLine.every((cell) => {
    const cleaned = cell.replace(/"/g, '').trim();
    return isNaN(parseFloat(cleaned));
  });

  if (hasOnlyText && firstLine.length > 1) {
    return firstLine.map((h) => h.replace(/"/g, '').trim());
  }

  return undefined;
}

/**
 * Detecta encoding do arquivo (UTF-8, ISO-8859-1, etc)
 * Retorna string do encoding detectado
 */
function detectEncoding(content: string): string {
  // Verificar BOM (Byte Order Mark) UTF-8
  if (content.charCodeAt(0) === 0xfeff) {
    return 'utf-8-bom';
  }

  // Detectar caracteres especiais brasileiros
  const hasPortugueseChars = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/.test(content);

  if (hasPortugueseChars) {
    // Se tem acentuação correta, provavelmente UTF-8
    return 'utf-8';
  }

  // Detectar caracteres mal-formados (ISO-8859-1 lido como UTF-8)
  const hasMalformedChars = /Ã£|Ã§|Ã³|Ã©/.test(content);

  if (hasMalformedChars) {
    return 'iso-8859-1';
  }

  // Padrão
  return 'utf-8';
}

/**
 * Converte encoding se necessário
 * (No browser, geralmente files já vêm em UTF-8)
 */
export function convertEncoding(
  content: string,
  fromEncoding: string
): string {
  // No browser, encoding já é tratado pelo FileReader
  // Esta função serve como placeholder para conversões futuras se necessário
  return content;
}

/**
 * Valida se o arquivo tem tamanho razoável (< 10MB)
 */
export function validateFileSize(size: number): {
  valid: boolean;
  message?: string;
} {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  if (size > MAX_SIZE) {
    return {
      valid: false,
      message: `Arquivo muito grande (${(size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 10MB`,
    };
  }

  return { valid: true };
}

/**
 * Valida se o arquivo não está vazio
 */
export function validateFileContent(content: string): {
  valid: boolean;
  message?: string;
} {
  if (!content || content.trim().length === 0) {
    return {
      valid: false,
      message: 'Arquivo vazio',
    };
  }

  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length < 2) {
    return {
      valid: false,
      message: 'Arquivo deve ter pelo menos 2 linhas (cabeçalho + dados)',
    };
  }

  return { valid: true };
}
