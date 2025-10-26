/**
 * CSV Parser for Cortex Ledger
 * Tolerant parser with automatic header detection and separator inference
 */

import Papa from 'papaparse';
import {
	normalizeDate,
	normalizeValue,
	normalizeDescription,
	computeValorBancario,
	inferirTipo,
	detectSeparator,
	detectHeaderRow,
} from '@cortex/services';
import type {
	ParsedTransaction,
	ParseResult,
	TemplateMapping,
} from '../types.js';

/**
 * Parses a CSV file with automatic detection or template-based mapping
 *
 * @param fileContent - Raw file content as string
 * @param template - Optional template mapping
 * @returns Parse result with transactions and metadata
 */
export function parseCSV(
	fileContent: string,
	template?: TemplateMapping
): ParseResult {
	const startTime = Date.now();
	const transactions: ParsedTransaction[] = [];
	const errors: string[] = [];
	let skipped = 0;

	try {
		const lines = fileContent.split('\n').filter((line) => line.trim());
		const totalLines = lines.length;

		// Detect or use template separator
		const separator = template?.sep || detectSeparator(lines[0]);

		// Detect or use template header index
		const headerIdx = template?.headerIdx ?? detectHeaderRow(lines, separator);

		if (headerIdx === -1) {
			errors.push('Could not detect header row. File may be invalid.');
			return {
				transactions: [],
				skipped: totalLines,
				errors,
				metadata: { totalLines, separator },
			};
		}

		// Parse CSV using PapaParse
		const parseResult = Papa.parse(fileContent, {
			delimiter: separator,
			header: false,
			skipEmptyLines: true,
			encoding: template?.encoding || 'UTF-8',
		});

		if (parseResult.errors.length > 0) {
			errors.push(
				...parseResult.errors.map((e) => `Line ${e.row}: ${e.message}`)
			);
		}

		// Get header row
		const headerRow = (parseResult.data[headerIdx] as string[]).map((h) =>
			h.trim().toUpperCase()
		);

		// Process data rows (skip header and everything before it)
		for (let i = headerIdx + 1; i < parseResult.data.length; i++) {
			const row = parseResult.data[i] as string[];

			// Skip rows with too few fields
			if (row.length < 3 || row.every((cell) => !cell || !cell.trim())) {
				skipped++;
				continue;
			}

			try {
				const transaction = parseRow(row, headerRow, template);
				if (transaction) {
					transactions.push(transaction);
				} else {
					skipped++;
				}
			} catch (error) {
				skipped++;
				errors.push(
					`Line ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`
				);
			}
		}

		return {
			transactions,
			skipped,
			errors,
			metadata: {
				separator,
				headerIdx,
				encoding: template?.encoding || 'UTF-8',
				totalLines,
			},
		};
	} catch (error) {
		errors.push(
			`Fatal parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
		return {
			transactions: [],
			skipped: fileContent.split('\n').length,
			errors,
			metadata: { totalLines: fileContent.split('\n').length },
		};
	}
}

/**
 * Parses a single CSV row into a transaction
 */
function parseRow(
	row: string[],
	headers: string[],
	template?: TemplateMapping
): ParsedTransaction | null {
	const rowData: Record<string, string> = {};

	// Map row to header keys
	headers.forEach((header, idx) => {
		rowData[header] = row[idx]?.trim() || '';
	});

	// Find columns (either from template or by header name matching)
	const dataCol = findColumn(
		rowData,
		template?.columnMapping.data,
		'DATA',
		'DATE'
	);
	const descricaoCol = findColumn(
		rowData,
		template?.columnMapping.descricao,
		'HISTORICO',
		'DESCRICAO',
		'DESCRIPTION',
		'MEMO'
	);
	const valorCol = findColumn(
		rowData,
		template?.columnMapping.valor,
		'VALOR',
		'AMOUNT'
	);
	const creditoCol = findColumn(
		rowData,
		template?.columnMapping.credito,
		'CREDITO',
		'CREDIT'
	);
	const debitoCol = findColumn(
		rowData,
		template?.columnMapping.debito,
		'DEBITO',
		'DEBIT'
	);
	const saldoCol = findColumn(
		rowData,
		template?.columnMapping.saldo,
		'SALDO',
		'BALANCE'
	);
	const documentoCol = findColumn(
		rowData,
		template?.columnMapping.documento,
		'DOCTO',
		'DOCUMENTO',
		'DOC'
	);
	const valorOriginalCol = findColumn(
		rowData,
		template?.columnMapping.valorOriginal,
		'VALOR(US$)',
		'VALOR(USD)',
		'ORIGINAL AMOUNT'
	);
	const moedaOriginalCol = findColumn(
		rowData,
		template?.columnMapping.moedaOriginal,
		'MOEDA',
		'CURRENCY'
	);

	// Parse date (required)
	const dataStr = dataCol || '';
	const data = normalizeDate(dataStr, true);
	if (!data) return null; // Skip if no valid date

	// Parse description (required)
	const descricao = descricaoCol || '';
	if (!descricao.trim()) return null; // Skip if no description

	// Parse value
	let valor = 0;
	if (valorCol) {
		// Single value column (cards typically)
		const parsedValor = normalizeValue(valorCol);
		if (parsedValor === null) return null;
		valor = parsedValor;
	} else if (creditoCol || debitoCol) {
		// Bank account with credit/debit columns
		const credito = normalizeValue(creditoCol || '0') || 0;
		const debito = normalizeValue(debitoCol || '0') || 0;
		valor = computeValorBancario(credito, debito);
	} else {
		return null; // Skip if no value information
	}

	// Build transaction
	const transaction: ParsedTransaction = {
		data,
		descricao: normalizeDescription(descricao),
		valor,
		tipo: inferirTipo(descricao, valor),
	};

	// Optional fields
	if (saldoCol) {
		const saldo = normalizeValue(saldoCol);
		if (saldo !== null) transaction.saldoApos = saldo;
	}

	if (documentoCol) {
		transaction.documento = documentoCol;
	}

	if (valorOriginalCol) {
		const valorOrig = normalizeValue(valorOriginalCol);
		if (valorOrig !== null) {
			transaction.valorOriginal = valorOrig;
			transaction.moedaOriginal =
				moedaOriginalCol || inferCurrencyFromColumn(headers);
		}
	}

	return transaction;
}

/**
 * Finds a column value by matching header names or template mapping
 */
function findColumn(
	rowData: Record<string, string>,
	templateCol: string | undefined,
	...possibleNames: string[]
): string | null {
	// If template specifies exact column, use it
	if (templateCol && rowData[templateCol.toUpperCase()]) {
		return rowData[templateCol.toUpperCase()];
	}

	// Otherwise, try to find by common names
	for (const name of possibleNames) {
		const value = rowData[name];
		if (value !== undefined && value !== null) return value;
	}

	return null;
}

/**
 * Infers currency from column headers (e.g., "VALOR(US$)" -> "USD")
 */
function inferCurrencyFromColumn(headers: string[]): string {
	for (const header of headers) {
		if (header.includes('USD') || header.includes('US$')) return 'USD';
		if (header.includes('EUR')) return 'EUR';
		if (header.includes('GBP')) return 'GBP';
	}
	return 'USD'; // Default fallback
}
