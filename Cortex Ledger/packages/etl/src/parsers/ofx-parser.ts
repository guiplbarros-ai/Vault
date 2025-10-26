/**
 * OFX Parser for Cortex Ledger
 * Parses OFX (Open Financial Exchange) format files
 */

import { parseString } from 'xml2js';
import { promisify } from 'util';
import {
	normalizeDate,
	normalizeDescription,
	inferirTipo,
} from '@cortex/services';
import type { ParsedTransaction, ParseResult } from '../types.js';

const parseXml = promisify(parseString);

/**
 * OFX Transaction type
 */
interface OFXTransaction {
	TRNTYPE: string[];
	DTPOSTED: string[];
	TRNAMT: string[];
	FITID: string[];
	NAME?: string[];
	MEMO?: string[];
	CHECKNUM?: string[];
}

/**
 * Parses an OFX file
 *
 * @param fileContent - Raw OFX file content
 * @returns Parse result with transactions and metadata
 */
export async function parseOFX(fileContent: string): Promise<ParseResult> {
	const transactions: ParsedTransaction[] = [];
	const errors: string[] = [];
	let skipped = 0;

	try {
		// OFX files can have SGML-style headers; clean them
		const cleaned = cleanOFXContent(fileContent);

		// Convert to XML and parse
		const xmlContent = ofxToXml(cleaned);
		const parsed = await parseXml(xmlContent, {
			trim: true,
			explicitArray: true,
		});

		// Navigate to transaction list
		const ofx = parsed?.OFX;
		if (!ofx) {
			errors.push('Invalid OFX structure: missing OFX root');
			return {
				transactions: [],
				skipped: 0,
				errors,
				metadata: { totalLines: 0 },
			};
		}

		// Try bank statement first
		const bankStmt =
			ofx.BANKMSGSRSV1?.[0]?.STMTTRNRS?.[0]?.STMTRS?.[0]?.BANKTRANLIST?.[0]
				?.STMTTRN;

		// Try credit card statement if no bank statement
		const ccStmt =
			ofx.CREDITCARDMSGSRSV1?.[0]?.CCSTMTTRNRS?.[0]?.CCSTMTRS?.[0]
				?.BANKTRANLIST?.[0]?.STMTTRN;

		const stmtTransactions = bankStmt || ccStmt;

		if (!stmtTransactions || !Array.isArray(stmtTransactions)) {
			errors.push('No transactions found in OFX file');
			return {
				transactions: [],
				skipped: 0,
				errors,
				metadata: { totalLines: 0 },
			};
		}

		// Parse each transaction
		for (const txn of stmtTransactions) {
			try {
				const parsed = parseOFXTransaction(txn as OFXTransaction);
				if (parsed) {
					transactions.push(parsed);
				} else {
					skipped++;
				}
			} catch (error) {
				skipped++;
				errors.push(
					`Transaction parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		}

		return {
			transactions,
			skipped,
			errors,
			metadata: {
				totalLines: stmtTransactions.length,
				encoding: 'UTF-8',
			},
		};
	} catch (error) {
		errors.push(
			`Fatal OFX parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
		return {
			transactions: [],
			skipped: 0,
			errors,
			metadata: { totalLines: 0 },
		};
	}
}

/**
 * Parses a single OFX transaction
 */
function parseOFXTransaction(
	txn: OFXTransaction
): ParsedTransaction | null {
	// Required fields
	if (!txn.DTPOSTED || !txn.TRNAMT || !txn.FITID) {
		return null;
	}

	const dateStr = txn.DTPOSTED[0];
	const amountStr = txn.TRNAMT[0];
	const fitid = txn.FITID[0];

	// Parse date (YYYYMMDD format in OFX)
	const data = normalizeDate(dateStr, false);
	if (!data) return null;

	// Parse amount
	const valor = parseFloat(amountStr);
	if (isNaN(valor)) return null;

	// Build description from NAME and/or MEMO
	const name = txn.NAME?.[0] || '';
	const memo = txn.MEMO?.[0] || '';
	const rawDescription = [name, memo].filter(Boolean).join(' - ');
	const descricao = normalizeDescription(rawDescription);

	if (!descricao.trim()) return null;

	// Map OFX transaction type
	const trnType = txn.TRNTYPE?.[0] || '';
	const tipo = mapOFXType(trnType, valor);

	const transaction: ParsedTransaction = {
		data,
		descricao,
		valor,
		tipo,
		idExterno: fitid,
	};

	// Add check number if present
	if (txn.CHECKNUM && txn.CHECKNUM[0]) {
		transaction.documento = txn.CHECKNUM[0];
	}

	return transaction;
}

/**
 * Cleans OFX content by removing headers and preparing for XML parsing
 */
function cleanOFXContent(content: string): string {
	// Remove everything before the <OFX> tag
	const ofxStart = content.indexOf('<OFX>');
	if (ofxStart !== -1) {
		return content.substring(ofxStart);
	}
	return content;
}

/**
 * Converts OFX SGML format to proper XML
 * OFX uses SGML-style tags without closing tags in some cases
 */
function ofxToXml(content: string): string {
	// OFX 2.x is already XML, check version
	if (content.includes('<?xml')) {
		return content;
	}

	// OFX 1.x: convert SGML to XML
	// This is a simplified conversion; production code might need more robust handling
	let xml = content;

	// Add closing tags for self-closing elements
	const selfClosingPattern = /<([A-Z0-9]+)>([^<]*?)(?=<[A-Z0-9]+>|<\/[A-Z0-9]+>|$)/g;
	xml = xml.replace(selfClosingPattern, '<$1>$2</$1>');

	return xml;
}

/**
 * Maps OFX transaction types to our domain types
 */
function mapOFXType(ofxType: string, valor: number): string {
	const typeMap: Record<string, string> = {
		CREDIT: 'credito',
		DEBIT: 'debito',
		INT: 'credito', // Interest
		DIV: 'credito', // Dividend
		FEE: 'debito',
		SRVCHG: 'debito', // Service charge
		DEP: 'credito', // Deposit
		ATM: 'debito',
		POS: 'debito', // Point of sale
		XFER: 'transferencia',
		CHECK: 'debito',
		PAYMENT: 'debito',
		CASH: 'debito',
		DIRECTDEP: 'credito',
		DIRECTDEBIT: 'debito',
		REPEATPMT: 'debito',
		OTHER: valor >= 0 ? 'credito' : 'debito',
	};

	return typeMap[ofxType.toUpperCase()] || inferirTipo('', valor);
}
