/**
 * Template for American Express CSV card statements
 * Per PRD section 5.3.4
 *
 * Amex files have extensive headers and summary sections
 * The parser must skip to the transaction table
 */

import type { TemplateMapping } from '../types.js';

export const amexCSVTemplate: TemplateMapping = {
	instituicaoNome: 'American Express',
	tipo: 'csv',
	sep: ',',
	encoding: 'UTF-8',
	dateFormat: 'DD/MM/YYYY',
	valueFormat: 'BR',
	columnMapping: {
		data: 'DATA',
		descricao: 'DESCRICAO',
		valor: 'VALOR (R$)',
		valorOriginal: 'VALOR ORIGINAL',
		moedaOriginal: 'MOEDA',
	},
};

/**
 * Example of Amex CSV structure:
 *
 * [Multiple header lines with account info, billing cycle, etc.]
 * ...
 * Taxa ao Ano,CET,Limite Total,Limite Disponível
 * ...
 * Data,Descrição,País,Valor Original,Moeda,Valor (R$)
 * 20/08/2024,RESTAURANTE XYZ,BRASIL,150.00,BRL,150.00
 * 21/08/2024,APPLE.COM/BILL,EUA,9.99,USD,50.25
 *
 * Notes:
 * - Skip all lines until the transaction header is found
 * - Ignore summary sections (CET, limits, etc.)
 * - International transactions show original currency
 */
