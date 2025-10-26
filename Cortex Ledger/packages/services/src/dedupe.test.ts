/**
 * Tests for deduplication utilities
 */

import { describe, it, expect } from 'vitest';
import {
	computeHashDedupe,
	isDuplicate,
	identifyDuplicates,
	batchComputeHashes,
} from './dedupe';
import type { TransacaoForDedupe } from './dedupe';

describe('computeHashDedupe', () => {
	it('should compute consistent hash for same transaction', () => {
		const txn: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -123.45,
			descricao: 'UBER * TRIP HELP',
			contaId: 'uuid-1234',
		};

		const hash1 = computeHashDedupe(txn);
		const hash2 = computeHashDedupe(txn);

		expect(hash1).toBe(hash2);
		expect(hash1).toHaveLength(64); // SHA256 = 64 hex chars
	});

	it('should produce different hashes for different dates', () => {
		const txn1: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -123.45,
			descricao: 'UBER * TRIP HELP',
			contaId: 'uuid-1234',
		};

		const txn2: TransacaoForDedupe = {
			...txn1,
			data: '2024-10-26',
		};

		expect(computeHashDedupe(txn1)).not.toBe(computeHashDedupe(txn2));
	});

	it('should produce different hashes for different values', () => {
		const txn1: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -123.45,
			descricao: 'UBER * TRIP HELP',
			contaId: 'uuid-1234',
		};

		const txn2: TransacaoForDedupe = {
			...txn1,
			valor: -123.46,
		};

		expect(computeHashDedupe(txn1)).not.toBe(computeHashDedupe(txn2));
	});

	it('should produce different hashes for different accounts', () => {
		const txn1: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -123.45,
			descricao: 'UBER * TRIP HELP',
			contaId: 'uuid-1234',
		};

		const txn2: TransacaoForDedupe = {
			...txn1,
			contaId: 'uuid-5678',
		};

		expect(computeHashDedupe(txn1)).not.toBe(computeHashDedupe(txn2));
	});

	it('should normalize description before hashing', () => {
		const txn1: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -123.45,
			descricao: '  uber   *  trip   help  ',
			contaId: 'uuid-1234',
		};

		const txn2: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -123.45,
			descricao: 'UBER * TRIP HELP',
			contaId: 'uuid-1234',
		};

		// Should produce same hash because description is normalized
		expect(computeHashDedupe(txn1)).toBe(computeHashDedupe(txn2));
	});

	it('should handle accents in description', () => {
		const txn1: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -50.0,
			descricao: 'Padaria São José',
			contaId: 'uuid-1234',
		};

		const txn2: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -50.0,
			descricao: 'PADARIA SAO JOSE',
			contaId: 'uuid-1234',
		};

		// Should be same after normalization (accent removal)
		expect(computeHashDedupe(txn1)).toBe(computeHashDedupe(txn2));
	});

	it('should be deterministic (same input always same output)', () => {
		const txn: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -123.45,
			descricao: 'UBER TRIP',
			contaId: 'uuid-1234',
		};

		const hashes = Array(10)
			.fill(null)
			.map(() => computeHashDedupe(txn));

		// All hashes should be identical
		expect(new Set(hashes).size).toBe(1);
	});
});

describe('isDuplicate', () => {
	it('should return true if hash exists in set', () => {
		const existingHashes = new Set(['hash1', 'hash2', 'hash3']);

		expect(isDuplicate('hash1', existingHashes)).toBe(true);
		expect(isDuplicate('hash2', existingHashes)).toBe(true);
	});

	it('should return false if hash does not exist in set', () => {
		const existingHashes = new Set(['hash1', 'hash2', 'hash3']);

		expect(isDuplicate('hash4', existingHashes)).toBe(false);
		expect(isDuplicate('new-hash', existingHashes)).toBe(false);
	});

	it('should work with empty set', () => {
		const existingHashes = new Set<string>();

		expect(isDuplicate('any-hash', existingHashes)).toBe(false);
	});
});

describe('identifyDuplicates', () => {
	it('should separate unique from duplicates within batch', () => {
		const transactions: TransacaoForDedupe[] = [
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'UBER TRIP',
				contaId: 'uuid-1',
			},
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'UBER TRIP',
				contaId: 'uuid-1',
			}, // Duplicate of first
			{
				data: '2024-10-26',
				valor: -50,
				descricao: 'IFOOD',
				contaId: 'uuid-1',
			},
		];

		const result = identifyDuplicates(transactions);

		expect(result.unique).toHaveLength(2); // First UBER + IFOOD
		expect(result.duplicates).toHaveLength(1); // Second UBER
	});

	it('should handle all unique transactions', () => {
		const transactions: TransacaoForDedupe[] = [
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'UBER',
				contaId: 'uuid-1',
			},
			{
				data: '2024-10-26',
				valor: -50,
				descricao: 'IFOOD',
				contaId: 'uuid-1',
			},
			{
				data: '2024-10-27',
				valor: -20,
				descricao: 'SPOTIFY',
				contaId: 'uuid-1',
			},
		];

		const result = identifyDuplicates(transactions);

		expect(result.unique).toHaveLength(3);
		expect(result.duplicates).toHaveLength(0);
	});

	it('should handle multiple duplicates of same transaction', () => {
		const transactions: TransacaoForDedupe[] = [
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'UBER',
				contaId: 'uuid-1',
			},
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'UBER',
				contaId: 'uuid-1',
			}, // Dup 1
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'UBER',
				contaId: 'uuid-1',
			}, // Dup 2
		];

		const result = identifyDuplicates(transactions);

		expect(result.unique).toHaveLength(1); // First one
		expect(result.duplicates).toHaveLength(2); // Other two
	});

	it('should handle empty array', () => {
		const result = identifyDuplicates([]);

		expect(result.unique).toHaveLength(0);
		expect(result.duplicates).toHaveLength(0);
	});

	it('should keep first occurrence as unique', () => {
		const transactions: TransacaoForDedupe[] = [
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'FIRST',
				contaId: 'uuid-1',
			},
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'FIRST',
				contaId: 'uuid-1',
			},
		];

		const result = identifyDuplicates(transactions);

		// First occurrence should be in unique
		expect(result.unique[0].descricao).toContain('FIRST');
		expect(result.duplicates[0].descricao).toContain('FIRST');
	});
});

