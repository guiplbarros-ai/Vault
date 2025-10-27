/**
 * Parser para arquivos do Bradesco
 * Suporta: Extrato CSV, Fatura CSV e OFX
 */

export interface ParsedTransaction {
	data: string
	descricao: string
	valor: number
	tipo: 'credito' | 'debito'
	documento?: string
	saldo?: number
	moeda?: 'BRL' | 'USD'
	titular?: string
}

export interface BradescoParseResult {
	transactions: ParsedTransaction[]
	metadata: {
		banco: string
		tipo: 'extrato' | 'fatura'
		formato: 'csv' | 'ofx'
		agencia?: string
		conta?: string
		periodo?: { inicio: string; fim: string }
		titular?: string
		situacao?: string
	}
	errors: string[]
}

/**
 * Detecta o tipo de arquivo Bradesco
 */
export function detectBradescoFileType(content: string): 'extrato-csv' | 'fatura-csv' | 'ofx' | 'unknown' {
	// OFX é fácil de identificar
	if (content.includes('OFXHEADER') || content.includes('<OFX>')) {
		return 'ofx'
	}

	// Extrato CSV tem "Extrato de:" no início
	if (content.includes('Extrato de:') && content.includes('Ag:') && content.includes('Conta:')) {
		return 'extrato-csv'
	}

	// Fatura CSV tem "Situação da Fatura:" e "Data:" no início
	if (content.includes('Situação da Fatura:') || content.includes('GUILHERME BARROS')) {
		return 'fatura-csv'
	}

	return 'unknown'
}

/**
 * Parse de Extrato Bradesco CSV
 */
