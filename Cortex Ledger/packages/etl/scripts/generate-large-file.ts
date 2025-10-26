#!/usr/bin/env node
/**
 * Generate large CSV file for performance testing
 * Creates a file with N transactions based on bradesco-sample.csv template
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const TARGET_LINES = parseInt(process.argv[2] || '10000');
const OUTPUT_FILE = process.argv[3] || 'large-test-file.csv';

// Template transactions (realistic patterns)
const templates = [
	{ desc: 'COMPRA CARTAO CREDITO', value: -1234.56, type: 'debito' },
	{ desc: 'PIX RECEBIDO - MARIA SANTOS', value: 500.0, type: 'credito' },
	{ desc: 'SAQUE ATM SHOPPING CENTER', value: -200.0, type: 'debito' },
	{ desc: 'TED ENVIADO - EMPRESA XYZ', value: -3000.0, type: 'transferencia' },
	{ desc: 'DEPOSITO EM DINHEIRO', value: 1500.0, type: 'credito' },
	{ desc: 'UBER * TRIP HELP', value: -45.8, type: 'debito' },
	{ desc: 'IFOOD * RESTAURANTE ABC', value: -78.9, type: 'debito' },
	{ desc: 'SPOTIFY', value: -19.9, type: 'debito' },
	{ desc: 'SALARIO - EMPRESA ABC LTDA', value: 5000.0, type: 'credito' },
	{ desc: 'NETFLIX SERVICOS', value: -39.9, type: 'debito' },
	{ desc: 'AMAZON MARKETPLACE', value: -156.78, type: 'debito' },
	{ desc: 'SUPERMERCADO PREZUNIC', value: -345.67, type: 'debito' },
	{ desc: 'FARMACIA DROGASIL', value: -89.45, type: 'debito' },
	{ desc: 'POSTO SHELL BR 101', value: -250.0, type: 'debito' },
	{ desc: 'RESTAURANTE BELLA VISTA', value: -180.0, type: 'debito' },
	{ desc: 'PADARIA SANTO ANTONIO', value: -23.45, type: 'debito' },
	{ desc: 'LIVRARIA CULTURA', value: -135.9, type: 'debito' },
	{ desc: 'CINEMA CINEMARK', value: -98.0, type: 'debito' },
	{ desc: 'ESTORNO COMPRA INDEVIDA', value: 100.0, type: 'estorno' },
	{ desc: 'TRANSFERENCIA PIX RECEBIDA', value: 800.0, type: 'credito' },
];

function randomDate(start: Date, end: Date): string {
	const date = new Date(
		start.getTime() + Math.random() * (end.getTime() - start.getTime())
	);
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();
	return `${day}/${month}/${year}`;
}

function formatBRValue(value: number): string {
	const abs = Math.abs(value);
	const formatted = abs.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	return formatted;
}

function generateCSV(numLines: number): string {
	const startDate = new Date(2024, 0, 1); // Jan 1, 2024
	const endDate = new Date(2024, 11, 31); // Dec 31, 2024

	let csv = 'Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)\n';

	let saldo = 10000.0; // Starting balance

	for (let i = 0; i < numLines; i++) {
		const template = templates[Math.floor(Math.random() * templates.length)];
		const data = randomDate(startDate, endDate);
		const value = template.value * (0.8 + Math.random() * 0.4); // +/- 20% variation
		const docto = String(100000 + Math.floor(Math.random() * 900000));

		saldo += value;

		const credito = value > 0 ? formatBRValue(value) : '';
		const debito = value < 0 ? formatBRValue(value) : '';
		const saldoStr = formatBRValue(saldo);

		// Add slight variations to description to ensure uniqueness
		const desc = `${template.desc} ${i % 100 === 0 ? `#${i}` : ''}`.trim();

		csv += `${data};${desc};${docto};${credito};${debito};${saldoStr}\n`;
	}

	return csv;
}

console.log(`🔧 Generating CSV file with ${TARGET_LINES} transactions...`);

const csvContent = generateCSV(TARGET_LINES);
const outputPath = join(process.cwd(), OUTPUT_FILE);

writeFileSync(outputPath, csvContent, 'utf-8');

console.log(`✅ File created: ${outputPath}`);
console.log(`📊 Size: ${(csvContent.length / 1024).toFixed(2)} KB`);
console.log(`📝 Lines: ${TARGET_LINES + 1} (including header)`);
console.log(`\n💡 Usage:`);
console.log(
	`   pnpm --filter @cortex/etl dev ${OUTPUT_FILE} <conta_id> bradesco-csv`
);