describe('batchComputeHashes', () => {
	it('should compute hashes for all transactions', () => {
		const transactions: TransacaoForDedupe[] = [
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'UBER',
				contaId: 'uuid-1',
			},
			{
				data: '2024-10-26',
				valor: -50,
				descricao: 'IFOOD',
				contaId: 'uuid-1',
			},
		];

		const result = batchComputeHashes(transactions);

		expect(result).toHaveLength(2);
		expect(result[0]).toHaveProperty('hash');
		expect(result[1]).toHaveProperty('hash');
		expect(result[0].hash).toHaveLength(64);
		expect(result[1].hash).toHaveLength(64);
	});

	it('should preserve original transaction data', () => {
		const transactions: TransacaoForDedupe[] = [
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'UBER TRIP',
				contaId: 'uuid-1234',
			},
		];

		const result = batchComputeHashes(transactions);

		expect(result[0].data).toBe('2024-10-25');
		expect(result[0].valor).toBe(-100);
		expect(result[0].descricao).toBe('UBER TRIP');
		expect(result[0].contaId).toBe('uuid-1234');
	});

	it('should handle empty array', () => {
		const result = batchComputeHashes([]);

		expect(result).toHaveLength(0);
	});

	it('should produce unique hashes for unique transactions', () => {
		const transactions: TransacaoForDedupe[] = [
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'TXN1',
				contaId: 'uuid-1',
			},
			{
				data: '2024-10-26',
				valor: -200,
				descricao: 'TXN2',
				contaId: 'uuid-1',
			},
			{
				data: '2024-10-27',
				valor: -300,
				descricao: 'TXN3',
				contaId: 'uuid-1',
			},
		];

		const result = batchComputeHashes(transactions);
		const hashes = result.map((t) => t.hash);

		// All hashes should be unique
		expect(new Set(hashes).size).toBe(3);
	});

	it('should produce same hash for duplicate transactions', () => {
		const transactions: TransacaoForDedupe[] = [
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'SAME',
				contaId: 'uuid-1',
			},
			{
				data: '2024-10-25',
				valor: -100,
				descricao: 'SAME',
				contaId: 'uuid-1',
			},
		];

		const result = batchComputeHashes(transactions);

		expect(result[0].hash).toBe(result[1].hash);
	});
});

describe('Real-world dedupe scenarios', () => {
	it('should detect duplicate from re-import', () => {
		// Simulate importing same file twice
		const import1: TransacaoForDedupe[] = [
			{
				data: '2024-08-01',
				valor: -1234.56,
				descricao: 'COMPRA CARTAO CREDITO',
				contaId: 'conta-bradesco',
			},
			{
				data: '2024-08-02',
				valor: 500.0,
				descricao: 'PIX RECEBIDO',
				contaId: 'conta-bradesco',
			},
		];

		const import2 = [...import1]; // Same data

		const hashes1 = batchComputeHashes(import1);
		const hashes2 = batchComputeHashes(import2);

		// All hashes should match
		expect(hashes1[0].hash).toBe(hashes2[0].hash);
		expect(hashes1[1].hash).toBe(hashes2[1].hash);
	});

	it('should NOT consider transactions on different accounts as duplicates', () => {
		const txn1: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -50.0,
			descricao: 'UBER TRIP',
			contaId: 'conta-a',
		};

		const txn2: TransacaoForDedupe = {
			data: '2024-10-25',
			valor: -50.0,
			descricao: 'UBER TRIP',
			contaId: 'conta-b',
		};

		// Same date, value, description but different account
		expect(computeHashDedupe(txn1)).not.toBe(computeHashDedupe(txn2));
	});

	it('should handle description variations (whitespace, case, accents)', () => {
		const variations: TransacaoForDedupe[] = [
			{
				data: '2024-10-25',
				valor: -50,
				descricao: 'uber * trip help',
				contaId: 'conta-1',
			},
			{
				data: '2024-10-25',
				valor: -50,
				descricao: 'UBER * TRIP HELP',
				contaId: 'conta-1',
			},
			{
				data: '2024-10-25',
				valor: -50,
				descricao: '  uber   *  trip   help  ',
				contaId: 'conta-1',
			},
		];

		const hashes = batchComputeHashes(variations);

		// All should produce same hash (normalized)
		expect(hashes[0].hash).toBe(hashes[1].hash);
		expect(hashes[1].hash).toBe(hashes[2].hash);
	});
});
