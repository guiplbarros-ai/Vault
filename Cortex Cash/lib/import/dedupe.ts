/**
 * Sistema de Deduplicação
 * Agent IMPORT: Detecta e remove transações duplicadas usando hash SHA-256
 */

import type { ParsedTransacao, DedupeResult } from '@/lib/types';
import { getDB } from '@/lib/db/client';
import { normalizeDate } from './normalizers/date';

/**
 * Gera hash SHA-256 de uma transação
 * Hash baseado em: data + descricao + valor
 *
 * @param transacao Transação a hashear
 * @returns String hexadecimal do hash
 *
 * @example
 * const hash = await generateHash({
 *   data: new Date('2024-01-15'),
 *   descricao: 'NETFLIX',
 *   valor: 39.90
 * })
 * // '3a5f7c...'
 */
export async function generateHash(
  transacao: Pick<ParsedTransacao, 'data' | 'descricao' | 'valor'>
): Promise<string> {
  // Criar string canônica para hash
  const dataISO = transacao.data instanceof Date
    ? transacao.data.toISOString().split('T')[0]
    : transacao.data;
  const canonical = [
    dataISO,
    transacao.descricao.trim().toUpperCase(),
    transacao.valor.toFixed(2),
  ].join('|');

  // Gerar hash SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Converter para hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Adiciona hashes a um array de transações parsed
 *
 * @param transacoes Array de transações sem hash
 * @returns Array de transações com hash
 */
export async function addHashes(
  transacoes: ParsedTransacao[]
): Promise<ParsedTransacao[]> {
  const withHashes = await Promise.all(
    transacoes.map(async (t) => ({
      ...t,
      hash: await generateHash(t),
    }))
  );

  return withHashes;
}

/**
 * Remove duplicatas de um array de transações
 * Mantém apenas a primeira ocorrência de cada hash
 *
 * @param transacoes Array de transações (com hash)
 * @returns Array sem duplicatas
 */
export function removeDuplicatesInArray(
  transacoes: ParsedTransacao[]
): ParsedTransacao[] {
  const seen = new Set<string>();
  const unique: ParsedTransacao[] = [];

  for (const transacao of transacoes) {
    if (!transacao.hash) continue;

    if (!seen.has(transacao.hash)) {
      seen.add(transacao.hash);
      unique.push(transacao);
    }
  }

  return unique;
}

/**
 * Compara transações com o banco de dados para detectar duplicatas
 *
 * @param contaId ID da conta onde serão importadas
 * @param transacoes Transações a importar (com hash)
 * @returns Resultado da deduplicação
 *
 * @example
 * const result = await deduplicateTransactions('conta-123', parsed)
 * console.log(result.duplicatas) // 5
 * console.log(result.novas) // 20
 */
export async function deduplicateTransactions(
  contaId: string,
  transacoes: ParsedTransacao[]
): Promise<DedupeResult> {
  // Adicionar hashes se ainda não tiverem
  const withHashes = await addHashes(transacoes);

  // Remover duplicatas dentro do próprio array primeiro
  const uniqueInArray = removeDuplicatesInArray(withHashes);

  // Buscar hashes existentes no banco
  const db = getDB();
  const existentes = await db.transacoes
    .where('conta_id')
    .equals(contaId)
    .toArray();

  const existingHashes = new Set(
    existentes.map((t) => t.hash).filter((h): h is string => !!h)
  );

  // Separar novas vs duplicadas
  const transacoes_unicas: ParsedTransacao[] = [];
  const transacoes_duplicadas: ParsedTransacao[] = [];

  for (const transacao of uniqueInArray) {
    if (!transacao.hash) {
      // Sem hash, considerar como nova (improvável, mas safety)
      transacoes_unicas.push(transacao);
      continue;
    }

    if (existingHashes.has(transacao.hash)) {
      transacoes_duplicadas.push(transacao);
    } else {
      transacoes_unicas.push(transacao);
    }
  }

  return {
    total: transacoes.length,
    duplicatas: transacoes_duplicadas.length,
    novas: transacoes_unicas.length,
    transacoes_unicas,
    transacoes_duplicadas,
  };
}

/**
 * Verifica se uma transação específica já existe no banco
 *
 * @param contaId ID da conta
 * @param transacao Transação a verificar
 * @returns true se já existe
 */
export async function isDuplicate(
  contaId: string,
  transacao: Pick<ParsedTransacao, 'data' | 'descricao' | 'valor'>
): Promise<boolean> {
  const hash = await generateHash(transacao);

  const db = getDB();
  const count = await db.transacoes
    .where(['conta_id', 'hash'])
    .equals([contaId, hash])
    .count();

  return count > 0;
}

/**
 * Calcula taxa de duplicação entre duas listas
 *
 * @param original Lista original
 * @param afterDedupe Lista após dedupe
 * @returns Percentual de duplicação (0-100)
 */
export function calculateDuplicationRate(
  original: number,
  afterDedupe: number
): number {
  if (original === 0) return 0;
  const duplicates = original - afterDedupe;
  return (duplicates / original) * 100;
}

/**
 * Agrupa duplicatas por hash para análise
 *
 * @param transacoes Lista de transações
 * @returns Map de hash -> array de transações
 */
export function groupByHash(
  transacoes: ParsedTransacao[]
): Map<string, ParsedTransacao[]> {
  const groups = new Map<string, ParsedTransacao[]>();

  for (const transacao of transacoes) {
    if (!transacao.hash) continue;

    const existing = groups.get(transacao.hash) || [];
    existing.push(transacao);
    groups.set(transacao.hash, existing);
  }

  return groups;
}

/**
 * Retorna apenas hashes duplicados (que aparecem mais de uma vez)
 *
 * @param transacoes Lista de transações
 * @returns Array de hashes duplicados
 */
export function findDuplicateHashes(transacoes: ParsedTransacao[]): string[] {
  const groups = groupByHash(transacoes);
  const duplicates: string[] = [];

  for (const [hash, group] of groups.entries()) {
    if (group.length > 1) {
      duplicates.push(hash);
    }
  }

  return duplicates;
}
