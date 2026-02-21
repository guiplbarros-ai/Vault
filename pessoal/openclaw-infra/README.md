# OpenClaw Infra - Guilherme Command Center

## Arquitetura

```
Mac (Discord) ──> Discord Gateway ──> Windows WSL2 (OpenClaw Gateway)
                                          ├── Agent: backstage (freelaw app + financeiro)
                                          ├── Agent: data     (schemas, migrations, RLS)
                                          ├── Agent: review   (PRs, CI, code quality)
                                          ├── Agent: ops      (deploy, monitoring, geral)
                                          └── Agent: pessoal  (cortex, atlas, cortex-cash)
```

## Agentes (5 bots Discord, 1 gateway)

| Agent     | Bot Discord        | App ID              | Canais                        | Workspace                       |
|-----------|--------------------|--------------------|-------------------------------|---------------------------------|
| backstage | FreelawBackstage   | 1474797465956782181 | #backstage, #financeiro       | ~/.openclaw/workspace-backstage |
| data      | FreelawData        | 1474798135468621956 | #data, #schemas               | ~/.openclaw/workspace-data      |
| review    | FreelawReview      | 1474799022479769600 | #review                       | ~/.openclaw/workspace-review    |
| ops       | FreelawOps         | 1474800889570132048 | #ops, #status                 | ~/.openclaw/workspace-ops       |
| pessoal   | GuilhermePessoal   | 1474802455991554070 | #cortex-app, #cortex-cash, #atlas | ~/.openclaw/workspace-pessoal |

**Servidor:** OpenClaw HQ (Guild ID: `1474803246022266911`)
**Owner:** `703006877700587622`

## Setup

1. Criar 5 bots no Discord Developer Portal
2. Criar servidor Discord privado com canais
3. Instalar OpenClaw no WSL2
4. Copiar `openclaw.json` para `~/.openclaw/`
5. Copiar workspaces para `~/.openclaw/`
6. Rodar `openclaw gateway`

Ver instruções detalhadas em `setup-windows.sh` e `setup-discord.md`.
