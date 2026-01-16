import { Command } from 'commander'
import { getAgentService } from '../services/agent.service.js'

export function createAgentCommand(): Command {
  const agent = new Command('agent').description('Orquestrador (Agent) do Segundo Cérebro')

  agent
    .command('chat')
    .description('Envia uma mensagem para o Agent (modo CLI)')
    .requiredOption('--chat <chatId>', 'ID do chat (número) para escopo de memória')
    .requiredOption('--text <text>', 'Texto da mensagem')
    .option('--yes', 'Auto-confirma ações mutáveis (CLI). Use com cuidado.', false)
    .action(async (opts) => {
      // CLI is stateless across invocations; enable local persistence for pending actions/confirmation.
      // This allows: run command -> agent asks "confirma?" -> run another command with "sim".
      if (!process.env.CORTEX_BRAIN_PERSIST_LOCAL) process.env.CORTEX_BRAIN_PERSIST_LOCAL = '1'
      const chatId = Number(opts.chat)
      if (!Number.isFinite(chatId)) {
        console.error('❌ chatId inválido. Use um número (ex: 123456789).')
        process.exit(1)
      }
      const svc = getAgentService()
      const res = await svc.chat(chatId, String(opts.text))
      if (opts.yes && res.needsConfirmation) {
        const res2 = await svc.chat(chatId, 'sim')
        console.log(res2.message)
        return
      }
      console.log(res.message)
    })

  agent
    .command('clear')
    .description('Limpa a memória de conversa do Agent para um chatId')
    .requiredOption('--chat <chatId>', 'ID do chat (número)')
    .action((opts) => {
      const chatId = Number(opts.chat)
      if (!Number.isFinite(chatId)) {
        console.error('❌ chatId inválido. Use um número (ex: 123456789).')
        process.exit(1)
      }
      getAgentService().clearConversation(chatId)
      console.log(`✅ Conversa limpa para chatId=${chatId}`)
    })

  return agent
}
