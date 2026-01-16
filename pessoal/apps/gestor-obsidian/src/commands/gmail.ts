import { Command } from 'commander'
import { getGmailService } from '../services/gmail.service.js'
import { logger } from '../utils/logger.js'

export function createGmailCommand(): Command {
  const gmail = new Command('gmail').alias('mail').description('Gerencia emails no Gmail')

  // Listar emails não lidos
  gmail
    .command('unread')
    .description('Lista emails não lidos')
    .option('-n, --max <number>', 'Número máximo de emails', '20')
    .action(async (options) => {
      try {
        const service = getGmailService()
        const messageRefs = await service.getUnreadMessages(Number.parseInt(options.max))

        if (messageRefs.length === 0) {
          console.log('\n✓ Nenhum email não lido!')
          return
        }

        console.log('\n📬 Emails Não Lidos:\n')

        for (const ref of messageRefs) {
          const message = await service.getMessage(ref.id)
          console.log(service.formatEmail(message))
        }

        console.log(`\nTotal: ${messageRefs.length} email(s) não lido(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Listar emails importantes não lidos
  gmail
    .command('important')
    .description('Lista emails importantes não lidos')
    .option('-n, --max <number>', 'Número máximo de emails', '10')
    .action(async (options) => {
      try {
        const service = getGmailService()
        const messageRefs = await service.getImportantUnread(Number.parseInt(options.max))

        if (messageRefs.length === 0) {
          console.log('\n✓ Nenhum email importante não lido!')
          return
        }

        console.log('\n⭐ Emails Importantes Não Lidos:\n')

        for (const ref of messageRefs) {
          const message = await service.getMessage(ref.id)
          console.log(service.formatEmail(message))
        }

        console.log(`\nTotal: ${messageRefs.length} email(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Listar emails recentes
  gmail
    .command('list')
    .description('Lista emails recentes')
    .option('-n, --max <number>', 'Número máximo de emails', '20')
    .option('-q, --query <query>', 'Query de busca do Gmail')
    .option('-l, --label <label>', 'Filtrar por label')
    .action(async (options) => {
      try {
        const service = getGmailService()

        let query = options.query || ''

        if (options.label) {
          query += ` label:${options.label}`
        }

        const messageRefs = await service.listMessages({
          maxResults: Number.parseInt(options.max),
          q: query || undefined,
        })

        if (messageRefs.length === 0) {
          console.log('\nNenhum email encontrado.')
          return
        }

        console.log('\n📧 Emails:\n')

        for (const ref of messageRefs) {
          const message = await service.getMessage(ref.id)
          console.log(service.formatEmail(message))
        }

        console.log(`\nTotal: ${messageRefs.length} email(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Buscar emails
  gmail
    .command('search')
    .description('Busca emails com query do Gmail')
    .argument('<query>', 'Query de busca (ex: "from:alguem@email.com", "subject:reunião")')
    .option('-n, --max <number>', 'Número máximo de resultados', '20')
    .action(async (query, options) => {
      try {
        const service = getGmailService()
        const messages = await service.search(query, Number.parseInt(options.max))

        if (messages.length === 0) {
          console.log(`\nNenhum email encontrado para: "${query}"`)
          return
        }

        console.log(`\n🔍 Resultados para "${query}":\n`)
        console.log(service.formatEmailList(messages))
        console.log(`\nTotal: ${messages.length} email(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Ler email
  gmail
    .command('read')
    .description('Lê um email completo')
    .argument('<messageId>', 'ID da mensagem')
    .option('-m, --mark-read', 'Marca como lido automaticamente', false)
    .action(async (messageId, options) => {
      try {
        const service = getGmailService()
        const message = await service.getMessage(messageId)

        console.log(service.formatFullEmail(message))

        if (options.markRead) {
          await service.markAsRead(messageId)
          console.log('\n✓ Email marcado como lido')
        }
      } catch (error) {
        handleError(error)
      }
    })

  // Marcar como lido
  gmail
    .command('mark-read')
    .description('Marca email(s) como lido')
    .argument('<messageIds...>', 'ID(s) da(s) mensagem(ns)')
    .action(async (messageIds: string[]) => {
      try {
        const service = getGmailService()

        for (const id of messageIds) {
          await service.markAsRead(id)
        }

        console.log(`\n✓ ${messageIds.length} email(s) marcado(s) como lido(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Arquivar email
  gmail
    .command('archive')
    .description('Arquiva email(s)')
    .argument('<messageIds...>', 'ID(s) da(s) mensagem(ns)')
    .action(async (messageIds: string[]) => {
      try {
        const service = getGmailService()

        for (const id of messageIds) {
          await service.archive(id)
        }

        console.log(`\n✓ ${messageIds.length} email(s) arquivado(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Mover para lixeira
  gmail
    .command('trash')
    .description('Move email(s) para lixeira')
    .argument('<messageIds...>', 'ID(s) da(s) mensagem(ns)')
    .action(async (messageIds: string[]) => {
      try {
        const service = getGmailService()

        for (const id of messageIds) {
          await service.trash(id)
        }

        console.log(`\n✓ ${messageIds.length} email(s) movido(s) para lixeira`)
      } catch (error) {
        handleError(error)
      }
    })

  // Enviar email
  gmail
    .command('send')
    .description('Envia um email')
    .requiredOption('-t, --to <email>', 'Email do destinatário')
    .requiredOption('-s, --subject <subject>', 'Assunto')
    .requiredOption('-b, --body <body>', 'Corpo do email')
    .option('-c, --cc <emails>', 'Emails em cópia (separados por vírgula)')
    .option('-H, --html', 'Enviar como HTML', false)
    .action(async (options) => {
      try {
        const service = getGmailService()

        await service.sendEmail({
          to: options.to,
          subject: options.subject,
          body: options.body,
          cc: options.cc?.split(',').map((e: string) => e.trim()),
          isHtml: options.html,
        })

        console.log(`\n✓ Email enviado para ${options.to}`)
        console.log(`  Assunto: ${options.subject}`)
      } catch (error) {
        handleError(error)
      }
    })

  // Criar rascunho
  gmail
    .command('draft')
    .description('Cria um rascunho de email')
    .requiredOption('-t, --to <email>', 'Email do destinatário')
    .requiredOption('-s, --subject <subject>', 'Assunto')
    .requiredOption('-b, --body <body>', 'Corpo do email')
    .option('-c, --cc <emails>', 'Emails em cópia (separados por vírgula)')
    .action(async (options) => {
      try {
        const service = getGmailService()

        const draft = await service.createDraft({
          to: options.to,
          subject: options.subject,
          body: options.body,
          cc: options.cc?.split(',').map((e: string) => e.trim()),
        })

        console.log(`\n✓ Rascunho criado (ID: ${draft.id})`)
        console.log(`  Para: ${options.to}`)
        console.log(`  Assunto: ${options.subject}`)
      } catch (error) {
        handleError(error)
      }
    })

  // Listar labels
  gmail
    .command('labels')
    .description('Lista todas as labels')
    .action(async () => {
      try {
        const service = getGmailService()
        const labels = await service.getLabels()

        console.log('\n🏷️  Labels do Gmail:\n')

        const systemLabels = labels.filter((l) => l.type === 'system')
        const userLabels = labels.filter((l) => l.type === 'user')

        console.log('Sistema:')
        systemLabels.forEach((l) => {
          const unread = l.messagesUnread ? ` (${l.messagesUnread} não lidos)` : ''
          console.log(`  • ${l.name}${unread}`)
        })

        if (userLabels.length > 0) {
          console.log('\nPersonalizadas:')
          userLabels.forEach((l) => {
            const unread = l.messagesUnread ? ` (${l.messagesUnread} não lidos)` : ''
            console.log(`  • ${l.name}${unread}`)
          })
        }
      } catch (error) {
        handleError(error)
      }
    })

  // Emails de hoje
  gmail
    .command('today')
    .description('Lista emails recebidos hoje')
    .option('-n, --max <number>', 'Número máximo de emails', '50')
    .action(async (options) => {
      try {
        const service = getGmailService()
        const messageRefs = await service.getTodayMessages(Number.parseInt(options.max))

        if (messageRefs.length === 0) {
          console.log('\nNenhum email recebido hoje.')
          return
        }

        console.log('\n📨 Emails de Hoje:\n')

        for (const ref of messageRefs) {
          const message = await service.getMessage(ref.id)
          console.log(service.formatEmail(message))
        }

        console.log(`\nTotal: ${messageRefs.length} email(s)`)
      } catch (error) {
        handleError(error)
      }
    })

  // Perfil do usuário
  gmail
    .command('profile')
    .description('Mostra informações da conta')
    .action(async () => {
      try {
        const service = getGmailService()
        const profile = await service.getProfile()

        console.log('\n👤 Perfil Gmail:\n')
        console.log(`  Email: ${profile.emailAddress}`)
        console.log(`  Total de mensagens: ${profile.messagesTotal.toLocaleString()}`)
        console.log(`  Total de threads: ${profile.threadsTotal.toLocaleString()}`)
      } catch (error) {
        handleError(error)
      }
    })

  return gmail
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
