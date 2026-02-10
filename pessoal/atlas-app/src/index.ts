#!/usr/bin/env node

import { Command } from 'commander'
import { searchFlights, formatSearchSummary, isConfigured } from './services/flight-search.service.js'
import { getRoutesDbService } from './services/routes-db.service.js'
import { getPriceAlertService } from './services/price-alert.service.js'
import { getDailyDigestService } from './services/daily-digest.service.js'
import { getTelegramService } from './services/telegram.service.js'
import { getUsageDbService } from './services/usage-db.service.js'
import { isSupabaseConfigured, testSupabaseConnection } from './services/supabase.service.js'
import { isKiwiConfigured } from './services/kiwi.service.js'
import { isSerpApiConfigured } from './services/serpapi.service.js'
import { isAmadeusConfigured } from './services/amadeus.service.js'
import { loadEnv } from './utils/env.js'
import { logger } from './utils/logger.js'
import { formatRoute, isValidIata, normalizeIata } from './utils/airports.js'
import { parseDateInput, formatDate } from './utils/date.js'
import { addDays } from 'date-fns'

loadEnv()

const program = new Command()

program
  .name('atlas')
  .description('Monitor de passagens aereas')
  .version('1.0.0')

// Comando: status
program
  .command('status')
  .description('Verifica status das configuracoes')
  .action(async () => {
    console.log('\nAtlas - Status\n')

    console.log('Supabase:')
    if (isSupabaseConfigured()) {
      const connected = await testSupabaseConnection()
      console.log(`  Configurado: sim`)
      console.log(`  Conectado: ${connected ? 'sim' : 'NAO'}`)
    } else {
      console.log('  Configurado: NAO')
    }

    console.log('\nProvedores de busca:')
    console.log(`  SerpAPI: ${isSerpApiConfigured() ? 'sim (principal - Google Flights)' : 'NAO'}`)
    console.log(`  Kiwi: ${isKiwiConfigured() ? 'sim (secundario)' : 'NAO'}`)
    console.log(`  Amadeus: ${isAmadeusConfigured() ? 'sim (TEST API - dados nao confiaveis)' : 'NAO'}`)

    console.log('\nTelegram:')
    console.log(`  Configurado: ${getTelegramService().enabled() ? 'sim' : 'NAO'}`)

    if (!isConfigured()) {
      console.log('\nAVISO: Nenhum provedor de busca configurado!')
      console.log('Configure KIWI_API_KEY ou SERPAPI_API_KEY no .env')
    }

    console.log()
  })

// Comando: search
program
  .command('search <origin> <destination> [date]')
  .description('Busca voos (ex: atlas search GRU LIS 15/03)')
  .option('-r, --return <date>', 'Data de retorno')
  .option('-d, --direct', 'Apenas voos diretos')
  .action(async (origin: string, destination: string, date: string | undefined, options) => {
    if (!isConfigured()) {
      console.error('Erro: Nenhum provedor de busca configurado')
      process.exit(1)
    }

    const originIata = normalizeIata(origin)
    const destIata = normalizeIata(destination)

    if (!isValidIata(originIata) || !isValidIata(destIata)) {
      console.error('Erro: Codigo IATA invalido. Use 3 letras (ex: GRU, LIS)')
      process.exit(1)
    }

    // Se nao informou data, usa 30 dias a frente
    const departureDate = date ? parseDateInput(date) : addDays(new Date(), 30)
    if (!departureDate) {
      console.error('Erro: Data invalida. Use formato dd/mm ou dd/mm/yyyy')
      process.exit(1)
    }

    const returnDate = options.return ? parseDateInput(options.return) : undefined

    console.log(`\nBuscando voos ${formatRoute(originIata, destIata)}`)
    console.log(`Data: ${formatDate(departureDate)}`)
    if (returnDate) {
      console.log(`Retorno: ${formatDate(returnDate)}`)
    }
    console.log()

    try {
      const result = await searchFlights({
        origin: originIata,
        destination: destIata,
        departureDate,
        returnDate: returnDate ?? undefined,
        directOnly: options.direct,
      })

      console.log(formatSearchSummary(result))
    } catch (error) {
      console.error(`Erro: ${error}`)
      process.exit(1)
    }
  })

