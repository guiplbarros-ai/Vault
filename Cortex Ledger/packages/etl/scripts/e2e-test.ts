#!/usr/bin/env node
/**
 * E2E Test for ETL Pipeline
 *
 * Tests the complete flow:
 * 1. Database connectivity
 * 2. File parsing (CSV + OFX)
 * 3. Import to Supabase
 * 4. Deduplication
 * 5. Data integrity
 *
 * Prerequisites:
 * - Database migrations applied (Agent A)
 * - .env configured with SUPABASE_URL and SUPABASE_SERVICE_KEY
 * - Test account created OR provide user_id to create one
 *
 * Usage:
 *   pnpm --filter @cortex/etl tsx scripts/e2e-test.ts [user_id]
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseCSV } from '../src/parsers/csv-parser';
import { parseOFX } from '../src/parsers/ofx-parser';
import { bradescoCSVTemplate } from '../src/templates/bradesco-csv';
import { computeHashDedupe } from '@cortex/services/dedupe';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

interface TestResult {
	name: string;
	passed: boolean;
	duration: number;
	details?: string;
	error?: string;
}

class E2ETestRunner {
	private supabase;
	private userId: string;
	private contaId: string | null = null;
	private results: TestResult[] = [];

	constructor(userId?: string) {
		if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
			throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
		}

		this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
		this.userId = userId || '00000000-0000-0000-0000-000000000000'; // Test user
	}

	private async runTest(
		name: string,
		testFn: () => Promise<void>
	): Promise<void> {
		const start = Date.now();
		try {
			await testFn();
			const duration = Date.now() - start;
			this.results.push({ name, passed: true, duration });
			console.log(`  ✅ ${name} (${duration}ms)`);
		} catch (error) {
			const duration = Date.now() - start;
			this.results.push({
				name,
				passed: false,
				duration,
				error: error instanceof Error ? error.message : String(error),
			});
			console.log(`  ❌ ${name} (${duration}ms)`);
			console.log(`     Error: ${error instanceof Error ? error.message : error}`);
		}
	}

	async testDatabaseConnectivity(): Promise<void> {
		await this.runTest('Database connectivity', async () => {
			const { data, error } = await this.supabase
				.from('usuarios')
				.select('id')
				.limit(1);

			if (error) {
				throw new Error(`Database connection failed: ${error.message}`);
			}

			if (!data) {
				throw new Error('Database returned no data');
			}
		});
	}

	async testCreateTestAccount(): Promise<void> {
		await this.runTest('Create test account', async () => {
			// Check if user exists, if not create
			const { data: existingUser } = await this.supabase
				.from('usuarios')
				.select('id')
				.eq('id', this.userId)
				.single();

			if (!existingUser) {
				const { error: userError } = await this.supabase
					.from('usuarios')
					.insert({
						id: this.userId,
						email: 'e2e-test@cortex.local',
						nome: 'E2E Test User',
					});

				if (userError) {
					throw new Error(`Failed to create test user: ${userError.message}`);
				}
			}

			// Create test account
			const { data: conta, error } = await this.supabase
				.from('contas')
				.insert({
					usuario_id: this.userId,
					nome: 'Conta Teste E2E',
					tipo: 'corrente',
					instituicao: 'Bradesco',
					saldo_inicial: 10000.0,
				})
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create test account: ${error.message}`);
			}

			if (!conta) {
				throw new Error('Account created but no data returned');
			}

			this.contaId = conta.id;
			console.log(`     Created account: ${this.contaId}`);
		});
	}

	async testCSVParsing(): Promise<void> {
		await this.runTest('CSV parsing (Bradesco sample)', async () => {
			const filePath = join(__dirname, '../examples/bradesco-sample.csv');
			const content = readFileSync(filePath, 'utf-8');

			const result = parseCSV(content, bradescoCSVTemplate);

			if (result.errors.length > 0) {
				throw new Error(`Parsing errors: ${result.errors.join(', ')}`);
			}

			if (result.transactions.length === 0) {
				throw new Error('No transactions parsed');
			}

			// Validate first transaction structure
			const first = result.transactions[0];
			if (!first.data || !first.descricao || first.valor === undefined) {
				throw new Error('Transaction missing required fields');
			}

			// Validate date format (YYYY-MM-DD)
			if (!/^\d{4}-\d{2}-\d{2}$/.test(first.data)) {
				throw new Error(`Invalid date format: ${first.data}`);
			}

			// Validate valor is number
			if (typeof first.valor !== 'number') {
				throw new Error(`Valor is not a number: ${first.valor}`);
			}

			console.log(`     Parsed ${result.transactions.length} transactions`);
		});
	}

	async testOFXParsing(): Promise<void> {
		await this.runTest('OFX parsing (Bradesco sample)', async () => {
			const filePath = join(__dirname, '../examples/bradesco-sample.ofx');
			const content = readFileSync(filePath, 'utf-8');

			const result = await parseOFX(content);

			if (result.errors.length > 0) {
				throw new Error(`Parsing errors: ${result.errors.join(', ')}`);
			}

			if (result.transactions.length === 0) {
				throw new Error('No transactions parsed');
			}

			console.log(`     Parsed ${result.transactions.length} transactions`);
		});
	}

	async testImportToSupabase(): Promise<void> {
		await this.runTest('Import transactions to Supabase', async () => {
			if (!this.contaId) {
				throw new Error('No test account created');
			}

			const filePath = join(__dirname, '../examples/bradesco-sample.csv');
			const content = readFileSync(filePath, 'utf-8');
			const result = parseCSV(content, bradescoCSVTemplate);

			// Compute hashes and prepare for insert
			const transacoesComHash = result.transactions.map((t) => ({
				conta_id: this.contaId!,
				data: t.data,
				descricao: t.descricao,
				valor: t.valor,
				tipo: t.tipo,
				hash_dedupe: computeHashDedupe({
					data: t.data,
					valor: t.valor,
					descricao: t.descricao,
					contaId: this.contaId!,
				}),
			}));

			// Insert in batches
			const BATCH_SIZE = 1000;
			let totalInserted = 0;

			for (let i = 0; i < transacoesComHash.length; i += BATCH_SIZE) {
				const batch = transacoesComHash.slice(i, i + BATCH_SIZE);

				const { data, error } = await this.supabase
					.from('transacoes')
					.upsert(batch, {
						onConflict: 'hash_dedupe',
						ignoreDuplicates: true,
					})
					.select();

				if (error) {
					throw new Error(`Insert failed: ${error.message}`);
				}

				totalInserted += data?.length || 0;
			}

			if (totalInserted !== result.transactions.length) {
				throw new Error(
					`Expected ${result.transactions.length} inserts, got ${totalInserted}`
				);
			}

			console.log(`     Imported ${totalInserted} transactions`);
		});
	}

	async testDeduplication(): Promise<void> {
		await this.runTest('Deduplication (re-import same file)', async () => {
			if (!this.contaId) {
				throw new Error('No test account created');
			}

			const filePath = join(__dirname, '../examples/bradesco-sample.csv');
			const content = readFileSync(filePath, 'utf-8');
			const result = parseCSV(content, bradescoCSVTemplate);

			// Get count before re-import
			const { count: countBefore, error: countError } = await this.supabase
				.from('transacoes')
				.select('*', { count: 'exact', head: true })
				.eq('conta_id', this.contaId);

			if (countError) {
				throw new Error(`Count query failed: ${countError.message}`);
			}

			// Re-import (should be all duplicates)
			const transacoesComHash = result.transactions.map((t) => ({
				conta_id: this.contaId!,
				data: t.data,
				descricao: t.descricao,
				valor: t.valor,
				tipo: t.tipo,
				hash_dedupe: computeHashDedupe({
					data: t.data,
					valor: t.valor,
					descricao: t.descricao,
					contaId: this.contaId!,
				}),
			}));

			const { data, error } = await this.supabase
				.from('transacoes')
				.upsert(transacoesComHash, {
					onConflict: 'hash_dedupe',
					ignoreDuplicates: true,
				})
				.select();

			if (error) {
				throw new Error(`Upsert failed: ${error.message}`);
			}

			// Get count after re-import
			const { count: countAfter, error: countError2 } = await this.supabase
				.from('transacoes')
				.select('*', { count: 'exact', head: true })
				.eq('conta_id', this.contaId);

			if (countError2) {
				throw new Error(`Count query failed: ${countError2.message}`);
			}

			// Count should be the same (no new inserts)
			if (countBefore !== countAfter) {
				throw new Error(
					`Deduplication failed: count changed from ${countBefore} to ${countAfter}`
				);
			}

			console.log(`     All ${result.transactions.length} duplicates detected`);
		});
	}

	async testDataIntegrity(): Promise<void> {
		await this.runTest('Data integrity validation', async () => {
			if (!this.contaId) {
				throw new Error('No test account created');
			}

			// 1. Check for duplicate hashes
			const { data: duplicates, error: dupError } = await this.supabase.rpc(
				'find_duplicate_hashes',
				{ p_conta_id: this.contaId }
			);

			// If RPC doesn't exist, do manual check
			const { data: allTransactions, error: fetchError } = await this.supabase
				.from('transacoes')
				.select('hash_dedupe')
				.eq('conta_id', this.contaId);

			if (fetchError) {
				throw new Error(`Fetch failed: ${fetchError.message}`);
			}

			const hashCounts = new Map<string, number>();
			allTransactions?.forEach((t) => {
				hashCounts.set(t.hash_dedupe, (hashCounts.get(t.hash_dedupe) || 0) + 1);
			});

			const duplicateHashes = Array.from(hashCounts.entries()).filter(
				([_, count]) => count > 1
			);

			if (duplicateHashes.length > 0) {
				throw new Error(
					`Found ${duplicateHashes.length} duplicate hashes in database`
				);
			}

			// 2. Validate all dates are valid ISO format
			const invalidDates = allTransactions?.filter(
				(t: any) => !/^\d{4}-\d{2}-\d{2}$/.test(t.data)
			);

			if (invalidDates && invalidDates.length > 0) {
				throw new Error(`Found ${invalidDates.length} invalid dates`);
			}

			// 3. Validate all valores are numbers (no NaN)
			const { data: transacoesCompletas, error: fetchError2 } =
				await this.supabase
					.from('transacoes')
					.select('valor')
					.eq('conta_id', this.contaId);

			if (fetchError2) {
				throw new Error(`Fetch failed: ${fetchError2.message}`);
			}

			const invalidValores = transacoesCompletas?.filter(
				(t) => typeof t.valor !== 'number' || isNaN(t.valor)
			);

			if (invalidValores && invalidValores.length > 0) {
				throw new Error(`Found ${invalidValores.length} invalid valores`);
			}

			console.log(`     Validated ${allTransactions?.length} transactions`);
		});
	}

	async cleanup(): Promise<void> {
		await this.runTest('Cleanup test data', async () => {
			if (this.contaId) {
				// Delete transactions
				const { error: deleteTransError } = await this.supabase
					.from('transacoes')
					.delete()
					.eq('conta_id', this.contaId);

				if (deleteTransError) {
					console.warn(`Warning: Failed to delete transactions: ${deleteTransError.message}`);
				}

				// Delete account
				const { error: deleteContaError } = await this.supabase
					.from('contas')
					.delete()
					.eq('id', this.contaId);

				if (deleteContaError) {
					console.warn(`Warning: Failed to delete account: ${deleteContaError.message}`);
				}

				console.log(`     Deleted account ${this.contaId} and transactions`);
			}

			// Optionally delete test user (commented out to avoid issues)
			// const { error: deleteUserError } = await this.supabase
			//   .from('usuarios')
			//   .delete()
			//   .eq('id', this.userId);
		});
	}

	printSummary(): void {
		console.log('\n========================================');
		console.log('E2E Test Summary');
		console.log('========================================\n');

		const passed = this.results.filter((r) => r.passed).length;
		const failed = this.results.filter((r) => !r.passed).length;
		const total = this.results.length;

		this.results.forEach((result) => {
			const icon = result.passed ? '✅' : '❌';
			console.log(`${icon} ${result.name} (${result.duration}ms)`);
			if (result.error) {
				console.log(`   Error: ${result.error}`);
			}
		});

		console.log('\n----------------------------------------');
		console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
		console.log('----------------------------------------\n');

		if (failed > 0) {
			console.log('❌ E2E Tests FAILED');
			process.exit(1);
		} else {
			console.log('✅ All E2E Tests PASSED');
			process.exit(0);
		}
	}

	async run(): Promise<void> {
		console.log('🚀 Starting E2E Tests for ETL Pipeline\n');

		// Run tests in sequence
		await this.testDatabaseConnectivity();
		await this.testCreateTestAccount();
		await this.testCSVParsing();
		await this.testOFXParsing();
		await this.testImportToSupabase();
		await this.testDeduplication();
		await this.testDataIntegrity();
		await this.cleanup();

		// Print summary
		this.printSummary();
	}
}

// Main execution
async function main() {
	const userId = process.argv[2]; // Optional: provide user_id as argument

	try {
		const runner = new E2ETestRunner(userId);
		await runner.run();
	} catch (error) {
		console.error('\n❌ E2E Test failed to start:');
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

main();
