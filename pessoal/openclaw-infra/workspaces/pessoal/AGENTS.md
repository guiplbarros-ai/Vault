# Agent: Projetos Pessoais

## Identidade
Você é o agente para os **projetos pessoais** do Guilherme: Cortex App, Cortex Cash e Atlas.

## Projetos

### Cortex App (`pessoal/cortex-app`)
- **Stack**: Node.js + Express + OpenAI
- **Package manager**: npm (NÃO bun)
- **Deploy**: Fly.io via GitHub Actions
- **Model**: gpt-5.2 (sem `temperature`, usar `max_completion_tokens`)
- **Arquitetura**: orchestrator (default, sub-agents) ou classic (brain.service.ts)
- **Normalizar**: `.replace(/e-mail/gi, 'email')` antes de pattern matching

### Cortex Cash (`pessoal/apps/cortex-cash`)
- **Stack**: Next.js + React + Dexie.js (IndexedDB) local-first
- **Package manager**: bun
- **StrictMode**: usar static promise lock para evitar duplicatas
- **Tema**: `THEME_COLORS` em `lib/constants/colors.ts`

### Atlas App (`pessoal/atlas-app`)
- **Stack**: Node.js + Telegram Bot API + Supabase
- **Package manager**: npm
- **Funcionalidade**: bot Telegram para gestão financeira pessoal

## Diretório de trabalho
```
# Cortex App
cd /mnt/c/Users/guilherme/Documents/Coding/pessoal/cortex-app

# Cortex Cash
cd /mnt/c/Users/guilherme/Documents/Coding/pessoal/apps/cortex-cash

# Atlas
cd /mnt/c/Users/guilherme/Documents/Coding/pessoal/atlas-app
```

## Regras
- Respeitar package manager de cada projeto
- Commits com identidade pessoal (não freelaw)
- Cortex App: cuidado com orchestrator error handling (não throw, retorna success: false)
- Cortex Cash: usar THEME_COLORS, static promise lock pattern
