/**
 * Template for Bradesco CSV bank statements
 * Per PRD section 5.3.1
 */

import type { TemplateMapping } from '../types.js';

export const bradescoCSVTemplate: TemplateMapping = {
	instituicaoNome: 'Bradesco',
	tipo: 'csv',
	sep: ';',
	encoding: 'UTF-8',
	dateFormat: 'DD/MM/YYYY',
	valueFormat: 'BR',
	columnMapping: {
		data: 'DATA',
		descricao: 'HISTORICO',
		credito: 'CREDITO (R$)',
		debito: 'DEBITO (R$)',
		saldo: 'SALDO (R$)',
		documento: 'DOCTO.',
	},
};

/**
 * Example of Bradesco CSV structure:
 *
 * Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
 * 01/08/2024;COMPRA CARTAO CREDITO;123456;;1.234,56;10.000,00
 * 02/08/2024;PIX RECEBIDO;789012;500,00;;10.500,00
 */
