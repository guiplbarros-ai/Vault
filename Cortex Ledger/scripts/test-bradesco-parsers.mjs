#!/usr/bin/env node

/**
 * Script para testar os parsers do Bradesco com arquivos de exemplo
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const examplesDir = join(rootDir, 'exemplos-importacao')

// Função auxiliar para detectar tipo de arquivo
function detectBradescoFileType(content) {
	if (content.includes('OFXHEADER') || content.includes('<OFX>')) {
		return 'ofx'
	}
	if (content.includes('Extrato de:') && content.includes('Ag:')) {
		return 'extrato-csv'
	}
	// Verificar se tem "Situação" ou "Situa" (encoding issues)
	if (content.includes('Fatura:') && (content.includes('GUILHERME') || content.includes('Data:'))) {
		return 'fatura-csv'
	}
	return 'unknown'
}

// Parser simplificado de extrato CSV
function parseExtratoBradescoCSV(content) {
	// Normalizar quebras de linha
	const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
	const lines = normalized.split('\n').filter(l => l.trim())
	const transactions = []

	let headerIdx = -1
	for (let i = 0; i < Math.min(lines.length, 10); i++) {
		// Aceitar com ou sem acentos devido a encoding
		if (lines[i].includes('Data;') && (lines[i].includes('Hist') || lines[i].includes('rico'))) {
			headerIdx = i
			break
		}
	}

	if (headerIdx === -1) return { transactions, errors: ['Header not found'] }

	for (let i = headerIdx + 1; i < lines.length; i++) {
		const line = lines[i]
		// Parar nos marcadores de fim
		if (line.includes('Total;') || line.includes('ltimos') || line.includes('Últimos')) break
		// Ignorar linhas vazias ou de continuação
		if (line.startsWith(';;') || line.split(';').length < 5) continue

		const parts = line.split(';')
		if (parts.length < 6) continue

		const [data, historico, docto, credito, debito] = parts.map(p => p.trim())
		if (!data || !data.match(/\d{2}\/\d{2}\/\d{2}/)) continue

		const parseValor = (val) => {
			if (!val) return 0
			const cleaned = val.replace(/"/g, '').replace(/\./g, '').replace(',', '.')
			return parseFloat(cleaned) || 0
		}

		const valorCredito = parseValor(credito)
		const valorDebito = parseValor(debito)

		if (valorCredito > 0) {
			transactions.push({ data, descricao: historico, valor: valorCredito, tipo: 'credito' })
		}
		if (valorDebito > 0) {
			transactions.push({ data, descricao: historico, valor: valorDebito, tipo: 'debito' })
		}
	}

	return { transactions, errors: [] }
}

// Parser simplificado de fatura CSV
function parseFaturaCSV(content) {
	// Normalizar quebras de linha
	const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
	const lines = normalized.split('\n').filter(l => l.trim())
	const transactions = []

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		if (line.match(/^\d{2}\/\d{2};/)) {
			const parts = line.split(';')
			if (parts.length >= 4) {
				const [data, historico, , valorBRL] = parts.map(p => p.trim())

				const parseValor = (val) => {
					if (!val) return 0
					const cleaned = val.replace(/"/g, '').replace(/\./g, '').replace(',', '.')
					return parseFloat(cleaned) || 0
				}

				const valor = parseValor(valorBRL)
				if (valor !== 0) {
					transactions.push({
						data,
						descricao: historico,
						valor: Math.abs(valor),
						tipo: valor < 0 ? 'credito' : 'debito'
					})
				}
			}
		}

		// Parar no resumo (com ou sem acentos)
		if (line.includes('Total da fatura') || line.includes('Resumo das')) break
	}

	return { transactions, errors: [] }
}

// Parser simplificado de OFX
function parseBradescoOFX(content) {
	const transactions = []
	const stmtTrnRegex = /<STMTTRN>[\s\S]*?<\/STMTTRN>/gi
	const matches = content.match(stmtTrnRegex) || []

	for (const block of matches) {
		const getTag = (tag) => {
			const match = block.match(new RegExp(`<${tag}>([^\n\r<]+)`))
			return match?.[1]?.trim() || ''
		}

		const trnType = getTag('TRNTYPE')
		const dtPosted = getTag('DTPOSTED')
		const trnAmt = getTag('TRNAMT')
		const memo = getTag('MEMO')

		const convertDate = (ofxDate) => {
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
			tipo: isCredito ? 'credito' : 'debito'
		})
	}

	return { transactions, errors: [] }
}

// Função principal de parse
function parseBradescoFile(content, fileType) {
	switch (fileType) {
		case 'extrato-csv':
			return parseExtratoBradescoCSV(content)
		case 'fatura-csv':
			return parseFaturaCSV(content)
		case 'ofx':
			return parseBradescoOFX(content)
		default:
			return { transactions: [], errors: ['Unknown file type'] }
	}
}

// Testar todos os arquivos
console.log('🧪 Testando parsers do Bradesco...\n')

const files = [
	'extrato bradesco julho.csv',
	'extrato bradesco julho.ofx',
	'amex julho.csv',
	'aeternum julho.csv'
]

for (const filename of files) {
	console.log(`\n📄 Arquivo: ${filename}`)
	console.log('─'.repeat(60))

	try {
		const filepath = join(examplesDir, filename)
		const content = readFileSync(filepath, 'utf8')
		const fileType = detectBradescoFileType(content)

		console.log(`Tipo detectado: ${fileType}`)

		const result = parseBradescoFile(content, fileType)

		console.log(`✅ Transações encontradas: ${result.transactions.length}`)

		if (result.errors.length > 0) {
			console.log(`⚠️  Erros: ${result.errors.join(', ')}`)
		}

		// Mostrar primeiras 3 transações
		if (result.transactions.length > 0) {
			console.log('\nPrimeiras 3 transações:')
			result.transactions.slice(0, 3).forEach((t, idx) => {
				console.log(`  ${idx + 1}. ${t.data} - ${t.descricao.substring(0, 40)} - R$ ${t.valor.toFixed(2)} (${t.tipo})`)
			})
		}

		// Calcular totais
		const totalCredito = result.transactions
			.filter(t => t.tipo === 'credito')
			.reduce((sum, t) => sum + t.valor, 0)

		const totalDebito = result.transactions
			.filter(t => t.tipo === 'debito')
			.reduce((sum, t) => sum + t.valor, 0)

		console.log(`\n💰 Total Créditos: R$ ${totalCredito.toFixed(2)}`)
		console.log(`💸 Total Débitos: R$ ${totalDebito.toFixed(2)}`)
		console.log(`📊 Saldo: R$ ${(totalCredito - totalDebito).toFixed(2)}`)

	} catch (error) {
		console.log(`❌ Erro: ${error.message}`)
	}
}

console.log('\n\n✅ Testes concluídos!')
