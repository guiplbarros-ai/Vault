/**
 * Template for Bradesco OFX bank statements
 * Per PRD section 5.3.2
 *
 * OFX files are standardized, but this template documents
 * Bradesco-specific field mappings and behaviors
 */

import type { TemplateMapping } from '../types.js';

export const bradescoOFXTemplate: TemplateMapping = {
	instituicaoNome: 'Bradesco',
	tipo: 'ofx',
	encoding: 'UTF-8',
	dateFormat: 'YYYYMMDD',
	valueFormat: 'US', // OFX uses dot as decimal separator
	columnMapping: {
		// OFX uses standard field names
		data: 'DTPOSTED',
		descricao: 'NAME/MEMO',
		valor: 'TRNAMT',
		documento: 'FITID',
	},
};

/**
 * Example of Bradesco OFX structure:
 *
 * <STMTTRN>
 *   <TRNTYPE>DEBIT</TRNTYPE>
 *   <DTPOSTED>20240801</DTPOSTED>
 *   <TRNAMT>-1234.56</TRNAMT>
 *   <FITID>20240801001</FITID>
 *   <NAME>COMPRA CARTAO CREDITO</NAME>
 *   <MEMO>Detalhes adicionais</MEMO>
 * </STMTTRN>
 */
