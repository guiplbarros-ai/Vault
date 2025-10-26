/**
 * Tests for normalization utilities
 */

import { describe, it, expect } from 'vitest';
import {
	normalizeDate,
	normalizeValue,
	normalizeDescription,
	computeValorBancario,
	inferirTipo,
	detectSeparator,
	detectHeaderRow,
} from './normalization';

describe('normalizeDate', () => {
	it('should convert DD/MM/YYYY to ISO', () => {
		expect(normalizeDate('25/10/2024')).toBe('2024-10-25');
		expect(normalizeDate('01/01/2024')).toBe('2024-01-01');
		expect(normalizeDate('31/12/2023')).toBe('2023-12-31');
	});

	it('should convert DD-MM-YYYY to ISO', () => {
		expect(normalizeDate('25-10-2024')).toBe('2024-10-25');
	});

	it('should handle YYYYMMDD format (OFX)', () => {
		expect(normalizeDate('20241025')).toBe('2024-10-25');
		expect(normalizeDate('20240101')).toBe('2024-01-01');
	});

	it('should handle already ISO format', () => {
		expect(normalizeDate('2024-10-25')).toBe('2024-10-25');
	});

	it('should handle dayfirst parameter', () => {
		// MM/DD/YYYY when dayfirst=false
		expect(normalizeDate('10/25/2024', false)).toBe('2024-10-25');
	});

	it('should return null for invalid dates', () => {
		expect(normalizeDate('')).toBeNull();
		expect(normalizeDate('invalid')).toBeNull();
		expect(normalizeDate('99/99/9999')).toBeNull();
	});

	it('should pad single-digit days and months', () => {
		expect(normalizeDate('1/5/2024')).toBe('2024-05-01');
		expect(normalizeDate('9/12/2024')).toBe('2024-12-09');
	});
});

describe('normalizeValue', () => {
	it('should convert Brazilian format to decimal', () => {
		expect(normalizeValue('1.234,56')).toBe(1234.56);
		expect(normalizeValue('123,45')).toBe(123.45);
		expect(normalizeValue('1,00')).toBe(1.00);
	});

	it('should handle negative values', () => {
		expect(normalizeValue('-1.234,56')).toBe(-1234.56);
		expect(normalizeValue('-123,45')).toBe(-123.45);
	});

	it('should handle values with parentheses (negative)', () => {
		expect(normalizeValue('(123,45)')).toBe(-123.45);
		expect(normalizeValue('(1.234,56)')).toBe(-1234.56);
	});

	it('should remove currency symbols', () => {
		expect(normalizeValue('R$ 1.234,56')).toBe(1234.56);
		expect(normalizeValue('USD 123.45')).toBe(123.45);
	});

	it('should handle US format (dot as decimal)', () => {
		expect(normalizeValue('1234.56')).toBe(1234.56);
		expect(normalizeValue('123.45')).toBe(123.45);
	});

	it('should handle values with spaces', () => {
		expect(normalizeValue('1 234,56')).toBe(1234.56);
		expect(normalizeValue('R$ 1 234,56')).toBe(1234.56);
	});

	it('should handle zero and very small values', () => {
		expect(normalizeValue('0,00')).toBe(0);
		expect(normalizeValue('0,01')).toBe(0.01);
	});

	it('should return value as-is if already a number', () => {
		expect(normalizeValue(123.45)).toBe(123.45);
		expect(normalizeValue(-567.89)).toBe(-567.89);
	});

	it('should return null for invalid values', () => {
		expect(normalizeValue('')).toBeNull();
		expect(normalizeValue('invalid')).toBeNull();
		expect(normalizeValue('abc123')).toBeNull();
	});
});

describe('normalizeDescription', () => {
	it('should convert to uppercase', () => {
		expect(normalizeDescription('uber trip')).toBe('UBER TRIP');
		expect(normalizeDescription('Compra Mercado')).toBe('COMPRA MERCADO');
	});

	it('should remove accents', () => {
		expect(normalizeDescription('Padaria São José')).toBe('PADARIA SAO JOSE');
		expect(normalizeDescription('Açougue')).toBe('ACOUGUE');
		expect(normalizeDescription('Café')).toBe('CAFE');
	});

	it('should collapse multiple spaces', () => {
		expect(normalizeDescription('UBER   *  TRIP   HELP')).toBe('UBER * TRIP HELP');
		expect(normalizeDescription('Compra    com    cartão')).toBe(
			'COMPRA COM CARTAO'
		);
	});

	it('should trim whitespace', () => {
		expect(normalizeDescription('  UBER TRIP  ')).toBe('UBER TRIP');
		expect(normalizeDescription('\n\tCOMPRA\n')).toBe('COMPRA');
	});

	it('should remove special characters except *, -, /', () => {
		expect(normalizeDescription('UBER * TRIP')).toBe('UBER * TRIP');
		expect(normalizeDescription('PIX-TRANSFERENCIA')).toBe('PIX TRANSFERENCIA');
		expect(normalizeDescription('LOJA@EMAIL.COM')).toBe('LOJA EMAIL COM');
	});

	it('should handle empty strings', () => {
		expect(normalizeDescription('')).toBe('');
		expect(normalizeDescription('   ')).toBe('');
	});

	it('should handle complex real-world descriptions', () => {
		expect(
			normalizeDescription('  UBER   *  TRIP   HELP   SÃO PAULO  ')
		).toBe('UBER * TRIP HELP SAO PAULO');

		expect(normalizeDescription('Pagamento PIX - João da Silva')).toBe(
			'PAGAMENTO PIX JOAO DA SILVA'
		);

		expect(normalizeDescription('Compra    com    cartão    #123456')).toBe(
			'COMPRA COM CARTAO 123456'
		);
	});
});

