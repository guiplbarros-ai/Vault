import { Command } from 'commander';
import { getAgentService } from '../services/agent.service.js';

export function createAgentCommand(): Command {
  const agent = new Command('agent')
    .description('Orquestrador (Agent) do Segundo Cérebro');

  agent
    .command('chat')
    .description('Envia uma mensagem para o Agent (modo CLI)')
    .requiredOption('--chat <chatId>', 'ID do chat (número) para escopo de memória')
    .requiredOption('--text <text>', 'Texto da mensagem')
    .action(async (opts) => {
      const chatId = Number(opts.chat);
      if (!Number.isFinite(chatId)) {
        console.error('❌ chatId inválido. Use um número (ex: 123456789).');
        process.exit(1);
      }
      const res = await getAgentService().chat(chatId, String(opts.text));
      console.log(res.message);
    });

  agent
    .command('clear')
    .description('Limpa a memória de conversa do Agent para um chatId')
    .requiredOption('--chat <chatId>', 'ID do chat (número)')
    .action((opts) => {
      const chatId = Number(opts.chat);
      if (!Number.isFinite(chatId)) {
        console.error('❌ chatId inválido. Use um número (ex: 123456789).');
        process.exit(1);
      }
      getAgentService().clearConversation(chatId);
      console.log(`✅ Conversa limpa para chatId=${chatId}`);
    });

  return agent;
}

