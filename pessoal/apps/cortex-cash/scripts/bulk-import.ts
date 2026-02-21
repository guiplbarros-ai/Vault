/**
 * Script de importação em lote de extratos e faturas
 *
 * Uso: bun run scripts/bulk-import.ts
 *
 * Este script:
 * 1. Cria as instituições (Bradesco, Amex, Aeternum)
 * 2. Cria as contas bancárias/cartões
 * 3. Importa todos os CSVs da pasta imports/Extratos e Faturas
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'date-fns'

// Types
interface RawTransaction {
  data: Date
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa'
  origem_arquivo: string
  origem_linha: number
}

interface ParseResult {
  transacoes: RawTransaction[]
  erros: string[]
  saldoFinal?: number
}

// Helper para normalizar valores monetários brasileiros
function parseMonetaryValue(value: string): number {
  if (!value || value.trim() === '') return 0
  // Remove aspas, R$, espaços, pontos de milhar
  let clean = value.replace(/"/g, '').replace(/R\$\s*/gi, '').replace(/\s/g, '').replace(/\./g, '')
  // Troca vírgula decimal por ponto
  clean = clean.replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

// Helper para normalizar datas
function parseDate(dateStr: string, yearContext?: number): Date | null {
  if (!dateStr || dateStr.trim() === '') return null

  const clean = dateStr.trim()

  // Formato dd/MM/yy (Bradesco)
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(clean)) {
    const [day, month, year] = clean.split('/') as [string, string, string]
    const fullYear = parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year)
    return new Date(fullYear, parseInt(month) - 1, parseInt(day))
  }

  // Formato dd/MM (Amex/Aeternum) - precisa do ano do contexto
  if (/^\d{2}\/\d{2}$/.test(clean)) {
    const [day, month] = clean.split('/') as [string, string]
    const year = yearContext || new Date().getFullYear()
    return new Date(year, parseInt(month) - 1, parseInt(day))
  }

  // Formato dd/MM/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [day, month, year] = clean.split('/') as [string, string, string]
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  return null
}

// Parser para Bradesco CSV
function parseBradescoCSV(content: string, filename: string): ParseResult {
  // Normaliza quebras de linha (Mac usa \r, Windows usa \r\n, Unix usa \n)
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedContent.split('\n')
  const transacoes: RawTransaction[] = []
  const erros: string[] = []
  let saldoFinal: number | undefined

  // Pula a primeira linha (header com info da conta)
  // Segunda linha tem os nomes das colunas
  // Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$);

  let dataSection = false
  let lineNumber = 0

  for (const rawLine of lines) {
    lineNumber++
    const line = rawLine.trim()
    if (!line) continue

    // Detecta início da seção de dados (handle encoding issues with accents)
    const lineStart = line.substring(0, 10)
    if (lineStart.startsWith('Data;Hist')) {
      dataSection = true
      continue
    }

    // Detecta fim da seção de dados
    if (line.startsWith('Os dados acima') || line.startsWith('Últimos Lançamentos') || line.includes('Total;;')) {
      // Captura saldo total se disponível
      if (line.includes('Total;;')) {
        const parts = line.split(';')
        const saldoStr = parts[parts.length - 1] || parts[parts.length - 2]
        if (saldoStr) {
          saldoFinal = parseMonetaryValue(saldoStr)
        }
      }
      dataSection = false
      continue
    }

    if (!dataSection) continue

    // Parse da linha de transação
    const parts = line.split(';')
    if (parts.length < 5) continue

    const dataStr = parts[0]?.trim()
    const historico = parts[1]?.trim()
    const credito = parts[3]?.trim()
    const debito = parts[4]?.trim()

    // Ignora linhas que não são transações
    if (!dataStr || historico === 'SALDO ANTERIOR') continue
    if (historico?.includes('Total')) continue

    // Ignora linhas de complemento (começam sem data)
    if (!dataStr.match(/^\d{2}\/\d{2}/)) continue

    const data = parseDate(dataStr)
    if (!data) {
      erros.push(`Linha ${lineNumber}: Data inválida "${dataStr}"`)
      continue
    }

    // Determina valor e tipo
    let valor = 0
    let tipo: 'receita' | 'despesa' = 'despesa'

    const creditoVal = parseMonetaryValue(credito ?? '')
    const debitoVal = parseMonetaryValue(debito ?? '')

    if (creditoVal > 0) {
      valor = creditoVal
      tipo = 'receita'
    } else if (debitoVal !== 0) {
      valor = Math.abs(debitoVal)
      tipo = 'despesa'
    } else {
      continue // Sem valor
    }

    if (valor === 0) continue

    transacoes.push({
      data,
      descricao: historico || 'Sem descrição',
      valor,
      tipo,
      origem_arquivo: filename,
      origem_linha: lineNumber,
    })
  }

  return { transacoes, erros, saldoFinal }
}

