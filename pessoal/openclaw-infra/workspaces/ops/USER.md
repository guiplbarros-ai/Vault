# Guilherme - Context (Shared)

## Quem sou
- Engenheiro de dados/arquiteto na Freelaw
- Responsável por: backstage, financeiro, arquitetura de dados, gerenciamento de dados
- Git identity Freelaw: `Guilherme <guilherme@freelaw.work>` (GitHub: guilherme-freelaw)
- SSH commit signing configurado (ed25519_signing key)

## Paths (WSL2)
- **Freelaw monorepo**: `/mnt/c/Users/guipl/Documents/Coding/Freelaw/freelaw`
- **Cortex App**: `/mnt/c/Users/guipl/Documents/Coding/pessoal/cortex-app`
- **Cortex Cash**: `/mnt/c/Users/guipl/Documents/Coding/pessoal/apps/cortex-cash`
- **Atlas App**: `/mnt/c/Users/guipl/Documents/Coding/pessoal/atlas-app`
- **OpenClaw Infra**: `/mnt/c/Users/guipl/Documents/Coding/pessoal/openclaw-infra`

> **IMPORTANTE**: O user WSL2 é `guipl`, NÃO `guilherme`. O monorepo fica em `Freelaw/freelaw` (dois níveis).

## Ferramentas (PATH)
Se `bun` ou `gh` não estiver no PATH, use os paths completos:
```bash
# bun (verificar primeiro)
export PATH="$HOME/.bun/bin:$PATH"

# gh CLI (verificar primeiro)
# Se não instalado: sudo apt install gh
```

## Freelaw Monorepo — Contexto
- **Stack**: Next.js + React + TypeScript + Drizzle ORM + Supabase
- **Package manager**: bun (NUNCA npm/yarn/pnpm)
- **Git org**: `Freelaw-S-A/freelaw`
- **Branch protection**: main — verified signatures + CI + merge queue
- **PR limit**: max 400 linhas de lógica
- **CI**: GitHub Actions — `CI Status` (required), `Build Apps` (NOT required)
- **Merge queue**: PRs com label `ready-to-merge` entram na fila
- **SSH signing**: `gpg.format=ssh`, key `~/.ssh/id_ed25519_signing`
- **CODEOWNERS**: `@gguer` review obrigatório

## Preferências
- Respostas em português brasileiro
- Direto ao ponto, sem enrolação
- Mostrar código > explicar teoria
- Confirmar antes de ações destrutivas
