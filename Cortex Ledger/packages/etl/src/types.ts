/**
 * Types for ETL operations
 */

/**
 * Parsed transaction from any source (CSV, OFX, etc.)
 */
export interface ParsedTransaction {
	data: string; // ISO date YYYY-MM-DD
	descricao: string; // Raw description
	valor: number; // Transaction value (negative for expenses)
	tipo?: string; // Transaction type (credito/debito/transferencia/estorno)
	idExterno?: string; // External ID from bank (e.g., FITID in OFX)
	saldoApos?: number; // Balance after transaction
	parcelaN?: number; // Installment number
	parcelasTotal?: number; // Total installments
	valorOriginal?: number; // Original value in foreign currency
	moedaOriginal?: string; // Original currency code (e.g., USD)
	documento?: string; // Document number
}

/**
 * Parse result with statistics
 */
export interface ParseResult {
	transactions: ParsedTransaction[];
	skipped: number; // Number of invalid lines skipped
	errors: string[]; // Array of error messages
	metadata: {
		separator?: string;
		headerIdx?: number;
		encoding?: string;
		totalLines: number;
	};
}

/**
 * Template mapping configuration
 */
export interface TemplateMapping {
	instituicaoNome: string;
	tipo: 'csv' | 'ofx' | 'excel';
	headerIdx?: number;
	sep?: string;
	encoding?: string;
	columnMapping: {
		data?: string;
		descricao?: string;
		valor?: string;
		credito?: string;
		debito?: string;
		saldo?: string;
		documento?: string;
		valorOriginal?: string;
		moedaOriginal?: string;
	};
	dateFormat?: 'DD/MM/YYYY' | 'YYYYMMDD' | 'YYYY-MM-DD';
	valueFormat?: 'BR' | 'US'; // BR: 1.234,56 | US: 1,234.56
}

/**
 * Import summary
 */
export interface ImportSummary {
	imported: number;
	skipped: number;
	duplicates: number;
	errors: string[];
	timeMs: number;
}
