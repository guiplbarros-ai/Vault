/**
 * Prompt Cache - Cache de prompts similares para reduzir custos de IA
 * Agent DATA: Owner
 */

interface CachedClassification {
  descricao: string;
  tipo: 'receita' | 'despesa';
  categoria_id: string | null;
  categoria_nome: string | null;
  confianca: number;
  reasoning: string;
  timestamp: Date;
}

// Cache em memória (reset ao reiniciar servidor)
const cache = new Map<string, CachedClassification>();

// Configuração
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias
const SIMILARITY_THRESHOLD = 0.85; // 85% de similaridade para considerar hit
const MAX_CACHE_SIZE = 1000; // Máximo de 1000 entradas

/**
 * Gera chave de cache baseada na descrição normalizada
 */
function generateCacheKey(descricao: string, tipo: 'receita' | 'despesa'): string {
  // Normaliza: lowercase, remove espaços extras, remove números
  const normalized = descricao
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\d+/g, ''); // Remove números (ex: "Uber 123" vira "Uber")

  return `${tipo}:${normalized}`;
}

/**
 * Calcula similaridade entre duas strings (Levenshtein distance simplificado)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Se são exatamente iguais, retorna 1.0
  if (s1 === s2) return 1.0;

  // Calcula palavras em comum
  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));

  const intersection = new Set(Array.from(words1).filter(w => words2.has(w)));
  const union = new Set(Array.from(words1).concat(Array.from(words2)));

  // Índice de Jaccard (palavras em comum / total de palavras únicas)
  return intersection.size / union.size;
}

/**
 * Busca no cache por descrição similar
 */
export function getCachedClassification(
  descricao: string,
  tipo: 'receita' | 'despesa'
): CachedClassification | null {
  const key = generateCacheKey(descricao, tipo);

  // Busca exata
  const exactMatch = cache.get(key);
  if (exactMatch) {
    // Verifica se não expirou
    const age = Date.now() - exactMatch.timestamp.getTime();
    if (age < CACHE_TTL_MS) {
      return exactMatch;
    } else {
      // Remove entrada expirada
      cache.delete(key);
    }
  }

  // Busca por similaridade (fuzzy matching)
  let bestMatch: { entry: CachedClassification; similarity: number } | null = null;

  for (const [cachedKey, entry] of Array.from(cache.entries())) {
    // Verifica tipo
    if (!cachedKey.startsWith(`${tipo}:`)) continue;

    // Verifica se não expirou
    const age = Date.now() - entry.timestamp.getTime();
    if (age >= CACHE_TTL_MS) {
      cache.delete(cachedKey);
      continue;
    }

    // Calcula similaridade
    const similarity = calculateSimilarity(descricao, entry.descricao);

    if (similarity >= SIMILARITY_THRESHOLD) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { entry, similarity };
      }
    }
  }

  return bestMatch ? bestMatch.entry : null;
}

/**
 * Adiciona classificação ao cache
 */
export function setCachedClassification(
  descricao: string,
  tipo: 'receita' | 'despesa',
  categoria_id: string | null,
  categoria_nome: string | null,
  confianca: number,
  reasoning: string
): void {
  const key = generateCacheKey(descricao, tipo);

  // Limpa cache se atingir tamanho máximo (FIFO)
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  cache.set(key, {
    descricao,
    tipo,
    categoria_id,
    categoria_nome,
    confianca,
    reasoning,
    timestamp: new Date(),
  });
}

/**
 * Limpa cache expirado
 */
export function cleanExpiredCache(): number {
  let removed = 0;
  const now = Date.now();

  for (const [key, entry] of Array.from(cache.entries())) {
    const age = now - entry.timestamp.getTime();
    if (age >= CACHE_TTL_MS) {
      cache.delete(key);
      removed++;
    }
  }

  return removed;
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): {
  size: number;
  max_size: number;
  hit_rate: number;
  ttl_ms: number;
} {
  return {
    size: cache.size,
    max_size: MAX_CACHE_SIZE,
    hit_rate: 0, // TODO: implementar contadores de hit/miss
    ttl_ms: CACHE_TTL_MS,
  };
}

/**
 * Limpa todo o cache
 */
export function clearCache(): void {
  cache.clear();
}