// Comando: routes
program
  .command('routes')
  .description('Lista rotas monitoradas')
  .action(async () => {
    if (!isSupabaseConfigured()) {
      console.error('Erro: Supabase nao configurado')
      process.exit(1)
    }

    const routesDb = getRoutesDbService()
    const routes = await routesDb.getAllActiveRoutes()

    if (routes.length === 0) {
      console.log('\nNenhuma rota monitorada.')
      return
    }

    console.log(`\nRotas monitoradas (${routes.length}):\n`)
    for (const route of routes) {
      const formatted = formatRoute(route.origin, route.destination)
      console.log(`- ${formatted}`)
      console.log(`  Chat: ${route.chatId}`)
      if (route.targetPrice) {
        console.log(`  Preco alvo: R$ ${route.targetPrice}`)
      }
      console.log()
    }
  })

// Comando: route add
program
  .command('route:add <origin> <destination>')
  .description('Adiciona uma rota para monitorar (ex: route:add CNF NRT)')
  .option('-c, --chat <id>', 'Chat ID do Telegram', '0')
  .option('-p, --price <value>', 'Preco alvo em reais')
  .action(async (origin: string, destination: string, options) => {
    if (!isSupabaseConfigured()) {
      console.error('Erro: Supabase nao configurado')
      process.exit(1)
    }

    const originIata = normalizeIata(origin)
    const destIata = normalizeIata(destination)

    if (!isValidIata(originIata) || !isValidIata(destIata)) {
      console.error('Erro: Codigo IATA invalido')
      process.exit(1)
    }

    const chatId = Number(options.chat) || 0
    const targetPrice = options.price ? Number(options.price) : undefined

    const routesDb = getRoutesDbService()

    try {
      const route = await routesDb.addRoute(chatId, originIata, destIata, { targetPrice })
      console.log(`\nRota adicionada: ${formatRoute(originIata, destIata)}`)
      console.log(`ID: ${route.id}`)
      console.log(`Chat: ${chatId || '(não configurado - atualize depois)'}`)
      if (targetPrice) {
        console.log(`Preco alvo: R$ ${targetPrice}`)
      }
    } catch (error) {
      console.error(`Erro: ${error}`)
      process.exit(1)
    }
  })

// Comando: route remove
program
  .command('route:remove <origin> <destination>')
  .description('Remove uma rota monitorada')
  .option('-c, --chat <id>', 'Chat ID do Telegram', '0')
  .action(async (origin: string, destination: string, options) => {
    if (!isSupabaseConfigured()) {
      console.error('Erro: Supabase nao configurado')
      process.exit(1)
    }

    const chatId = Number(options.chat) || 0
    const routesDb = getRoutesDbService()

    const removed = await routesDb.removeRoute(chatId, origin, destination)
    if (removed) {
      console.log(`Rota removida: ${formatRoute(origin, destination)}`)
    } else {
      console.log('Rota nao encontrada')
    }
  })

// Comando: check
program
  .command('check')
  .description('Executa verificacao de precos em todas as rotas')
  .action(async () => {
    if (!isSupabaseConfigured()) {
      console.error('Erro: Supabase nao configurado')
      process.exit(1)
    }

    if (!isConfigured()) {
      console.error('Erro: Nenhum provedor de busca configurado')
      process.exit(1)
    }

    console.log('\nIniciando verificacao de precos...\n')

    const alertService = getPriceAlertService()
    const deals = await alertService.checkAllRoutes()

    if (deals.length === 0) {
      console.log('Nenhum deal detectado.')
    } else {
      console.log(`Detectados ${deals.length} deal(s):\n`)
      for (const deal of deals) {
        const route = formatRoute(deal.flight.origin, deal.flight.destination)
        console.log(`- ${deal.type}: ${route}`)
        console.log(`  Preco: R$ ${deal.flight.price}`)
        if (deal.previousPrice) {
          console.log(`  Anterior: R$ ${deal.previousPrice}`)
        }
        if (deal.dropPercent) {
          console.log(`  Queda: ${deal.dropPercent.toFixed(1)}%`)
        }
        console.log()
      }
    }
  })

