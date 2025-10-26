#!/usr/bin/env node
/**
 * CLI tool for importing transactions to Supabase
 * Usage: pnpm --filter @cortex/etl dev <file> <conta_id> [template_key]
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { parseCSV } from '../parsers/csv-parser.js';
import { parseOFX } from '../parsers/ofx-parser.js';
import { getTemplate } from '../templates/index.js';
import { computeHashDedupe } from '@cortex/services';
import type { ParsedTransaction, ImportSummary } from '../types.js';

// Load environment variables
config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const USER_ACCESS_TOKEN = process.env.USER_ACCESS_TOKEN; // For testing

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set');
	process.exit(1);
}

/**
 * Main import function
 */
async function importFile(
	filePath: string,
	contaId: string,
	templateKey?: string
): Promise<ImportSummary> {
	const startTime = Date.now();

	try {
		// Read file
		console.log(`\n📂 Reading file: ${filePath}`);
		const fileContent = readFileSync(filePath, 'utf-8');

		// Detect file type
		const isOFX = filePath.toLowerCase().endsWith('.ofx');
		const template = templateKey ? getTemplate(templateKey) : undefined;

		console.log(
			`📝 File type: ${isOFX ? 'OFX' : 'CSV'}${template ? ` (using template: ${templateKey})` : ''}`
		);

		// Parse file
		console.log('🔍 Parsing transactions...');
		const parseResult = isOFX
			? await parseOFX(fileContent)
			: parseCSV(fileContent, template);

		console.log(`\n✅ Parsed ${parseResult.transactions.length} transactions`);
		console.log(`⚠️  Skipped ${parseResult.skipped} invalid lines`);

		if (parseResult.errors.length > 0) {
			console.log(
				`\n❌ Errors encountered (${parseResult.errors.length}):`
			);
			parseResult.errors.slice(0, 5).forEach((err) => console.log(`   ${err}`));
			if (parseResult.errors.length > 5) {
				console.log(
					`   ... and ${parseResult.errors.length - 5} more errors`
				);
			}
		}

		// Initialize Supabase client
		const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			global: {
				headers: USER_ACCESS_TOKEN
					? { Authorization: `Bearer ${USER_ACCESS_TOKEN}` }
					: {},
			},
		});

		// Get current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			throw new Error(
				`Authentication required. Set USER_ACCESS_TOKEN in .env`
			);
		}

		console.log(`\n👤 User: ${user.email || user.id}`);

		// Compute hashes and prepare for upsert
		console.log('\n🔐 Computing deduplication hashes...');
		const transactionsWithHash = parseResult.transactions.map((t) => {
			const hash = computeHashDedupe({
				data: t.data,
				valor: t.valor,
				descricao: t.descricao,
				contaId,
			});

			return {
				user_id: user.id,
				conta_id: contaId,
				data: t.data,
				descricao: t.descricao,
				valor: t.valor.toString(),
				tipo: t.tipo || 'debito',
				hash_dedupe: hash,
				id_externo: t.idExterno,
				saldo_apos: t.saldoApos?.toString(),
				parcela_n: t.parcelaN,
				parcelas_total: t.parcelasTotal,
				valor_original: t.valorOriginal?.toString(),
				moeda_original: t.moedaOriginal,
			};
		});

		// Batch upsert (1000 rows at a time per PRD requirements)
		const batchSize = 1000;
		let imported = 0;
		let duplicates = 0;

		console.log(
			`\n📤 Upserting ${transactionsWithHash.length} transactions in batches of ${batchSize}...`
		);

		for (let i = 0; i < transactionsWithHash.length; i += batchSize) {
			const batch = transactionsWithHash.slice(i, i + batchSize);

			const { data, error } = await supabase
				.from('transacao')
				.upsert(batch, {
					onConflict: 'user_id,hash_dedupe',
					ignoreDuplicates: true,
				})
				.select('id');

			if (error) {
				console.error(`\n❌ Batch upsert error:`, error);
				throw error;
			}

			const insertedCount = data?.length || 0;
			imported += insertedCount;
			duplicates += batch.length - insertedCount;

			console.log(
				`   Batch ${Math.floor(i / batchSize) + 1}: ${insertedCount} inserted, ${batch.length - insertedCount} duplicates`
			);
		}

		const timeMs = Date.now() - startTime;

		const summary: ImportSummary = {
			imported,
			skipped: parseResult.skipped,
			duplicates,
			errors: parseResult.errors,
			timeMs,
		};

		console.log('\n✅ Import complete!');
		console.log(`   Imported: ${summary.imported}`);
		console.log(`   Duplicates: ${summary.duplicates}`);
		console.log(`   Skipped: ${summary.skipped}`);
		console.log(`   Time: ${(summary.timeMs / 1000).toFixed(2)}s`);

		return summary;
	} catch (error) {
		console.error('\n❌ Fatal error:', error);
		throw error;
	}
}

/**
 * CLI entry point
 */
async function main() {
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.log('Usage: import <file> <conta_id> [template_key]');
		console.log('\nExample:');
		console.log(
			'  pnpm dev extrato.csv uuid-conta-id bradesco-csv'
		);
		console.log('  pnpm dev extrato.ofx uuid-conta-id');
		console.log('\nAvailable templates:');
		console.log('  - bradesco-csv');
		console.log('  - bradesco-ofx');
		console.log('  - aeternum-csv');
		console.log('  - amex-csv');
		process.exit(1);
	}

	const [filePath, contaId, templateKey] = args;

	try {
		await importFile(filePath, contaId, templateKey);
		process.exit(0);
	} catch (error) {
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { importFile };
