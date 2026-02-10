# CLAUDE.md - Atlas App

Monitor de passagens aereas com alertas via Telegram.

## Quick Reference

```
+---------------------------------------------------------+
|  ATLAS-APP - Monitor de Passagens Aereas                |
|  Stack: TypeScript + Node.js + Telegram Bot API         |
+---------------------------------------------------------+
|  PACKAGE MANAGER: npm                                   |
|     npm run <cmd>  |  npx <pkg>  |  npm install <dep>   |
+---------------------------------------------------------+
|  DEPLOY: Fly.io (atlas-app.fly.dev)                     |
|     fly deploy     |  fly logs  |  fly ssh console      |
+---------------------------------------------------------+
|  DATABASE: Supabase (PostgreSQL)                        |
+---------------------------------------------------------+
```

## Comandos

```bash
# Desenvolvimento
npm run dev:server    # Inicia servidor com hot reload
npm run dev           # Inicia CLI com hot reload

# CLI
npm run dev -- status              # Status das configuracoes
npm run dev -- search GRU LIS      # Busca voos
npm run dev -- routes              # Lista rotas monitoradas
npm run dev -- check               # Verifica precos
npm run dev -- bot                 # Inicia bot em polling
npm run dev -- digest              # Envia digest manual

# Producao
npm run build         # Compila TypeScript
npm run start         # Inicia servidor compilado

# Deploy
fly deploy            # Deploy para Fly.io
fly logs              # Ver logs em tempo real
```

## Estrutura

```
atlas-app/
  src/
    server.ts                 # Entry point do servidor
    index.ts                  # Entry point CLI
    services/
      supabase.service.ts     # Cliente Supabase
      telegram.service.ts     # Handler do Telegram
      kiwi.service.ts         # API Kiwi Tequila
      serpapi.service.ts      # API SerpAPI (Google Flights)
      flight-search.service.ts # Orquestrador de busca
      price-alert.service.ts  # Logica de alertas
      daily-digest.service.ts # Crons e digest
      routes-db.service.ts    # Rotas monitoradas
      prices-db.service.ts    # Historico de precos
      alerts-db.service.ts    # Alertas e settings
    types/
      index.ts
      flight.ts
      alert.ts
    utils/
      env.ts
      logger.ts
      date.ts
      airports.ts
  supabase/
    schema.sql                # Schema do banco
  fly.toml                    # Config Fly.io
  Dockerfile                  # Docker para deploy
```

## Provedores de Busca

| Provider | Custo | Uso |
|----------|-------|-----|
| SerpAPI | $0.01/call | Principal (Google Flights - preços reais) |
| Kiwi Tequila | Gratis | Fallback quando SerpAPI bloqueado |
| Amadeus | Gratis (500/mes) | Ultimo recurso (API de teste) |

## Budget Limiter (Proteção de Custos)

O sistema bloqueia automaticamente o SerpAPI quando o limite mensal é atingido:

- **Limite padrão**: 100 calls/mês (~$1/mês)
- **Alerta 20%**: Avisa quando restam 20% das calls
- **Alerta 10%**: Aviso crítico com menos de 10%
- **Bloqueio**: Bloqueia SerpAPI e usa Kiwi automaticamente
- **Telegram**: Envia alertas via bot quando limite se aproxima

Configure via `ATLAS_SERPAPI_MONTHLY_LIMIT` no .env ou Fly secrets.
Use `/budget` no Telegram para ver status atual.

## Variaveis de Ambiente

Copie `env.example` para `.env`:

```bash
# Obrigatorias
TELEGRAM_BOT_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
KIWI_API_KEY=

# Opcionais
SERPAPI_API_KEY=
ATLAS_TIMEZONE=America/Sao_Paulo
ATLAS_ALERT_DROP_PERCENT=15
```

## Logica de Alertas

| Tipo | Trigger |
|------|---------|
| price_drop | Preco cai >=15% vs media 7 dias |
| lowest_ever | Menor preco ja registrado |
| trend_down | 3+ quedas consecutivas |
| target_reached | Preco <= alvo configurado |

## Comandos Telegram

```
/start              - Inicio
/rota add GRU LIS   - Monitorar rota
/rota remove GRU LIS - Remover rota
/rotas              - Listar rotas
/buscar GRU LIS 15/03 - Busca manual
/budget             - Ver uso de APIs e custos
/digest             - Config digest
/digest on/off      - Ativar/desativar
/id                 - Seu chat ID
```

## Deploy

```bash
# Primeiro deploy
fly launch

# Configurar secrets
fly secrets set TELEGRAM_BOT_TOKEN=xxx
fly secrets set SUPABASE_URL=xxx
fly secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
fly secrets set KIWI_API_KEY=xxx

# Deploy
fly deploy

# Configurar webhook do Telegram
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://atlas-app.fly.dev/telegram/webhook"
```

## Linguagem

- Codigo: Ingles
- Commits: Portugues ou Ingles
- UI/Bot: Portugues Brasileiro
