/**
 * Script de Importação em Batch
 *
 * Importa extratos e faturas do diretório "financeiro pessoal"
 *
 * Uso: bun run scripts/import-extratos.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import iconv from 'iconv-lite'

// =============================================================================
// Tipos
// =============================================================================

interface ParsedTransaction {
  data: Date
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa' | 'transferencia'
  titular?: string
  observacoes?: string
  parcela?: { numero: number; total: number }
}

interface ImportResult {
  arquivo: string
  transacoes: ParsedTransaction[]
  erros: string[]
}

interface AccountConfig {
  id: string
  nome: string
  tipo: 'corrente' | 'cartao'
  instituicao: string
}

// =============================================================================
// Configuração
// =============================================================================

const EXTRATOS_DIR = '/Users/guilhermebarros/Documents/financeiro pessoal/Extratos e Faturas'

const ACCOUNTS: AccountConfig[] = [
  { id: 'bradesco-cc', nome: 'Bradesco Conta Corrente', tipo: 'corrente', instituicao: 'Bradesco' },
  { id: 'amex-platinum', nome: 'Amex Platinum', tipo: 'cartao', instituicao: 'American Express' },
  { id: 'amex-aeternum', nome: 'Amex Aeternum', tipo: 'cartao', instituicao: 'American Express' },
]

// Titulares conhecidos
const TITULARES = {
  'GUILHERME BARROS': 'guilherme',
  'DANIELLA P TORRES': 'daniella',
  'DANIELLA BARROS': 'daniella',
}

// =============================================================================
// Parsers
// =============================================================================

/**
 * Lê arquivo com encoding Latin-1 e converte para UTF-8
 * Também normaliza line endings para \n
 */
function readFileWithEncoding(filePath: string): string {
  const buffer = readFileSync(filePath)
  // Tenta detectar encoding - arquivos brasileiros geralmente são Latin-1
  let content = iconv.decode(buffer, 'latin1')
  // Normaliza line endings: \r\n -> \n, \r -> \n
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return content
}

/**
 * Parse de valor brasileiro (1.234,56 -> 1234.56)
 */
