/**
 * Deduplication utilities for Cortex Ledger
 * Implements hash-based deduplication per PRD requirements
 */

import { createHash } from 'crypto';
import { normalizeDescription } from './normalization.js';

/**
 * Transaction data for deduplication
 */
export interface TransacaoForDedupe {
	data: string; // ISO date format YYYY-MM-DD
	valor: number; // Decimal value
	descricao: string; // Raw description
	contaId: string; // UUID of the account
}

/**
 * Computes the deduplication hash for a transaction
 * Hash = SHA256(date|value|normalized_description|account_id)
 *
 * This hash is used to detect exact duplicates across imports.
 * The server-side trigger will also compute this to ensure consistency.
 *
 * @param transacao - Transaction data
 * @returns SHA256 hex hash
 *
 * @example
 * computeHashDedupe({
 *   data: '2024-10-25',
 *   valor: -123.45,
 *   descricao: 'UBER * TRIP HELP',
 *   contaId: 'uuid-here'
 * }) // returns hex hash
 */
export function computeHashDedupe(transacao: TransacaoForDedupe): string {
	const { data, valor, descricao, contaId } = transacao;

	// Normalize the description for consistent hashing
	const descNormalizada = normalizeDescription(descricao);

	// Build the composite key: date|value|normalized_description|account_id
	const compositeKey = `${data}|${valor}|${descNormalizada}|${contaId}`;

	// Compute SHA256 hash
	const hash = createHash('sha256').update(compositeKey, 'utf8').digest('hex');

	return hash;
}

/**
 * Checks if a transaction is a duplicate based on its hash
 *
 * @param hash - Transaction hash
 * @param existingHashes - Set of existing hashes in the database
 * @returns true if duplicate, false otherwise
 */
export function isDuplicate(hash: string, existingHashes: Set<string>): boolean {
	return existingHashes.has(hash);
}

/**
 * Groups transactions by their hash to find duplicates
 *
 * @param transacoes - Array of transactions with computed hashes
 * @returns Map of hash -> array of transactions with that hash
 */
export function groupByHash(
	transacoes: Array<TransacaoForDedupe & { hash: string }>
): Map<string, Array<TransacaoForDedupe & { hash: string }>> {
	const groups = new Map<
		string,
		Array<TransacaoForDedupe & { hash: string }>
	>();

	for (const t of transacoes) {
		const existing = groups.get(t.hash) || [];
		existing.push(t);
		groups.set(t.hash, existing);
	}

	return groups;
}

/**
 * Identifies duplicates within a batch of transactions
 *
 * @param transacoes - Array of transactions
 * @returns Object with unique transactions and duplicates
 */
export function identifyDuplicates(transacoes: TransacaoForDedupe[]): {
	unique: Array<TransacaoForDedupe & { hash: string }>;
	duplicates: Array<TransacaoForDedupe & { hash: string }>;
} {
	const withHashes = transacoes.map((t) => ({
		...t,
		hash: computeHashDedupe(t),
	}));

	const groups = groupByHash(withHashes);
	const unique: Array<TransacaoForDedupe & { hash: string }> = [];
	const duplicates: Array<TransacaoForDedupe & { hash: string }> = [];

	for (const [, group] of groups) {
		if (group.length === 1) {
			unique.push(group[0]);
		} else {
			// First occurrence is unique, rest are duplicates
			unique.push(group[0]);
			duplicates.push(...group.slice(1));
		}
	}

	return { unique, duplicates };
}

/**
 * Batch compute hashes for multiple transactions
 *
 * @param transacoes - Array of transactions
 * @returns Array of transactions with computed hashes
 */
export function batchComputeHashes(
	transacoes: TransacaoForDedupe[]
): Array<TransacaoForDedupe & { hash: string }> {
	return transacoes.map((t) => ({
		...t,
		hash: computeHashDedupe(t),
	}));
}
