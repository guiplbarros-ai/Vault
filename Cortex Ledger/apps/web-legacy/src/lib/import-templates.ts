/**
 * Templates pré-configurados para importação
 */

export interface ImportTemplate {
	id: string
	name: string
	banco: string
	tipo: 'extrato' | 'fatura'
	formato: 'csv' | 'ofx'
	icon?: string
	description?: string
	autoDetect?: (content: string) => boolean
	columnMapping?: {
		data: string
		descricao: string
		valor: string
		tipo?: string
		documento?: string
		categoria?: string
	}
}

export const BRADESCO_TEMPLATES: ImportTemplate[] = [
	{
		id: 'bradesco-extrato-csv',
		name: 'Extrato Bradesco (CSV)',
		banco: 'Bradesco',
		tipo: 'extrato',
		formato: 'csv',
		description: 'Extrato de conta corrente Bradesco em formato CSV',
		autoDetect: (content: string) => {
			return content.includes('Extrato de:') &&
				   content.includes('Ag:') &&
				   content.includes('Conta:')
		},
		columnMapping: {
			data: 'Data',
			descricao: 'Histórico',
			valor: 'Crédito (R$)|Débito (R$)',
			documento: 'Docto.'
		}
	},
	{
		id: 'bradesco-extrato-ofx',
		name: 'Extrato Bradesco (OFX)',
		banco: 'Bradesco',
		tipo: 'extrato',
		formato: 'ofx',
		description: 'Extrato de conta corrente Bradesco em formato OFX',
		autoDetect: (content: string) => {
			return (content.includes('OFXHEADER') || content.includes('<OFX>')) &&
				   content.includes('<BANKID>0237')
		}
	},
	{
		id: 'bradesco-fatura-amex',
		name: 'Fatura AMEX Bradesco',
		banco: 'Bradesco',
		tipo: 'fatura',
		formato: 'csv',
		description: 'Fatura do cartão AMEX Bradesco',
		autoDetect: (content: string) => {
			return content.includes('Situação da Fatura:') &&
				   (content.includes('GUILHERME BARROS') || content.includes('DANIELLA BARROS'))
		},
		columnMapping: {
			data: 'Data',
			descricao: 'Histórico',
			valor: 'Valor(R$)'
		}
	},
	{
		id: 'bradesco-fatura-aeternum',
		name: 'Fatura Aeternum Bradesco',
		banco: 'Bradesco',
		tipo: 'fatura',
		formato: 'csv',
		description: 'Fatura do cartão Aeternum Bradesco',
		autoDetect: (content: string) => {
			return content.includes('Situação da Fatura:') &&
				   content.includes('Data:')
		},
		columnMapping: {
			data: 'Data',
			descricao: 'Histórico',
			valor: 'Valor(R$)'
		}
	}
]

/**
 * Detecta automaticamente o template baseado no conteúdo do arquivo
 */
export function detectTemplate(content: string, filename?: string): ImportTemplate | null {
	// Tentar detectar pelo nome do arquivo primeiro
	if (filename) {
		const lower = filename.toLowerCase()

		if (lower.includes('amex')) {
			return BRADESCO_TEMPLATES.find(t => t.id === 'bradesco-fatura-amex') || null
		}

		if (lower.includes('aeternum')) {
			return BRADESCO_TEMPLATES.find(t => t.id === 'bradesco-fatura-aeternum') || null
		}

		if (lower.includes('extrato') && lower.includes('.ofx')) {
			return BRADESCO_TEMPLATES.find(t => t.id === 'bradesco-extrato-ofx') || null
		}

		if (lower.includes('extrato') && lower.includes('.csv')) {
			return BRADESCO_TEMPLATES.find(t => t.id === 'bradesco-extrato-csv') || null
		}
	}

	// Tentar detectar pelo conteúdo
	for (const template of BRADESCO_TEMPLATES) {
		if (template.autoDetect && template.autoDetect(content)) {
			return template
		}
	}

	return null
}

/**
 * Lista todos os templates disponíveis
 */
export function getAllTemplates(): ImportTemplate[] {
	return [...BRADESCO_TEMPLATES]
}

/**
 * Busca template por ID
 */
export function getTemplateById(id: string): ImportTemplate | null {
	return BRADESCO_TEMPLATES.find(t => t.id === id) || null
}