function parseValorBR(valorStr: string): number {
  if (!valorStr || valorStr.trim() === '') return 0

  // Remove aspas, R$, espaços, e caracteres especiais
  let clean = valorStr.replace(/["'R$\s]/g, '').trim()

  // Detecta valores negativos entre parênteses ou com sinal
  const isNegative = clean.includes('(') || clean.startsWith('-')
  clean = clean.replace(/[()]/g, '')
  if (clean.startsWith('-')) clean = clean.substring(1)

  // Formato brasileiro: 1.234,56
  // Remove pontos de milhar, troca vírgula por ponto
  clean = clean.replace(/\./g, '').replace(',', '.')

  const valor = parseFloat(clean)
  if (isNaN(valor)) return 0
  return isNegative ? -valor : valor
}

/**
 * Parse de data brasileira (DD/MM/YY ou DD/MM/YYYY)
 */
function parseDataBR(dataStr: string): Date | null {
  if (!dataStr || dataStr.trim() === '') return null

  const clean = dataStr.trim()
  const parts = clean.split('/')

  if (parts.length !== 3) return null

  const dia = parseInt(parts[0] ?? '0')
  const mes = parseInt(parts[1] ?? '0') - 1
  let ano = parseInt(parts[2] ?? '0')

  // Ano com 2 dígitos
  if (ano < 100) {
    ano += ano > 50 ? 1900 : 2000
  }

  const data = new Date(ano, mes, dia)
  return isNaN(data.getTime()) ? null : data
}

/**
 * Detecta parcelas na descrição (ex: "COMPRA 3/12")
 */
function detectarParcela(descricao: string): { numero: number; total: number } | undefined {
  const match = descricao.match(/(\d+)\/(\d+)$/)
  if (match && match[1] && match[2]) {
    const numero = parseInt(match[1])
    const total = parseInt(match[2])
    if (total > 1 && numero <= total) {
      return { numero, total }
    }
  }
  return undefined
}

// =============================================================================
// Parser Bradesco CSV
// =============================================================================

function parseBradescoCSV(content: string, fileName: string): ImportResult {
  const transacoes: ParsedTransaction[] = []
  const erros: string[] = []

  const lines = content.split('\n')
  let inMainSection = false
  let inUltimosSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? ''

    // Pula linhas vazias
    if (!line) continue

    // Detecta início da seção principal (após header)
    if (line.startsWith('Data;Histórico') || line.startsWith('Data;Hist')) {
      inMainSection = true
      continue
    }

    // Detecta seção "Últimos Lançamentos" (ignorar)
    if (line.includes('Últimos Lançamentos') || line.includes('ltimos Lan')) {
      inUltimosSection = true
      continue
    }

    // Ignora rodapé
    if (line.startsWith('Total;') || line.startsWith('Os dados acima')) {
      inMainSection = false
      continue
    }

    if (!inMainSection || inUltimosSection) continue

    const cols = line.split(';')
    if (cols.length < 5) continue

    const dataStr = cols[0]?.trim() ?? ''
    const historico = cols[1]?.trim() ?? ''
    const creditoStr = cols[3]?.trim() ?? ''
    const debitoStr = cols[4]?.trim() ?? ''

    // Pula linhas de continuação (sem data)
    if (!dataStr || !historico) continue

    // Pula saldo anterior
    if (historico.includes('SALDO ANTERIOR')) continue

    const data = parseDataBR(dataStr)
    if (!data) {
      erros.push(`Linha ${i + 1}: Data inválida "${dataStr}"`)
      continue
    }

    // Determina valor (crédito positivo, débito negativo)
    let valor = 0
    let tipo: 'receita' | 'despesa' | 'transferencia' = 'despesa'

    const credito = parseValorBR(creditoStr)
    const debito = parseValorBR(debitoStr)

    if (credito > 0) {
      valor = credito
      tipo = 'receita'
    } else if (debito !== 0) {
      valor = Math.abs(debito)
      tipo = 'despesa'
    } else {
      continue // Sem valor
    }

    // Detecta transferências
    if (historico.toLowerCase().includes('transfe') || historico.toLowerCase().includes('pix')) {
      // PIX pode ser receita ou despesa dependendo do valor
      if (tipo === 'receita' && historico.toLowerCase().includes('rem:')) {
        tipo = 'receita' // Recebimento
      }
    }

    // Busca descrição adicional na próxima linha
    let descricao = historico
    const nextLine = lines[i + 1]?.trim() ?? ''
    if (nextLine && !nextLine.includes(';') && !nextLine.startsWith('Total')) {
      descricao += ' - ' + nextLine
    }

    transacoes.push({
      data,
      descricao: descricao.trim(),
      valor,
      tipo,
      parcela: detectarParcela(descricao),
    })
  }

  return { arquivo: fileName, transacoes, erros }
}

// =============================================================================
// Parser Amex/Aeternum CSV
// =============================================================================

function parseAmexCSV(content: string, fileName: string, isAeternum: boolean = false): ImportResult {
  const transacoes: ParsedTransaction[] = []
  const erros: string[] = []

  const lines = content.split('\n')
  let currentTitular: string | null = null
  let inTransactionSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? ''

    // Pula linhas vazias
    if (!line) continue

    // Detecta titular (nome seguido de ;;; e número do cartão)
    const titularMatch = line.match(/^([A-Z\s]+)\s*;\s*;\s*;\s*\d+/)
    if (titularMatch && titularMatch[1]) {
      const nome = titularMatch[1].trim()
      currentTitular = TITULARES[nome as keyof typeof TITULARES] ?? nome.toLowerCase()
      inTransactionSection = true
      continue
    }

    // Detecta header de transações
    if (line.startsWith('Data;Histórico') || line.startsWith('Data;Hist')) {
      continue
    }

    // Detecta fim das transações
    if (line.startsWith('Total da fatura') || line.startsWith('Resumo das Despesas')) {
      inTransactionSection = false
      continue
    }

    if (!inTransactionSection) continue

    const cols = line.split(';')
    if (cols.length < 4) continue

    const dataStr = cols[0]?.trim() ?? ''
    const historico = cols[1]?.trim() ?? ''
    const valorStr = cols[3]?.trim() ?? '' // Valor em R$

    // Pula linhas especiais
    if (!dataStr || !historico) continue
    if (historico.includes('SALDO ANTERIOR')) continue
    if (historico.includes('PAGTO.')) continue // Pagamento da fatura

    const data = parseDataBR(dataStr)
    if (!data) {
      // Data pode ser só DD/MM (sem ano) - assume ano atual ou do arquivo
      const yearMatch = fileName.match(/(\d{4})/)
      if (yearMatch && yearMatch[1]) {
        const year = parseInt(yearMatch[1])
        const parts = dataStr.split('/')
        if (parts.length === 2 && parts[0] && parts[1]) {
          const dia = parseInt(parts[0])
          const mes = parseInt(parts[1]) - 1
          const dataComAno = new Date(year, mes, dia)
          if (!isNaN(dataComAno.getTime())) {
            // Continua com esta data
            const valor = parseValorBR(valorStr)
            if (valor === 0) continue

            transacoes.push({
              data: dataComAno,
              descricao: historico.trim(),
              valor: Math.abs(valor),
              tipo: valor < 0 ? 'receita' : 'despesa', // Créditos são negativos na fatura
              titular: currentTitular ?? undefined,
              parcela: detectarParcela(historico),
            })
            continue
          }
        }
      }
      erros.push(`Linha ${i + 1}: Data inválida "${dataStr}"`)
      continue
    }

    const valor = parseValorBR(valorStr)
    if (valor === 0) continue

    transacoes.push({
      data,
      descricao: historico.trim(),
      valor: Math.abs(valor),
      tipo: valor < 0 ? 'receita' : 'despesa', // Créditos/estornos são negativos
      titular: currentTitular ?? undefined,
      parcela: detectarParcela(historico),
    })
  }

  return { arquivo: fileName, transacoes, erros }
}

