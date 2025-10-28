import { formatCurrency, formatDate } from './utils'

interface ExportableTransaction {
  data: string
  descricao: string
  valor: number
  tipo?: string | null
  conta?: { apelido: string } | null
  categoria?: { nome: string; grupo: string } | null
}

/**
 * Exporta transações para formato CSV
 */
export function exportToCSV(
  transactions: ExportableTransaction[],
  filename: string = `transacoes_${new Date().toISOString().split('T')[0]}.csv`
) {
  // Definir cabeçalhos
  const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Conta', 'Categoria', 'Grupo']

  // Mapear transações para linhas CSV
  const rows = transactions.map((t) => [
    formatDate(t.data),
    `"${t.descricao.replace(/"/g, '""')}"`, // Escape aspas duplas
    t.valor.toFixed(2),
    t.tipo || '',
    t.conta?.apelido || '',
    t.categoria?.nome || '',
    t.categoria?.grupo || '',
  ])

  // Combinar cabeçalhos e linhas
  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  // Criar blob e download
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

/**
 * Exporta transações para formato Excel (TSV - Tab Separated Values)
 * Formato compatível com Excel sem dependências externas
 */
export function exportToExcel(
  transactions: ExportableTransaction[],
  filename: string = `transacoes_${new Date().toISOString().split('T')[0]}.xls`
) {
  // Definir cabeçalhos
  const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Conta', 'Categoria', 'Grupo']

  // Mapear transações para linhas
  const rows = transactions.map((t) => [
    formatDate(t.data),
    t.descricao,
    formatCurrency(t.valor),
    t.tipo || '-',
    t.conta?.apelido || '-',
    t.categoria?.nome || '-',
    t.categoria?.grupo || '-',
  ])

  // Criar tabela HTML (Excel pode abrir HTML como planilha)
  const html = `
    <html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #339686; color: white; font-weight: bold; padding: 8px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          .number { text-align: right; }
          .positive { color: green; }
          .negative { color: red; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row, index) => `
              <tr>
                ${row
                  .map((cell, cellIndex) => {
                    // Valor (coluna 2) com formatação especial
                    if (cellIndex === 2) {
                      const valor = transactions[index].valor
                      const className = valor >= 0 ? 'number positive' : 'number negative'
                      return `<td class="${className}">${cell}</td>`
                    }
                    return `<td>${cell}</td>`
                  })
                  .join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
    </html>
  `

  downloadFile(html, filename, 'application/vnd.ms-excel')
}

/**
 * Exporta dados de relatório completo (com métricas)
 */
export function exportRelatorioCompleto(
  transactions: ExportableTransaction[],
  metrics: {
    totalReceitas: number
    totalDespesas: number
    saldo: number
    periodo: string
  },
  filename: string = `relatorio_${new Date().toISOString().split('T')[0]}.csv`
) {
  const lines: string[] = []

  // Cabeçalho do relatório
  lines.push('RELATÓRIO FINANCEIRO - CORTEX LEDGER')
  lines.push(`Período: ${metrics.periodo}`)
  lines.push('')

  // Resumo
  lines.push('RESUMO FINANCEIRO')
  lines.push(`Total Receitas,${formatCurrency(metrics.totalReceitas)}`)
  lines.push(`Total Despesas,${formatCurrency(metrics.totalDespesas)}`)
  lines.push(`Saldo,${formatCurrency(metrics.saldo)}`)
  lines.push('')

  // Transações
  lines.push('TRANSAÇÕES')
  lines.push('Data,Descrição,Valor,Tipo,Conta,Categoria,Grupo')

  transactions.forEach((t) => {
    lines.push(
      [
        formatDate(t.data),
        `"${t.descricao.replace(/"/g, '""')}"`,
        t.valor.toFixed(2),
        t.tipo || '',
        t.conta?.apelido || '',
        t.categoria?.nome || '',
        t.categoria?.grupo || '',
      ].join(',')
    )
  })

  const csv = lines.join('\n')
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

/**
 * Helper para fazer download de arquivo
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
