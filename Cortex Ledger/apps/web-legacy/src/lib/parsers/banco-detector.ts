/**
 * Detector de banco baseado no conteúdo do arquivo
 */

export type BancoSuportado = 'bradesco' | 'itau' | 'nubank' | 'c6' | 'inter'

interface BancoDetectionRule {
	banco: BancoSuportado
	patterns: RegExp[]
	keywords: string[]
}

const DETECTION_RULES: BancoDetectionRule[] = [
	{
		banco: 'bradesco',
		patterns: [
			/BRADESCO/i,
			/Extrato de:.*Ag:.*Conta:/i,
			/<BANKID>0237/i, // Código do Bradesco no OFX
		],
		keywords: ['bradesco', 'extrato de:', 'ag:', 'amex']
	},
	{
		banco: 'itau',
		patterns: [
			/ITAU|ITAÚ/i,
			/<BANKID>341/i, // Código do Itaú no OFX
		],
		keywords: ['itau', 'itaú']
	},
	{
		banco: 'nubank',
		patterns: [
			/NUBANK|NU PAGAMENTOS/i,
		],
		keywords: ['nubank', 'nu pagamentos']
	},
	{
		banco: 'c6',
		patterns: [
			/C6 BANK|BANCO C6/i,
			/<BANKID>336/i, // Código do C6 no OFX
		],
		keywords: ['c6 bank', 'banco c6']
	},
	{
		banco: 'inter',
		patterns: [
			/BANCO INTER/i,
			/<BANKID>077/i, // Código do Inter no OFX
		],
		keywords: ['banco inter', 'inter']
	}
]

/**
 * Detecta o banco baseado no conteúdo do arquivo e/ou nome do arquivo
 */
export function detectBanco(content: string, filename?: string): BancoSuportado | null {
	const contentLower = content.toLowerCase()
	const filenameLower = filename?.toLowerCase() || ''

	for (const rule of DETECTION_RULES) {
		// Verificar patterns no conteúdo
		for (const pattern of rule.patterns) {
			if (pattern.test(content)) {
				return rule.banco
			}
		}

		// Verificar keywords no conteúdo
		for (const keyword of rule.keywords) {
			if (contentLower.includes(keyword)) {
				return rule.banco
			}
		}

		// Verificar keywords no nome do arquivo
		for (const keyword of rule.keywords) {
			if (filenameLower.includes(keyword)) {
				return rule.banco
			}
		}
	}

	return null
}

/**
 * Lista todos os bancos suportados
 */
export function getBancosSuportados(): BancoSuportado[] {
	return DETECTION_RULES.map(r => r.banco)
}

/**
 * Verifica se um banco é suportado
 */
export function isBancoSuportado(banco: string): banco is BancoSuportado {
	return DETECTION_RULES.some(r => r.banco === banco.toLowerCase())
}