export function parseExtratoBradescoCSV(content: string): BradescoParseResult {
	const errors: string[] = []
	const transactions: ParsedTransaction[] = []

	try {
		const lines = content.split(/\r?\n/).filter(l => l.trim())

		// Extrair informações do cabeçalho
		const firstLine = lines[0] || ''
		const agenciaMatch = firstLine.match(/Ag:\s*(\d+)/)
		const contaMatch = firstLine.match(/Conta:\s*([\d-]+)/)
		const periodoMatch = firstLine.match(/Entre\s+(\d{2}\/\d{2}\/\d{4})\s+e\s+(\d{2}\/\d{2}\/\d{4})/)

		// Encontrar linha de cabeçalho das transações
		let headerIdx = -1
		for (let i = 0; i < Math.min(lines.length, 10); i++) {
			if (lines[i].includes('Data;') && lines[i].includes('Histórico')) {
				headerIdx = i
				break
			}
		}

		if (headerIdx === -1) {
			errors.push('Cabeçalho de transações não encontrado')
			return {
				transactions,
				metadata: { banco: 'Bradesco', tipo: 'extrato', formato: 'csv' },
				errors
			}
		}

		// Processar transações
		for (let i = headerIdx + 1; i < lines.length; i++) {
			const line = lines[i]

			// Parar se encontrar "Total" ou "Últimos Lançamentos"
			if (line.includes('Total;') || line.includes('Últimos Lançamentos')) {
				break
			}

			// Ignorar linhas vazias ou de continuação (que começam com ;;)
			if (line.startsWith(';;') || line.split(';').length < 5) {
				continue
			}

			const parts = line.split(';')
			if (parts.length < 6) continue

			const [data, historico, docto, credito, debito, saldo] = parts.map(p => p.trim())

			// Skip se não tem data válida
			if (!data || !data.match(/\d{2}\/\d{2}\/\d{2}/)) {
				continue
			}

			// Limpar valores (remover pontos de milhar e converter vírgula para ponto)
			const parseValor = (val: string): number => {
				if (!val || val === '') return 0
				const cleaned = val.replace(/"/g, '').replace(/\./g, '').replace(',', '.')
				return parseFloat(cleaned) || 0
			}

			const valorCredito = parseValor(credito)
			const valorDebito = parseValor(debito)
			const valorSaldo = parseValor(saldo)

			if (valorCredito > 0) {
				transactions.push({
					data,
					descricao: historico,
					valor: valorCredito,
					tipo: 'credito',
					documento: docto,
					saldo: valorSaldo,
					moeda: 'BRL'
				})
			}

			if (valorDebito > 0) {
				transactions.push({
					data,
					descricao: historico,
					valor: valorDebito,
					tipo: 'debito',
					documento: docto,
					saldo: valorSaldo,
					moeda: 'BRL'
				})
			}
		}

		return {
			transactions,
			metadata: {
				banco: 'Bradesco',
				tipo: 'extrato',
				formato: 'csv',
				agencia: agenciaMatch?.[1],
				conta: contaMatch?.[1],
				periodo: periodoMatch ? {
					inicio: periodoMatch[1],
					fim: periodoMatch[2]
				} : undefined
			},
			errors
		}
	} catch (error: any) {
		errors.push(`Erro ao processar extrato: ${error.message}`)
		return {
			transactions,
			metadata: { banco: 'Bradesco', tipo: 'extrato', formato: 'csv' },
			errors
		}
	}
}

/**
 * Parse de Fatura CSV (AMEX/Aeternum)
 */
export function parseFaturaCSV(content: string): BradescoParseResult {
	const errors: string[] = []
	const transactions: ParsedTransaction[] = []

	try {
		const lines = content.split(/\r?\n/).filter(l => l.trim())

		// Extrair data e situação da fatura
		let dataFatura = ''
		let situacao = ''
		let titularAtual = ''

		for (let i = 0; i < Math.min(lines.length, 100); i++) {
			const line = lines[i]

			// Capturar data da fatura
			if (line.startsWith('Data:')) {
				dataFatura = line.replace('Data:', '').trim()
			}

			// Capturar situação
			if (line.includes('Situação da Fatura:')) {
				situacao = line.split(':')[1]?.trim() || ''
			}

			// Detectar mudança de titular (indica múltiplos cartões)
			const titularMatch = line.match(/^([A-Z\s]+)\s+;;;?\s*\d{4}/)
			if (titularMatch) {
				titularAtual = titularMatch[1].trim()
			}

			// Processar transações
			if (line.match(/^\d{2}\/\d{2};/)) {
				const parts = line.split(';')
				if (parts.length >= 4) {
					const [data, historico, valorUSD, valorBRL] = parts.map(p => p.trim())

					const parseValor = (val: string): number => {
						if (!val || val === '') return 0
						const cleaned = val.replace(/"/g, '').replace(/\./g, '').replace(',', '.')
						return parseFloat(cleaned) || 0
					}

					const valor = parseValor(valorBRL)

					// Valores negativos são créditos (estorno/pagamento)
					// Valores positivos são débitos (compras)
					const isCredito = valor < 0

					if (valor !== 0) {
						transactions.push({
							data,
							descricao: historico,
							valor: Math.abs(valor),
							tipo: isCredito ? 'credito' : 'debito',
							moeda: parseValor(valorUSD) > 0 ? 'USD' : 'BRL',
							titular: titularAtual || undefined
						})
					}
				}
			}

			// Parar ao encontrar o resumo
			if (line.includes('Total da fatura em Real:') || line.includes('Resumo das Despesas')) {
				break
			}
		}

		return {
			transactions,
			metadata: {
				banco: 'Bradesco',
				tipo: 'fatura',
				formato: 'csv',
				situacao
			},
			errors
		}
	} catch (error: any) {
		errors.push(`Erro ao processar fatura: ${error.message}`)
		return {
			transactions,
			metadata: { banco: 'Bradesco', tipo: 'fatura', formato: 'csv' },
			errors
		}
	}
}

/**
 * Parse de OFX Bradesco
 */
export function parseBradescoOFX(content: string): BradescoParseResult {
	const errors: string[] = []
	const transactions: ParsedTransaction[] = []

	try {
		// Extrair informações da conta
		const bankIdMatch = content.match(/<BANKID>(\d+)/)
		const acctIdMatch = content.match(/<ACCTID>([^<\n]+)/)
		const dtStartMatch = content.match(/<DTSTART>(\d{8})/)
		const dtEndMatch = content.match(/<DTEND>(\d{8})/)

		// Extrair transações
		const stmtTrnRegex = /<STMTTRN>[\s\S]*?<\/STMTTRN>/gi
		const matches = content.match(stmtTrnRegex) || []

		for (const block of matches) {
			const getTag = (tag: string): string => {
				const match = block.match(new RegExp(`<${tag}>([^\n\r<]+)`))
				return match?.[1]?.trim() || ''
			}

			const trnType = getTag('TRNTYPE')
			const dtPosted = getTag('DTPOSTED')
			const trnAmt = getTag('TRNAMT')
			const memo = getTag('MEMO')
			const checkNum = getTag('CHECKNUM')

			// Converter data YYYYMMDD para DD/MM/YY
			const convertDate = (ofxDate: string): string => {
				if (!ofxDate || ofxDate.length < 8) return ofxDate
				const year = ofxDate.substring(0, 4)
				const month = ofxDate.substring(4, 6)
				const day = ofxDate.substring(6, 8)
				return `${day}/${month}/${year.substring(2)}`
			}

			const valor = parseFloat(trnAmt) || 0
			const isCredito = trnType === 'CREDIT' || valor > 0

			transactions.push({
				data: convertDate(dtPosted),
				descricao: memo || 'Sem descrição',
				valor: Math.abs(valor),
				tipo: isCredito ? 'credito' : 'debito',
				documento: checkNum,
				moeda: 'BRL'
			})
		}

		// Converter datas do período
		const formatPeriodoDate = (ofxDate: string): string => {
			if (!ofxDate || ofxDate.length < 8) return ''
			const year = ofxDate.substring(0, 4)
			const month = ofxDate.substring(4, 6)
			const day = ofxDate.substring(6, 8)
			return `${day}/${month}/${year}`
		}

		return {
			transactions,
			metadata: {
				banco: 'Bradesco',
				tipo: 'extrato',
				formato: 'ofx',
				agencia: acctIdMatch?.[1]?.split('/')?.[0],
				conta: acctIdMatch?.[1]?.split('/')?.[1],
				periodo: dtStartMatch && dtEndMatch ? {
					inicio: formatPeriodoDate(dtStartMatch[1]),
					fim: formatPeriodoDate(dtEndMatch[1])
				} : undefined
			},
			errors
		}
	} catch (error: any) {
		errors.push(`Erro ao processar OFX: ${error.message}`)
		return {
			transactions,
			metadata: { banco: 'Bradesco', tipo: 'extrato', formato: 'ofx' },
			errors
		}
	}
}

/**
 * Parser unificado - detecta automaticamente o tipo e faz o parse
 */
export function parseBradescoFile(content: string): BradescoParseResult {
	const fileType = detectBradescoFileType(content)

	switch (fileType) {
		case 'extrato-csv':
			return parseExtratoBradescoCSV(content)
		case 'fatura-csv':
			return parseFaturaCSV(content)
		case 'ofx':
			return parseBradescoOFX(content)
		default:
			return {
				transactions: [],
				metadata: { banco: 'Bradesco', tipo: 'extrato', formato: 'csv' },
				errors: ['Formato de arquivo não reconhecido']
			}
	}
}
