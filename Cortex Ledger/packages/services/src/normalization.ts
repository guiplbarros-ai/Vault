/**
 * Normalization utilities for Cortex Ledger
 * Handles date, value, and description normalization per PRD requirements
 */

/**
 * Normalizes a Brazilian date string to ISO format (YYYY-MM-DD)
 * Supports DD/MM/YYYY, DD-MM-YYYY, and YYYYMMDD formats
 *
 * @param dateStr - Date string in various formats
 * @param dayfirst - Whether to interpret ambiguous dates as day-first (default: true for Brazil)
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 *
 * @example
 * normalizeDate('25/10/2024') // '2024-10-25'
 * normalizeDate('20241025') // '2024-10-25'
 */
export function normalizeDate(dateStr: string, dayfirst = true): string | null {
	if (!dateStr || typeof dateStr !== 'string') return null;

	const trimmed = dateStr.trim();

	// Format: YYYYMMDD (OFX format)
	if (/^\d{8}$/.test(trimmed)) {
		const year = trimmed.substring(0, 4);
		const month = trimmed.substring(4, 6);
		const day = trimmed.substring(6, 8);
		return `${year}-${month}-${day}`;
	}

	// Format: DD/MM/YYYY or DD-MM-YYYY
	const brDateMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
	if (brDateMatch) {
		const [, first, second, year] = brDateMatch;
		const day = dayfirst ? first.padStart(2, '0') : second.padStart(2, '0');
		const month = dayfirst ? second.padStart(2, '0') : first.padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Format: YYYY-MM-DD (already ISO)
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return trimmed;
	}

	return null;
}

/**
 * Normalizes Brazilian currency values to decimal format
 * Converts comma decimal separator to dot, removes thousands separators
 *
 * @param valueStr - Value string in Brazilian format
 * @returns Decimal number or null if invalid
 *
 * @example
 * normalizeValue('1.234,56') // 1234.56
 * normalizeValue('R$ 1.234,56') // 1234.56
 * normalizeValue('-234,50') // -234.50
 */
export function normalizeValue(valueStr: string | number): number | null {
	if (typeof valueStr === 'number') return valueStr;
	if (!valueStr || typeof valueStr !== 'string') return null;

	// Remove currency symbols, spaces, and common prefixes
	let cleaned = valueStr
		.trim()
		.replace(/^R\$\s*/, '')
		.replace(/^USD\s*/, '')
		.replace(/\s+/g, '');

	// Check if negative (handle both - and parentheses)
	const isNegative = cleaned.startsWith('-') || cleaned.startsWith('(');
	cleaned = cleaned.replace(/^[-\(]/, '').replace(/\)$/, '');

	// Remove thousands separators (dots) and convert decimal comma to dot
	// Brazilian format: 1.234.567,89 -> 1234567.89
	// First, check if there's a comma (Brazilian decimal separator)
	if (cleaned.includes(',')) {
		// Remove dots (thousands separator) and replace comma with dot
		cleaned = cleaned.replace(/\./g, '').replace(',', '.');
	}

	const value = parseFloat(cleaned);
	if (isNaN(value)) return null;

	return isNegative ? -value : value;
}

/**
 * Normalizes transaction descriptions for deduplication and rule matching
 * - Trims whitespace
 * - Collapses multiple spaces into single space
 * - Removes common noise characters
 * - Preserves useful information for rules (e.g., merchant names)
 *
 * @param description - Raw description from bank/card statement
 * @returns Normalized description
 *
 * @example
 * normalizeDescription('  UBER   *  TRIP   HELP  ') // 'UBER * TRIP HELP'
 * normalizeDescription('Compra   com    cartão') // 'COMPRA COM CARTAO'
 */
export function normalizeDescription(description: string): string {
	if (!description || typeof description !== 'string') return '';

	return description
		.trim()
		.toUpperCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/\s+/g, ' ') // Collapse multiple spaces
		.replace(/[^\w\s\*\-\/]/g, ' ') // Remove special chars except *, -, /
		.replace(/\s+/g, ' ') // Collapse again after replacements
		.trim();
}

/**
 * Computes the transaction value based on bank account rules
 * For bank accounts: value = credit - debit (only one should be filled)
 * For cards: value is typically negative (expenses)
 *
 * @param credito - Credit amount (incoming)
 * @param debito - Debit amount (outgoing)
 * @returns Computed value (positive for credit, negative for debit)
 */
export function computeValorBancario(
	credito: number | null,
	debito: number | null
): number {
	const creditoVal = credito ?? 0;
	const debitoVal = debito ?? 0;

	// Bank logic: credit is positive, debit is negative
	return creditoVal - debitoVal;
}

/**
 * Infers transaction type based on keywords in description and value
 *
 * @param description - Normalized description
 * @param valor - Transaction value
 * @returns Transaction type: 'credito', 'debito', 'transferencia', 'estorno'
 */
export function inferirTipo(description: string, valor: number): string {
	const desc = description.toUpperCase();

	// Estorno/Chargeback detection
	if (
		desc.includes('ESTORNO') ||
		desc.includes('CHARGEBACK') ||
		desc.includes('CANCELAMENTO')
	) {
		return 'estorno';
	}

	// Transfer detection
	if (
		desc.includes('TRANSF') ||
		desc.includes('TED') ||
		desc.includes('DOC') ||
		desc.includes('PIX')
	) {
		return 'transferencia';
	}

	// Credit vs Debit based on value sign
	return valor >= 0 ? 'credito' : 'debito';
}

/**
 * Detects the separator used in a CSV file
 *
 * @param line - Sample line from CSV (typically the header)
 * @returns Detected separator: ';', ',', '\t', or ','
 */
export function detectSeparator(line: string): string {
	const separators = [';', ',', '\t', '|'];
	let maxCount = 0;
	let detectedSep = ',';

	for (const sep of separators) {
		const count = (line.match(new RegExp(`\\${sep}`, 'g')) || []).length;
		if (count > maxCount && count >= 3) {
			maxCount = count;
			detectedSep = sep;
		}
	}

	return detectedSep;
}

/**
 * Detects the header row in a CSV file
 * Looks for the first line with >= 3 separators and column-like names
 *
 * @param lines - Array of lines from the file
 * @param sep - Separator to use
 * @returns Index of the header row, or -1 if not found
 */
export function detectHeaderRow(lines: string[], sep: string): number {
	const commonHeaders = [
		'DATA',
		'HISTORICO',
		'DESCRICAO',
		'VALOR',
		'CREDITO',
		'DEBITO',
		'DOCTO',
		'SALDO',
	];

	for (let i = 0; i < Math.min(20, lines.length); i++) {
		const line = lines[i].toUpperCase();
		const fields = line.split(sep);

		// Must have at least 3 fields
		if (fields.length < 3) continue;

		// Check if any field matches common header names
		const hasHeaderName = fields.some((field) =>
			commonHeaders.some((header) => field.includes(header))
		);

		if (hasHeaderName) return i;
	}

	return -1;
}
