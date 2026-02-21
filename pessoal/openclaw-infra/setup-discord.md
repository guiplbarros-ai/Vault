# Setup Discord - Passo a Passo

## 1. Criar servidor Discord privado

Nome sugerido: **Guilherme Command Center**

## 2. Criar categorias e canais

```
📋 FREELAW
  #backstage        → agent backstage (app + UI)
  #financeiro       → agent backstage (módulo financeiro)
  #data-arch        → agent data (schemas, design)
  #migrations       → agent data (migrations, drizzle)
  #data-guard       → agent data (RLS, validações, integridade)
  #pr-review        → agent review (análise de PRs)
  #ci-logs          → agent review (CI status, builds)

⚙️ OPS
  #ops              → agent ops (comandos gerais)
  #deploy           → agent ops (deploys)
  #alerts           → agent ops (notificações automáticas)

🏠 PESSOAL
  #cortex-app       → agent pessoal (backend Cortex)
  #cortex-cash      → agent pessoal (app financeiro)
  #atlas            → agent pessoal (Telegram bot)

💬 META
  #command-center   → canal humano, sem bot (notas, links, decisões)
  #sandbox          → testes com bots
```

## 3. Criar 5 bots no Discord Developer Portal

Acessar: https://discord.com/developers/applications

Para CADA bot:

### 3.1 Criar Application
- New Application → nome (ex: "FreelawBackstage")
- Anotar o Application ID

### 3.2 Configurar Bot
- Ir em Bot → Reset Token → copiar e salvar
- Habilitar:
  - ✅ Message Content Intent
  - ✅ Server Members Intent
  - ✅ Presence Intent

### 3.3 Gerar invite link
- Ir em OAuth2 → URL Generator
- Scopes: `bot`, `applications.commands`
- Permissions:
  - View Channels
  - Send Messages
  - Read Message History
  - Embed Links
  - Attach Files
  - Add Reactions
- Copiar URL gerada → abrir no browser → adicionar ao servidor

### Tabela de bots

| Bot Name          | accountId  | Canais permitidos                    |
|-------------------|------------|--------------------------------------|
| FreelawBackstage  | backstage  | #backstage, #financeiro              |
| FreelawData       | data       | #data-arch, #migrations, #data-guard |
| FreelawReview     | review     | #pr-review, #ci-logs                 |
| FreelawOps        | ops        | #ops, #deploy, #alerts               |
| GuilhermePessoal  | pessoal    | #cortex-app, #cortex-cash, #atlas    |

## 4. Coletar IDs

Com Developer Mode ativado no Discord (Settings → Advanced → Developer Mode):

- **Guild ID**: botão direito no ícone do servidor → Copy Server ID
- **User ID**: botão direito no seu avatar → Copy User ID
- **Channel IDs**: botão direito em cada canal → Copy Channel ID

## 5. Preencher .env

Criar `~/.openclaw/.env` no Windows (WSL2):

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OPENCLAW_GATEWAY_TOKEN=gerar-um-token-seguro-aqui

DISCORD_BOT_BACKSTAGE=token-do-bot-backstage
DISCORD_BOT_DATA=token-do-bot-data
DISCORD_BOT_REVIEW=token-do-bot-review
DISCORD_BOT_OPS=token-do-bot-ops
DISCORD_BOT_PESSOAL=token-do-bot-pessoal
```

## 6. Atualizar openclaw.json

Substituir nos placeholders:
- `GUILD_ID_HERE` → seu Guild ID (mesmo para todos)
- `YOUR_DISCORD_USER_ID` → seu User ID

## 7. Pairing

Após iniciar o gateway, DM cada bot:
```
oi
```

No terminal WSL2:
```bash
openclaw pairing approve discord <CODE>
```

Repetir para os 5 bots.