// Comando: bot
program
  .command('bot')
  .description('Inicia bot do Telegram em modo polling (desenvolvimento)')
  .action(async () => {
    const telegram = getTelegramService()

    if (!telegram.enabled()) {
      console.error('Erro: TELEGRAM_BOT_TOKEN nao configurado')
      process.exit(1)
    }

    console.log('Iniciando bot do Telegram...')
    telegram.startPolling()

    // Aguarda CTRL+C
    process.on('SIGINT', () => {
      console.log('\nEncerrando bot...')
      telegram.stopPolling()
      process.exit(0)
    })
  })

// Comando: digest
program
  .command('digest [chatId]')
  .description('Envia relatorio diario (para chatId ou todos os configurados)')
  .action(async (chatId?: string) => {
    if (!isSupabaseConfigured()) {
      console.error('Erro: Supabase nao configurado')
      process.exit(1)
    }

    const digestService = getDailyDigestService()

    if (chatId) {
      // Envia para um chat específico
      const id = Number(chatId)
      console.log(`\nGerando relatorio para chat ${id}...\n`)

      const report = await digestService.generateDigest(id)
      console.log(report.replace(/\*/g, '').replace(/_/g, '')) // Remove markdown para CLI

      // Envia para o Telegram
      const telegram = getTelegramService()
      if (telegram.enabled()) {
        await telegram.sendMessage(id, report)
        console.log('\nRelatorio enviado para o Telegram!')
      }
    } else {
      // Envia para todos os chats com digest habilitado
      console.log('\nEnviando digests...\n')
      await digestService.sendDailyDigests()
      console.log('Concluido!')
    }
  })

// Comando: usage
program
  .command('usage')
  .description('Mostra uso de API e budget restante')
  .action(async () => {
    if (!isSupabaseConfigured()) {
      console.error('Erro: Supabase nao configurado')
      process.exit(1)
    }

    const usageDb = getUsageDbService()

    console.log('\n=== Atlas - Uso de APIs ===\n')

    // Budget status
    const budgets = await usageDb.getBudgetStatus()
    console.log('Budget Mensal:')
    console.log('-'.repeat(50))

    for (const b of budgets) {
      const bar = generateProgressBar(b.percentUsed)
      console.log(`${b.provider.padEnd(10)} ${bar} ${b.used}/${b.limit} (${b.percentUsed.toFixed(1)}%)`)
      if (b.remaining < b.limit * 0.2) {
        console.log(`           ⚠️  Apenas ${b.remaining} calls restantes!`)
      }
    }

    // Monthly usage details
    const usage = await usageDb.getMonthlyUsage()
    if (usage.length > 0) {
      console.log('\nUso este mes:')
      console.log('-'.repeat(50))
      for (const u of usage) {
        console.log(`${u.provider.padEnd(10)} ${u.totalCalls} calls | $${u.totalCost.toFixed(2)} USD`)
      }
    }

    // Estimate remaining days
    const serpapiBudget = budgets.find(b => b.provider === 'serpapi')
    if (serpapiBudget && serpapiBudget.used > 0) {
      const daysInMonth = 30
      const daysPassed = new Date().getDate()
      const avgPerDay = serpapiBudget.used / daysPassed
      const daysRemaining = Math.floor(serpapiBudget.remaining / avgPerDay)

      console.log('\nEstimativa:')
      console.log('-'.repeat(50))
      console.log(`Media diaria: ${avgPerDay.toFixed(1)} calls/dia`)
      console.log(`Dias restantes com budget atual: ~${daysRemaining} dias`)
    }

    console.log()
  })

function generateProgressBar(percent: number): string {
  const width = 20
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `[${bar}]`
}

program.parse()