// =============================================================================
// Processador Principal
// =============================================================================

function processDirectory(): Map<string, ImportResult[]> {
  const results = new Map<string, ImportResult[]>()

  // Inicializa resultados por conta
  results.set('bradesco-cc', [])
  results.set('amex-platinum', [])
  results.set('amex-aeternum', [])

  // Lista diretórios mensais
  const months = readdirSync(EXTRATOS_DIR)
    .filter(f => {
      const fullPath = join(EXTRATOS_DIR, f)
      return statSync(fullPath).isDirectory() && f.match(/^\d{4}-\d{2}$/)
    })
    .sort()

  console.log(`\nEncontrados ${months.length} meses de dados`)
  console.log('=' .repeat(60))

  for (const month of months) {
    const monthPath = join(EXTRATOS_DIR, month)
    const files = readdirSync(monthPath).filter(f => f.endsWith('.csv'))

    console.log(`\n${month}:`)

    for (const file of files) {
      const filePath = join(monthPath, file)
      const content = readFileWithEncoding(filePath)
      const fileName = `${month}/${file}`

      let result: ImportResult
      let accountId: string

      if (file.toLowerCase().includes('bradesco')) {
        result = parseBradescoCSV(content, fileName)
        accountId = 'bradesco-cc'
      } else if (file.toLowerCase().includes('aeternum')) {
        result = parseAmexCSV(content, fileName, true)
        accountId = 'amex-aeternum'
      } else if (file.toLowerCase().includes('amex')) {
        result = parseAmexCSV(content, fileName, false)
        accountId = 'amex-platinum'
      } else {
        console.log(`  ⚠️  ${file} - formato desconhecido, pulando`)
        continue
      }

      const accountResults = results.get(accountId)!
      accountResults.push(result)

      const errosStr = result.erros.length > 0 ? ` (${result.erros.length} erros)` : ''
      console.log(`  ✓ ${file}: ${result.transacoes.length} transações${errosStr}`)
    }
  }

  return results
}

// =============================================================================
// Geração de Output
// =============================================================================

