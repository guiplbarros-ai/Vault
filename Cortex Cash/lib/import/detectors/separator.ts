/**
 * Detector de Separador CSV
 * Agent DATA: Owner
 *
 * Detecta automaticamente o separador usado em arquivos CSV
 */

export type CSVSeparator = ',' | ';' | '\t' | '|';

/**
 * Detecta o separador mais provável em um arquivo CSV
 * @param sample Amostra do arquivo (primeiras linhas)
 * @returns Separador detectado
 */
export function detectSeparator(sample: string): CSVSeparator {
  const lines = sample.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    // Default para ponto-e-vírgula (padrão brasileiro)
    return ';';
  }

  const separators: CSVSeparator[] = [';', ',', '\t', '|'];
  const scores = new Map<CSVSeparator, number>();

  for (const sep of separators) {
    // Conta ocorrências em cada linha
    const counts = lines.map(line => (line.match(new RegExp(`\\${sep}`, 'g')) || []).length);

    // Verifica consistência (mesmo número de separadores por linha)
    const uniqueCounts = new Set(counts);
    if (uniqueCounts.size === 1 && counts[0] > 0) {
      // Consistente! Score = número de colunas
      scores.set(sep, counts[0]);
    } else if (uniqueCounts.size <= 2 && counts[0] > 0) {
      // Quase consistente (pode ter linhas vazias)
      scores.set(sep, Math.max(...counts) * 0.8);
    } else {
      scores.set(sep, 0);
    }
  }

  // Retorna o separador com maior score
  let bestSep: CSVSeparator = ';';
  let bestScore = 0;

  for (const [sep, score] of scores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestSep = sep;
    }
  }

  return bestSep;
}

/**
 * Valida se o separador detectado parece correto
 * @param sample Amostra do arquivo
 * @param separator Separador a validar
 * @returns true se válido
 */
export function validateSeparator(sample: string, separator: CSVSeparator): boolean {
  const lines = sample.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 2) return false;

  const counts = lines.map(line => (line.match(new RegExp(`\\${separator}`, 'g')) || []).length);
  const uniqueCounts = new Set(counts);

  // Válido se a maioria das linhas tem o mesmo número de separadores
  return uniqueCounts.size <= 2 && counts[0] > 0;
}
