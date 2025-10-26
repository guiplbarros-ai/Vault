/**
 * Template for Aeternum CSV card statements (international card)
 * Per PRD section 5.3.3
 *
 * Aeternum statements include both original currency (USD) and BRL conversion
 */

import type { TemplateMapping } from '../types.js';

export const aeternumCSVTemplate: TemplateMapping = {
	instituicaoNome: 'Aeternum',
	tipo: 'csv',
	sep: ',',
	encoding: 'UTF-8',
	dateFormat: 'DD/MM/YYYY',
	valueFormat: 'BR',
	columnMapping: {
		data: 'DATA',
		descricao: 'HISTORICO',
		valor: 'VALOR(R$)',
		valorOriginal: 'VALOR(US$)',
		moedaOriginal: 'USD', // Fixed to USD for Aeternum
	},
};

/**
 * Example of Aeternum CSV structure:
 *
 * Data,Histórico,Valor(US$),Valor(R$)
 * 15/08/2024,AMAZON MARKETPLACE,25.00,125.50
 * 16/08/2024,NETFLIX SUBSCRIPTION,14.99,75.20
 *
 * Notes:
 * - All transactions are in USD originally
 * - Valor(R$) shows the conversion at the time
 * - Conversion rate can be inferred: BRL / USD
 */
