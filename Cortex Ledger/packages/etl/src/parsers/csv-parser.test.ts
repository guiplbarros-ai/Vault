/**
 * Tests for CSV parser
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCSV } from './csv-parser';
import { bradescoCSVTemplate } from '../templates/bradesco-csv';

describe('CSV Parser', () => {
	describe('Basic parsing', () => {
		it('should parse simple CSV with header', () => {
			const csv = `Data;Historico;Valor
25/10/2024;UBER TRIP;-50,00
26/10/2024;PIX RECEBIDO;100,00`;

			const result = parseCSV(csv);

			expect(result.transactions).toHaveLength(2);
			expect(result.transactions[0].data).toBe('2024-10-25');
			expect(result.transactions[0].valor).toBe(-50);
			expect(result.transactions[1].valor).toBe(100);
		});

		it('should auto-detect separator', () => {
			const csv = `Data,Historico,Valor
25/10/2024,UBER TRIP,-50.00`;

			const result = parseCSV(csv);

			expect(result.metadata.separator).toBe(',');
			expect(result.transactions).toHaveLength(1);
		});

		it('should detect header row automatically', () => {
			const csv = `Extrato Bancário
Cliente: João Silva
Período: Agosto 2024

Data;Historico;Valor
25/10/2024;UBER TRIP;-50,00`;

			const result = parseCSV(csv);

			expect(result.metadata.headerIdx).toBe(4);
			expect(result.transactions).toHaveLength(1);
		});

		it('should skip invalid lines', () => {
			const csv = `Data;Historico;Valor
25/10/2024;UBER TRIP;-50,00
INVALID LINE HERE
26/10/2024;PIX;100,00
ANOTHER BAD LINE`;

			const result = parseCSV(csv);

			expect(result.transactions.length).toBeGreaterThan(0);
			expect(result.skipped).toBeGreaterThan(0);
		});
	});

	describe('Brazilian format handling', () => {
		it('should parse Brazilian dates (DD/MM/YYYY)', () => {
			const csv = `Data;Valor
01/08/2024;-100,00
15/12/2024;-50,00`;

			const result = parseCSV(csv);

			expect(result.transactions[0].data).toBe('2024-08-01');
			expect(result.transactions[1].data).toBe('2024-12-15');
		});

		it('should parse Brazilian decimal values (comma)', () => {
			const csv = `Data;Valor
25/10/2024;1.234,56
26/10/2024;-987,65`;

			const result = parseCSV(csv);

			expect(result.transactions[0].valor).toBe(1234.56);
			expect(result.transactions[1].valor).toBe(-987.65);
		});

		it('should handle credit/debit columns (bank format)', () => {
			const csv = `Data;Credito;Debito
25/10/2024;500,00;
26/10/2024;;200,00`;

			const result = parseCSV(csv);

			expect(result.transactions[0].valor).toBe(500); // Credit positive
			expect(result.transactions[1].valor).toBe(-200); // Debit negative
		});
	});

	describe('Template-based parsing', () => {
		it('should use template column mapping', () => {
			const csv = `Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
01/08/2024;COMPRA CARTAO;123456;;1.234,56;8.765,44
02/08/2024;PIX RECEBIDO;789012;500,00;;9.265,44`;

			const result = parseCSV(csv, bradescoCSVTemplate);

			expect(result.transactions).toHaveLength(2);
			expect(result.transactions[0].valor).toBe(-1234.56);
			expect(result.transactions[1].valor).toBe(500);
		});
	});

	describe('Multi-currency support', () => {
		it('should extract original currency value', () => {
			const csv = `Data,Descricao,Valor(US$),Valor(R$)
25/10/2024,AMAZON,25.00,125.50`;

			const result = parseCSV(csv);

			expect(result.transactions[0].valorOriginal).toBe(25);
			expect(result.transactions[0].moedaOriginal).toBe('USD');
			expect(result.transactions[0].valor).toBe(-125.5); // BRL value (negative for expense)
		});
	});

	describe('Real file parsing', () => {
		it('should parse Bradesco CSV sample file', () => {
			const filePath = join(__dirname, '../../examples/bradesco-sample.csv');
			const content = readFileSync(filePath, 'utf-8');

			const result = parseCSV(content, bradescoCSVTemplate);

			expect(result.transactions.length).toBeGreaterThan(0);
			expect(result.errors.length).toBe(0);

			// Check first transaction structure
			const first = result.transactions[0];
			expect(first).toHaveProperty('data');
			expect(first).toHaveProperty('descricao');
			expect(first).toHaveProperty('valor');
			expect(first).toHaveProperty('tipo');

			// Data should be ISO format
			expect(first.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);

			// Valor should be a number
			expect(typeof first.valor).toBe('number');
		});

		it('should skip header lines in Bradesco sample', () => {
			const filePath = join(__dirname, '../../examples/bradesco-sample.csv');
			const content = readFileSync(filePath, 'utf-8');

			const result = parseCSV(content, bradescoCSVTemplate);

			// Should skip header and metadata lines
			expect(result.skipped).toBeGreaterThan(0);
		});
	});

	describe('Error handling', () => {
		it('should return error if header not found', () => {
			const csv = `Just random text
No header here
123,456,789`;

			const result = parseCSV(csv);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain('header');
		});

		it('should handle empty file', () => {
			const result = parseCSV('');

			expect(result.transactions).toHaveLength(0);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should report lines with invalid dates', () => {
			const csv = `Data;Valor
99/99/9999;-100,00
25/10/2024;-50,00`;

			const result = parseCSV(csv);

			expect(result.skipped).toBeGreaterThan(0);
		});

		it('should report lines with invalid values', () => {
			const csv = `Data;Valor
25/10/2024;INVALID
26/10/2024;-50,00`;

			const result = parseCSV(csv);

			expect(result.skipped).toBeGreaterThan(0);
		});
	});

	describe('Normalization', () => {
		it('should normalize descriptions', () => {
			const csv = `Data;Descricao;Valor
25/10/2024;  uber   *  trip   help  ;-50,00
26/10/2024;Padaria São José;-30,00`;

			const result = parseCSV(csv);

			// Descriptions should be uppercase and normalized
			expect(result.transactions[0].descricao).toContain('UBER');
			expect(result.transactions[0].descricao).not.toContain('  '); // No double spaces

			// Accents should be removed
			expect(result.transactions[1].descricao).toContain('SAO');
			expect(result.transactions[1].descricao).not.toContain('ã');
		});

		it('should infer transaction type', () => {
			const csv = `Data;Descricao;Valor
25/10/2024;PIX TRANSFERENCIA;-500,00
26/10/2024;ESTORNO COMPRA;100,00
27/10/2024;SALARIO;5000,00
28/10/2024;COMPRA MERCADO;-150,00`;

			const result = parseCSV(csv);

			expect(result.transactions[0].tipo).toBe('transferencia');
			expect(result.transactions[1].tipo).toBe('estorno');
			expect(result.transactions[2].tipo).toBe('credito');
			expect(result.transactions[3].tipo).toBe('debito');
		});
	});

	describe('Metadata', () => {
		it('should return metadata about parsing', () => {
			const csv = `Data;Historico;Valor
25/10/2024;UBER;-50,00`;

			const result = parseCSV(csv);

			expect(result.metadata).toHaveProperty('separator');
			expect(result.metadata).toHaveProperty('headerIdx');
			expect(result.metadata).toHaveProperty('totalLines');
			expect(result.metadata.separator).toBe(';');
			expect(result.metadata.headerIdx).toBe(0);
		});
	});

	describe('Edge cases', () => {
		it('should handle single transaction', () => {
			const csv = `Data;Valor
25/10/2024;-50,00`;

			const result = parseCSV(csv);

			expect(result.transactions).toHaveLength(1);
		});

		it('should handle empty lines', () => {
			const csv = `Data;Valor

25/10/2024;-50,00

26/10/2024;-30,00`;

			const result = parseCSV(csv);

			expect(result.transactions).toHaveLength(2);
		});

		it('should handle rows with too few fields', () => {
			const csv = `Data;Historico;Valor
25/10/2024;INCOMPLETE
26/10/2024;COMPLETE;-50,00`;

			const result = parseCSV(csv);

			expect(result.skipped).toBeGreaterThan(0);
		});

		it('should handle special characters in description', () => {
			const csv = `Data;Descricao;Valor
25/10/2024;LOJA@EMAIL.COM;-50,00
26/10/2024;PIX-TRANSFERENCIA;-100,00`;

			const result = parseCSV(csv);

			expect(result.transactions).toHaveLength(2);
			expect(result.transactions[0].descricao).toBeDefined();
			expect(result.transactions[1].descricao).toBeDefined();
		});
	});
});
