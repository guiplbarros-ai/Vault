import { Command } from 'commander';
import { startTelegramBot } from '../services/telegram.service.js';
import { logger } from '../utils/logger.js';
import TelegramBot from 'node-telegram-bot-api';

export function createTelegramCommand(): Command {
  const telegram = new Command('telegram')
    .description('Inicia o bot do Telegram');

  telegram
    .command('start')
    .description('Inicia o bot do Telegram em modo polling')
    .action(async () => {
      try {
        console.log('🤖 Iniciando bot do Telegram...\n');
        
        startTelegramBot();
        
        console.log('✅ Bot iniciado com sucesso!');
        console.log('📱 Abra o Telegram e converse com seu bot');
        console.log('\n⏹️  Pressione Ctrl+C para parar\n');
        
        // Keep the process running
        process.on('SIGINT', () => {
          console.log('\n\n👋 Parando bot...');
          process.exit(0);
        });

        // Keep alive
        await new Promise(() => {});
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(`Telegram: ${message}`);
        console.error(`❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  telegram
    .command('status')
    .description('Verifica token/conectividade e mostra diagnóstico rápido')
    .action(async () => {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        console.error('❌ TELEGRAM_BOT_TOKEN não configurado no .env');
        process.exit(1);
      }

      const bot = new TelegramBot(token, { polling: false });
      try {
        const me = await bot.getMe();
        let webhookInfo: any = null;
        try {
          webhookInfo = await (bot as any).getWebhookInfo?.();
        } catch {
          // ignore
        }

        console.log('✅ Token válido e API acessível');
        console.log(`- bot: @${me.username} (id=${me.id})`);
        if (webhookInfo) {
          const url = webhookInfo.url || '';
          console.log(`- webhook: ${url ? url : '(nenhum)'}`);
          if (url) {
            console.log('  ℹ️ Se você usa polling, garanta que o webhook esteja vazio (deleteWebhook).');
          }
        }

        console.log('\nDica: para iniciar o bot:\n  npm run dev -- telegram start');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Falha ao acessar a API do Telegram: ${msg}`);
        process.exit(1);
      } finally {
        try {
          await (bot as any).close?.();
        } catch {
          // ignore
        }
      }
    });

  telegram
    .command('help')
    .description('Mostra instruções de configuração')
    .action(() => {
      console.log(`
🤖 Configuração do Bot do Telegram

1. Crie um bot no Telegram:
   - Abra o Telegram e busque @BotFather
   - Envie /newbot
   - Escolha nome e username para o bot
   - Copie o token fornecido

2. Configure o token no .env:
   TELEGRAM_BOT_TOKEN=seu_token_aqui

3. (Opcional) Restrinja acesso por usuário:
   - Envie /id para o bot para descobrir seu ID
   - Adicione ao .env:
   TELEGRAM_AUTHORIZED_USERS=123456789,987654321

4. Inicie o bot:
   npm run dev -- telegram start

Diagnóstico:
   npm run dev -- telegram status

Observação sobre erro 409:
   Se aparecer "409 Conflict", é porque existe outra instância rodando.
   Pare a outra sessão (Ctrl+C). O CLI também cria um lock local: .telegram-bot.lock

📝 Comandos disponíveis no bot:

Obsidian:
  /nota <texto>     - Salva no Inbox
  /livro <texto>    - Salva em Livros  
  /projeto <texto>  - Salva em Projetos
  /prof <texto>     - Nota profissional
  /pessoal <texto>  - Nota pessoal
  /buscar <termo>   - Busca nas notas

Todoist:
  /tarefas          - Tarefas de hoje
  /tarefa <texto>   - Cria tarefa
  /concluir <id>    - Conclui tarefa

Geral:
  /start            - Menu inicial
  /help             - Lista de comandos
  /id               - Seu ID do Telegram
`);
    });

  return telegram;
}