// Parser para Amex/Aeternum CSV
function parseAmexCSV(content: string, filename: string): ParseResult {
  // Normaliza quebras de linha
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedContent.split('\n')
  const transacoes: RawTransaction[] = []
  const erros: string[] = []

  // Extrai ano do contexto do arquivo
  // Ex: "Data: 25/10/2025 07:14:14"
  let yearContext = new Date().getFullYear()
  const dateMatch = content.match(/Data:\s*(\d{2})\/(\d{2})\/(\d{4})/)
  if (dateMatch) {
    yearContext = parseInt(dateMatch[3]!)
  }

  // Extrai mês do nome do arquivo para ajustar ano corretamente
  // Ex: "amex dezembro-24.csv" -> dezembro de 2024
  const monthMatch = filename.match(/(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[_-]?(\d{2})?/i)
  const monthNames: Record<string, number> = {
    janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4,
    maio: 5, junho: 6, julho: 7, agosto: 8,
    setembro: 9, outubro: 10, novembro: 11, dezembro: 12
  }
  let fileMonth = 0
  let fileYear = yearContext
  if (monthMatch) {
    const monthName = monthMatch[1]!.toLowerCase().replace('ç', 'c')
    fileMonth = monthNames[monthName] || 0
    if (monthMatch[2]) {
      fileYear = parseInt(monthMatch[2]) > 50 ? 1900 + parseInt(monthMatch[2]) : 2000 + parseInt(monthMatch[2])
    }
  }

  let dataSection = false
  let lineNumber = 0
  let currentCardHolder = 'Titular'

  for (const rawLine of lines) {
    lineNumber++
    const line = rawLine.trim()
    if (!line) continue

    // Detecta nome do titular (formato: "GUILHERME BARROS ;;; 09294")
    if (line.match(/^[A-Z\s]+ ;;; \d+$/)) {
      currentCardHolder = line.split(';;;')[0]!.trim()
      dataSection = false
      continue
    }

    // Detecta header de seção de dados
    if (line.startsWith('Data;Hist')) {
      dataSection = true
      continue
    }

    // Detecta fim da seção
    if (line.startsWith('Total da fatura') || line.startsWith('Resumo das Despesas')) {
      dataSection = false
      continue
    }

    if (!dataSection) continue

    // Parse da linha de transação
    // Formato: Data;Histórico;Valor(US$);Valor(R$);
    const parts = line.split(';')
    if (parts.length < 4) continue

    const dataStr = parts[0]?.trim()
    const historico = parts[1]?.trim()
    const valorBRL = parts[3]?.trim()

    // Ignora linhas especiais
    if (!dataStr || dataStr === 'SALDO ANTERIOR') continue
    if (historico?.includes('PAGTO. POR DEB')) continue // Pagamento de fatura

    // Ignora linhas que começam com descrição em vez de data
    if (!dataStr.match(/^\d{2}\/\d{2}/)) continue

    // Calcula o ano correto baseado no mês da transação
    let transactionYear = fileYear
    const [day, month] = dataStr.split('/') as [string, string]
    const txMonth = parseInt(month)

    // Se o mês da transação é maior que o mês do arquivo, é do ano anterior
    // Ex: arquivo de janeiro-25, transação de 30/12 -> 2024
    if (fileMonth > 0 && txMonth > fileMonth) {
      transactionYear = fileYear - 1
    }

    const data = parseDate(dataStr, transactionYear)
    if (!data) {
      erros.push(`Linha ${lineNumber}: Data inválida "${dataStr}"`)
      continue
    }

    const valor = parseMonetaryValue(valorBRL ?? '')
    if (valor === 0) continue

    // Valores negativos são estornos (créditos)
    const tipo: 'receita' | 'despesa' = valor < 0 ? 'receita' : 'despesa'

    transacoes.push({
      data,
      descricao: `${historico}${currentCardHolder !== 'GUILHERME BARROS' ? ` (${currentCardHolder})` : ''}`,
      valor: Math.abs(valor),
      tipo,
      origem_arquivo: filename,
      origem_linha: lineNumber,
    })
  }

  return { transacoes, erros }
}

// Detecta tipo de arquivo e faz o parse
function parseFile(filepath: string): ParseResult {
  const filename = path.basename(filepath)
  const content = fs.readFileSync(filepath, 'latin1') // ISO-8859-1

  if (filename.toLowerCase().includes('bradesco')) {
    return parseBradescoCSV(content, filename)
  } else if (filename.toLowerCase().includes('amex') || filename.toLowerCase().includes('aeternum')) {
    return parseAmexCSV(content, filename)
  }

  return { transacoes: [], erros: [`Tipo de arquivo não reconhecido: ${filename}`] }
}

// Encontra todos os arquivos CSV na pasta
function findCSVFiles(baseDir: string): string[] {
  const files: string[] = []

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath)
      } else if (entry.name.endsWith('.csv') && !entry.name.startsWith('.')) {
        files.push(fullPath)
      }
    }
  }

  scanDir(baseDir)
  return files.sort()
}

