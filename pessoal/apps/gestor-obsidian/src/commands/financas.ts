import * as fs from 'fs'
import { Command } from 'commander'
import { getVaultService } from '../services/vault.service.js'
import {
  type FinanceTableInput,
  type RecebimentosProjectionInput,
  buildFinancasMarkdownTable,
  formatNumberPtBR,
  projectRecebimentos,
} from '../utils/financas.js'
import { logger } from '../utils/logger.js'

const START_MARKER = '<!-- FINANCAS_TABLE_START -->'
const END_MARKER = '<!-- FINANCAS_TABLE_END -->'

function upsertBetweenMarkers(original: string, insert: string): string {
  const section = `${START_MARKER}\n${insert}\n${END_MARKER}`

  const startIdx = original.indexOf(START_MARKER)
  const endIdx = original.indexOf(END_MARKER)
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = original.slice(0, startIdx).trimEnd()
    const after = original.slice(endIdx + END_MARKER.length).trimStart()
    return `${before}\n\n${section}\n\n${after}`.trimEnd() + '\n'
  }

  // Se não houver marcadores, anexa no final.
  return `${original.trimEnd()}\n\n${section}\n`.trimEnd() + '\n'
}

export function createFinancasCommand(): Command {
  const financas = new Command('financas').description(
    'Calcula % Meta e Projeção Final e gera tabela Markdown'
  )

  financas
    .command('table')
    .description('Gera tabela Markdown a partir de um JSON')
    .requiredOption('-d, --data <path>', 'Caminho para JSON com metas e realizados')
    .option(
      '--write <relativePath>',
      'Escreve/atualiza a tabela dentro de uma nota do vault (usa marcadores)'
    )
    .action(async (options) => {
      try {
        const raw = fs.readFileSync(options.data, 'utf-8')
        const parsed = JSON.parse(raw) as FinanceTableInput

        const table = buildFinancasMarkdownTable(parsed)
        console.log(table)

        if (options.write) {
          const vault = getVaultService()
          const existing = vault.readFile(options.write) ?? ''
          const updated = upsertBetweenMarkers(existing, table)
          vault.writeFile(options.write, updated)
          logger.info(`Finanças: tabela atualizada em ${options.write}`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        logger.error(message)
        console.error(`✗ Erro: ${message}`)
        process.exit(1)
      }
    })

  financas
    .command('recebimentos')
    .description(
      'Projeta recebimentos considerando prazos por método (PIX D+1, boleto D+5, cartão D+30)'
    )
    .requiredOption(
      '-d, --data <path>',
      'Caminho para JSON com receivedToDate e lista de pendências'
    )
    .action(async (options) => {
      try {
        const raw = fs.readFileSync(options.data, 'utf-8')
        const parsed = JSON.parse(raw) as RecebimentosProjectionInput
        const res = projectRecebimentos(parsed)

        console.log(`As of: ${res.asOf.toISOString().slice(0, 10)}`)
        console.log(`Recebido no mês até hoje: R$ ${formatNumberPtBR(res.receivedToDate, 2)}`)
        console.log(
          `Previsto a creditar até o fim do mês: R$ ${formatNumberPtBR(res.projectedRemainingInMonth, 2)}`
        )
        console.log(`TOTAL projetado no mês: R$ ${formatNumberPtBR(res.projectedTotalInMonth, 2)}`)
        console.log(
          `Previsto para cair após o mês: R$ ${formatNumberPtBR(res.projectedAfterMonth, 2)}`
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        logger.error(message)
        console.error(`✗ Erro: ${message}`)
        process.exit(1)
      }
    })

  return financas
}