describe('computeValorBancario', () => {
	it('should compute credit as positive', () => {
		expect(computeValorBancario(500, null)).toBe(500);
		expect(computeValorBancario(500, 0)).toBe(500);
	});

	it('should compute debit as negative', () => {
		expect(computeValorBancario(null, 200)).toBe(-200);
		expect(computeValorBancario(0, 200)).toBe(-200);
	});

	it('should handle both null (unusual but valid)', () => {
		expect(computeValorBancario(null, null)).toBe(0);
	});

	it('should handle only one filled (normal case)', () => {
		expect(computeValorBancario(1000, null)).toBe(1000);
		expect(computeValorBancario(null, 500)).toBe(-500);
	});
});

describe('inferirTipo', () => {
	it('should detect estorno from keywords', () => {
		expect(inferirTipo('ESTORNO COMPRA', -100)).toBe('estorno');
		expect(inferirTipo('CHARGEBACK UBER', -50)).toBe('estorno');
		expect(inferirTipo('CANCELAMENTO PIX', 100)).toBe('estorno');
	});

	it('should detect transferencia from keywords', () => {
		expect(inferirTipo('TRANSFERENCIA TED', -500)).toBe('transferencia');
		expect(inferirTipo('PIX ENVIADO', -200)).toBe('transferencia');
		expect(inferirTipo('DOC RECEBIDO', 300)).toBe('transferencia');
	});

	it('should infer credito from positive value', () => {
		expect(inferirTipo('SALARIO', 5000)).toBe('credito');
		expect(inferirTipo('DEPOSITO', 1000)).toBe('credito');
	});

	it('should infer debito from negative value', () => {
		expect(inferirTipo('COMPRA MERCADO', -150)).toBe('debito');
		expect(inferirTipo('SAQUE ATM', -200)).toBe('debito');
	});

	it('should prioritize keywords over value sign', () => {
		// Even if value is positive, "ESTORNO" wins
		expect(inferirTipo('ESTORNO COMPRA', 100)).toBe('estorno');

		// Even if value is negative, "PIX" wins
		expect(inferirTipo('PIX ENVIADO', -500)).toBe('transferencia');
	});
});

describe('detectSeparator', () => {
	it('should detect semicolon separator', () => {
		expect(detectSeparator('Data;Historico;Valor;Saldo')).toBe(';');
	});

	it('should detect comma separator', () => {
		expect(detectSeparator('Date,Description,Amount,Balance')).toBe(',');
	});

	it('should detect tab separator', () => {
		expect(detectSeparator('Data\tHistorico\tValor\tSaldo')).toBe('\t');
	});

	it('should detect pipe separator', () => {
		expect(detectSeparator('Data|Historico|Valor|Saldo')).toBe('|');
	});

	it('should default to comma if no clear separator', () => {
		expect(detectSeparator('just some text')).toBe(',');
	});

	it('should choose separator with most occurrences', () => {
		expect(detectSeparator('a;b;c;d;e')).toBe(';');
		expect(detectSeparator('a,b,c,d,e,f,g')).toBe(',');
	});
});

describe('detectHeaderRow', () => {
	it('should find header with common Brazilian column names', () => {
		const lines = [
			'Cliente: João Silva',
			'Período: Agosto 2024',
			'',
			'Data;Histórico;Valor;Saldo',
			'01/08/2024;COMPRA;-100,00;1000,00',
		];

		expect(detectHeaderRow(lines, ';')).toBe(3);
	});

	it('should find header with English column names', () => {
		const lines = [
			'Account Statement',
			'',
			'Date,Description,Amount,Balance',
			'2024-08-01,PURCHASE,-100.00,1000.00',
		];

		expect(detectHeaderRow(lines, ',')).toBe(2);
	});

	it('should return -1 if no header found', () => {
		const lines = ['just', 'some', 'random', 'text'];

		expect(detectHeaderRow(lines, ',')).toBe(-1);
	});

	it('should stop searching after 20 lines', () => {
		const lines = Array(30).fill('random text');
		lines[25] = 'Data;Historico;Valor'; // Beyond search limit

		expect(detectHeaderRow(lines, ';')).toBe(-1);
	});

	it('should require at least 3 fields', () => {
		const lines = ['Data;Valor', '01/08/2024;-100,00'];

		expect(detectHeaderRow(lines, ';')).toBe(-1);
	});

	it('should match case-insensitive', () => {
		const lines = ['data;historico;valor;saldo'];

		expect(detectHeaderRow(lines, ';')).toBe(0);
	});
});