// Gera hash para deduplicação
// Usa apenas conta|data|descricao|valor para detectar duplicatas do banco
// (ex: mesmo "Rendimentos" aparece em múltiplos arquivos OFX mensais)
// Transações legítimas de mesmo valor/data mas descrições diferentes serão preservadas
function generateHash(conta: string, data: Date, descricao: string, valor: number): string {
  const dateStr = data.toISOString().split('T')[0]
  const descClean = descricao.toUpperCase().trim()
  const valorStr = valor.toFixed(2)
  const str = `${conta}|${dateStr}|${descClean}|${valorStr}`
  // Simple hash for Node.js
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(str).digest('hex')
}

// Main
async function main() {
  const importsDir = path.join(__dirname, '..', 'imports', 'Extratos e Faturas')

  console.log('========================================')
  console.log('IMPORTAÇÃO EM LOTE - CORTEX CASH')
  console.log('========================================\n')

  // 1. Encontra todos os arquivos
  const csvFiles = findCSVFiles(importsDir)
  console.log(`Encontrados ${csvFiles.length} arquivos CSV\n`)

  // 2. Agrupa por tipo de conta
  const byAccount: Record<string, string[]> = {
    bradesco: [],
    amex: [],
    aeternum: [],
  }

  for (const file of csvFiles) {
    const filename = path.basename(file).toLowerCase()
    if (filename.includes('bradesco')) {
      byAccount.bradesco!.push(file)
    } else if (filename.includes('amex')) {
      byAccount.amex!.push(file)
    } else if (filename.includes('aeternum')) {
      byAccount.aeternum!.push(file)
    }
  }

  // 3. Processa cada conta
  const allTransactions: Array<RawTransaction & { conta: string }> = []
  const seenHashes = new Set<string>()
  let totalDuplicates = 0

  for (const [conta, files] of Object.entries(byAccount)) {
    console.log(`\n--- ${conta.toUpperCase()} (${files.length} arquivos) ---`)

    for (const file of files) {
      const result = parseFile(file)
      const filename = path.basename(file)

      if (result.erros.length > 0) {
        console.log(`  ⚠ ${filename}: ${result.erros.length} erros`)
      }

      let added = 0
      let duplicates = 0

      for (const tx of result.transacoes) {
        const hash = generateHash(conta, tx.data, tx.descricao, tx.valor)
        if (seenHashes.has(hash)) {
          duplicates++
          totalDuplicates++
        } else {
          seenHashes.add(hash)
          allTransactions.push({ ...tx, conta })
          added++
        }
      }

      console.log(`  ✓ ${filename}: ${added} transações${duplicates > 0 ? ` (${duplicates} duplicadas)` : ''}`)
    }
  }

  console.log('\n========================================')
  console.log('RESUMO')
  console.log('========================================')
  console.log(`Total de transações únicas: ${allTransactions.length}`)
  console.log(`Duplicatas removidas: ${totalDuplicates}`)

  // 4. Estatísticas por conta
  const stats: Record<string, { count: number; receitas: number; despesas: number }> = {}

  for (const tx of allTransactions) {
    if (!stats[tx.conta]) {
      stats[tx.conta] = { count: 0, receitas: 0, despesas: 0 }
    }
    const s = stats[tx.conta]!
    s.count++
    if (tx.tipo === 'receita') {
      s.receitas += tx.valor
    } else {
      s.despesas += tx.valor
    }
  }

  console.log('\nPor conta:')
  for (const [conta, stat] of Object.entries(stats)) {
    console.log(`  ${conta}: ${stat.count} transações`)
    console.log(`    Receitas: R$ ${stat.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    console.log(`    Despesas: R$ ${stat.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  }

  // 5. Range de datas
  const dates = allTransactions.map((tx) => tx.data.getTime())
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))
  console.log(`\nPeríodo: ${minDate.toLocaleDateString('pt-BR')} a ${maxDate.toLocaleDateString('pt-BR')}`)

  // 6. Gera JSON para importação
  const outputPath = path.join(importsDir, 'importacao_processada.json')
  const output = {
    generated_at: new Date().toISOString(),
    stats: {
      total_transacoes: allTransactions.length,
      duplicatas_removidas: totalDuplicates,
      periodo: {
        inicio: minDate.toISOString(),
        fim: maxDate.toISOString(),
      },
      por_conta: stats,
    },
    institutions: {
      bradesco: {
        nome: 'Bradesco',
        codigo: '237',
        cor: '#CC092F',
      },
      amex: {
        nome: 'American Express',
        codigo: 'AMEX',
        cor: '#006FCF',
      },
      aeternum: {
        nome: 'Aeternum',
        codigo: 'AETERNUM',
        cor: '#1A1A2E',
      },
    },
    accounts: {
      bradesco: {
        nome: 'Bradesco Conta Corrente',
        tipo: 'corrente',
        instituicao: 'bradesco',
        agencia: '513',
        numero: '21121-4',
      },
      amex: {
        nome: 'American Express',
        tipo: 'cartao_credito',
        instituicao: 'amex',
      },
      aeternum: {
        nome: 'Aeternum',
        tipo: 'cartao_credito',
        instituicao: 'aeternum',
      },
    },
    transactions: allTransactions.map((tx) => ({
      conta: tx.conta,
      data: tx.data.toISOString(),
      descricao: tx.descricao,
      valor: tx.valor,
      tipo: tx.tipo,
      origem_arquivo: tx.origem_arquivo,
      origem_linha: tx.origem_linha,
    })),
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\n✓ Arquivo JSON gerado: ${outputPath}`)

  console.log('\n========================================')
  console.log('PRÓXIMO PASSO')
  console.log('========================================')
  console.log('Execute o app e importe o arquivo JSON gerado:')
  console.log('1. Abra http://localhost:3000')
  console.log('2. Vá em Settings > Backup > Restaurar')
  console.log('3. Ou use o endpoint /api/import/bulk')
  console.log('')
}

main().catch(console.error)