function generateSummary(results: Map<string, ImportResult[]>): void {
  console.log('\n' + '='.repeat(60))
  console.log('RESUMO DA IMPORTAÇÃO')
  console.log('='.repeat(60))

  let totalTransacoes = 0
  let totalErros = 0

  for (const [accountId, accountResults] of results) {
    const account = ACCOUNTS.find(a => a.id === accountId)
    const transacoes = accountResults.flatMap(r => r.transacoes)
    const erros = accountResults.flatMap(r => r.erros)

    totalTransacoes += transacoes.length
    totalErros += erros.length

    // Calcula totais por tipo
    const receitas = transacoes.filter(t => t.tipo === 'receita')
    const despesas = transacoes.filter(t => t.tipo === 'despesa')
    const totalReceitas = receitas.reduce((sum, t) => sum + t.valor, 0)
    const totalDespesas = despesas.reduce((sum, t) => sum + t.valor, 0)

    console.log(`\n${account?.nome ?? accountId}:`)
    console.log(`  Transações: ${transacoes.length}`)
    console.log(`  Receitas: ${receitas.length} (R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`)
    console.log(`  Despesas: ${despesas.length} (R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`)

    if (erros.length > 0) {
      console.log(`  ⚠️  Erros: ${erros.length}`)
    }
  }

  console.log('\n' + '-'.repeat(60))
  console.log(`TOTAL: ${totalTransacoes} transações, ${totalErros} erros`)
}

function generateJSON(results: Map<string, ImportResult[]>): string {
  const output: Record<string, any> = {
    generated_at: new Date().toISOString(),
    accounts: {},
  }

  for (const [accountId, accountResults] of results) {
    const account = ACCOUNTS.find(a => a.id === accountId)
    const transacoes = accountResults.flatMap(r => r.transacoes)

    output.accounts[accountId] = {
      nome: account?.nome,
      tipo: account?.tipo,
      instituicao: account?.instituicao,
      transacoes: transacoes.map(t => ({
        data: t.data.toISOString().split('T')[0],
        descricao: t.descricao,
        valor: t.valor,
        tipo: t.tipo,
        titular: t.titular,
        parcela: t.parcela,
      })),
    }
  }

  return JSON.stringify(output, null, 2)
}

function analyzePatterns(results: Map<string, ImportResult[]>): void {
  console.log('\n' + '='.repeat(60))
  console.log('ANÁLISE DE PADRÕES (para regras de classificação)')
  console.log('='.repeat(60))

  const allTransacoes = Array.from(results.values())
    .flatMap(r => r.flatMap(ir => ir.transacoes))

  // Agrupa por descrição normalizada
  const patterns = new Map<string, { count: number; total: number; exemplos: string[] }>()

  for (const t of allTransacoes) {
    // Normaliza descrição para encontrar padrões
    const normalized = t.descricao
      .toUpperCase()
      .replace(/\d+\/\d+$/, '') // Remove parcelas
      .replace(/\d{2}\/\d{2}$/, '') // Remove datas
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 3) // Primeiras 3 palavras
      .join(' ')

    if (!patterns.has(normalized)) {
      patterns.set(normalized, { count: 0, total: 0, exemplos: [] })
    }

    const p = patterns.get(normalized)!
    p.count++
    p.total += t.valor
    if (p.exemplos.length < 3) {
      p.exemplos.push(t.descricao)
    }
  }

  // Ordena por frequência
  const sortedPatterns = Array.from(patterns.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 30)

  console.log('\nTop 30 padrões mais frequentes:')
  console.log('-'.repeat(60))

  for (const [pattern, data] of sortedPatterns) {
    console.log(`\n"${pattern}" (${data.count}x, R$ ${data.total.toFixed(2)})`)
    console.log(`  Exemplos: ${data.exemplos.slice(0, 2).join(' | ')}`)
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('🏦 Importador de Extratos - Cortex Cash')
  console.log('='.repeat(60))
  console.log(`Diretório: ${EXTRATOS_DIR}`)

  // Processa todos os arquivos
  const results = processDirectory()

  // Gera resumo
  generateSummary(results)

  // Analisa padrões
  analyzePatterns(results)

  // Gera JSON para importação
  const json = generateJSON(results)
  const outputPath = join(EXTRATOS_DIR, 'importacao_processada.json')

  // Salva JSON
  const { writeFileSync } = await import('fs')
  writeFileSync(outputPath, json, 'utf-8')
  console.log(`\n✅ JSON gerado: ${outputPath}`)

  console.log('\n' + '='.repeat(60))
  console.log('Próximos passos:')
  console.log('1. Revisar o JSON gerado')
  console.log('2. Executar: bun run scripts/import-to-db.ts')
  console.log('='.repeat(60))
}

main().catch(console.error)
