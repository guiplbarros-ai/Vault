import { Command } from 'commander'
import { addHours, format, parse } from 'date-fns'
import { getCalendarService } from '../services/calendar.service.js'
import { logger } from '../utils/logger.js'

export function createCalendarCommand(): Command {
  const calendar = new Command('calendar')
    .alias('cal')
    .description('Gerencia eventos no Google Calendar')

  // Listar eventos de hoje
  calendar
    .command('today')
    .description('Lista eventos de hoje')
    .action(async () => {
      try {
        const service = getCalendarService()
        const events = await service.getTodayEvents()

        console.log('\n📅 Eventos de Hoje:\n')
        console.log(service.formatEventList(events))
        console.log(`\nTotal: ${events.length} evento(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Listar eventos da semana
  calendar
    .command('week')
    .description('Lista eventos dos próximos 7 dias')
    .action(async () => {
      try {
        const service = getCalendarService()
        const events = await service.getWeekEvents()

        console.log('\n📅 Eventos da Semana:\n')
        console.log(service.formatEventList(events))
        console.log(`\nTotal: ${events.length} evento(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Listar eventos
  calendar
    .command('list')
    .description('Lista próximos eventos')
    .option('-n, --max <number>', 'Número máximo de eventos', '10')
    .option('-q, --query <text>', 'Buscar eventos por texto')
    .option('-c, --calendar <id>', 'ID do calendário (default: primary)')
    .action(async (options) => {
      try {
        const service = getCalendarService()

        const events = await service.getEvents({
          maxResults: Number.parseInt(options.max),
          q: options.query,
          calendarId: options.calendar,
        })

        console.log('\n📅 Próximos Eventos:\n')
        console.log(service.formatEventList(events))
        console.log(`\nTotal: ${events.length} evento(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Próximo evento
  calendar
    .command('next')
    .description('Mostra o próximo evento')
    .action(async () => {
      try {
        const service = getCalendarService()
        const event = await service.getNextEvent()

        if (event) {
          console.log('\n⏰ Próximo Evento:\n')
          console.log(service.formatEvent(event))
          console.log(`\n🔗 ${event.htmlLink}`)
        } else {
          console.log('\n✓ Nenhum evento programado.')
        }
      } catch (error) {
        handleError(error)
      }
    })

  // Criar evento rápido
  calendar
    .command('quick')
    .description('Cria evento rapidamente a partir de texto natural')
    .argument('<text>', 'Descrição do evento (ex: "Reunião com João amanhã às 14h")')
    .action(async (text) => {
      try {
        const service = getCalendarService()
        const event = await service.quickAdd(text)

        console.log(`\n✓ Evento criado: "${event.summary}"`)
        console.log(`  🔗 ${event.htmlLink}`)
      } catch (error) {
        handleError(error)
      }
    })

  // Criar evento com detalhes
  calendar
    .command('add')
    .description('Cria um novo evento')
    .argument('<title>', 'Título do evento')
    .requiredOption('-d, --date <date>', 'Data do evento (DD/MM/YYYY)')
    .option('-t, --time <time>', 'Horário de início (HH:MM)', '09:00')
    .option('-D, --duration <hours>', 'Duração em horas', '1')
    .option('-l, --location <location>', 'Local do evento')
    .option('-desc, --description <text>', 'Descrição')
    .option('-m, --meet', 'Criar link do Google Meet', false)
    .option('-a, --attendees <emails>', 'Emails dos convidados (separados por vírgula)')
    .action(async (title, options) => {
      try {
        const service = getCalendarService()

        // Parse da data e hora
        const dateTime = parse(`${options.date} ${options.time}`, 'dd/MM/yyyy HH:mm', new Date())

        const endDateTime = addHours(dateTime, Number.parseFloat(options.duration))

        const eventOptions = {
          summary: title,
          description: options.description,
          location: options.location,
          start: {
            dateTime: dateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          attendees: options.attendees?.split(',').map((e: string) => e.trim()),
          conferenceData: options.meet,
        }

        const event = await service.createEvent(eventOptions)

        console.log(`\n✓ Evento criado: "${event.summary}"`)
        console.log(`  📅 ${format(dateTime, "dd/MM/yyyy 'às' HH:mm")}`)
        if (options.location) {
          console.log(`  📍 ${options.location}`)
        }
        if (event.conferenceData?.entryPoints?.[0]) {
          console.log(`  🔗 Meet: ${event.conferenceData.entryPoints[0].uri}`)
        }
        console.log(`  🔗 ${event.htmlLink}`)
      } catch (error) {
        handleError(error)
      }
    })

  // Deletar evento
  calendar
    .command('delete')
    .description('Remove um evento')
    .argument('<eventId>', 'ID do evento')
    .action(async (eventId) => {
      try {
        const service = getCalendarService()

        // Busca o evento para mostrar o nome
        const event = await service.getEvent(eventId)
        await service.deleteEvent(eventId)

        console.log(`\n✓ Evento removido: "${event.summary}"`)
      } catch (error) {
        handleError(error)
      }
    })

  // Listar calendários
  calendar
    .command('calendars')
    .description('Lista todos os calendários')
    .action(async () => {
      try {
        const service = getCalendarService()
        const calendars = await service.getCalendars()

        console.log('\n📚 Seus Calendários:\n')
        calendars.forEach((cal) => {
          const primary = cal.primary ? ' (Principal)' : ''
          const access = cal.accessRole === 'owner' ? '👑' : '👤'
          console.log(`${access} ${cal.summary}${primary}`)
          console.log(`   ID: ${cal.id}`)
        })
      } catch (error) {
        handleError(error)
      }
    })

  // Ver detalhes de um evento
  calendar
    .command('show')
    .description('Mostra detalhes de um evento')
    .argument('<eventId>', 'ID do evento')
    .action(async (eventId) => {
      try {
        const service = getCalendarService()
        const event = await service.getEvent(eventId)
        const parsed = service.parseEvent(event)

        console.log('\n' + '═'.repeat(50))
        console.log(`📅 ${parsed.title}`)
        console.log('═'.repeat(50))

        if (parsed.isAllDay) {
          console.log(`📆 Dia inteiro - ${format(parsed.start, 'dd/MM/yyyy')}`)
        } else {
          console.log(
            `🕐 ${format(parsed.start, "dd/MM/yyyy 'das' HH:mm")} às ${format(parsed.end, 'HH:mm')}`
          )
        }

        if (parsed.location) {
          console.log(`📍 ${parsed.location}`)
        }

        if (parsed.description) {
          console.log(`\n📝 ${parsed.description}`)
        }

        if (parsed.attendees.length > 0) {
          console.log(`\n👥 Convidados:`)
          parsed.attendees.forEach((a) => console.log(`   • ${a}`))
        }

        if (parsed.meetLink) {
          console.log(`\n🔗 Google Meet: ${parsed.meetLink}`)
        }

        console.log(`\n🔗 ${parsed.link}`)
        console.log('═'.repeat(50))
      } catch (error) {
        handleError(error)
      }
    })

  return calendar
}

function handleError(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Erro desconhecido'

  if (message.includes('Não autenticado')) {
    console.error('\n❌ Você precisa se autenticar primeiro!')
    console.error('   Execute: obsidian-manager google auth')
  } else {
    logger.error(message)
    console.error(`\n✗ Erro: ${message}`)
  }

  process.exit(1)
}
