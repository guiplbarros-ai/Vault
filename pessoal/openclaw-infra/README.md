# OpenClaw Infra - Guilherme Command Center

## Arquitetura

```
Mac (Discord) ──> Discord Gateway ──> Windows WSL2 (OpenClaw Gateway)
                                          ├── Agent: backstage (freelaw app + financeiro)
                                          ├── Agent: data     (schemas, migrations, RLS)
                                          ├── Agent: review   (PRs, CI, code quality)
                                          ├── Agent: ops      (deploy, monitoring, geral)
                                          └── Agent: pessoal  (cortex, atlas, cortex-cash)

Mac (Discord) ──> Discord API ──> Fly.io (cortex-app)
                                          └── Frank (segundo cérebro, GPT-5.2)
```

Dois sistemas independentes no mesmo servidor Discord. Zero conflito:
- **OpenClaw** (5 bots): controle de terminais via WSL2, canais FREELAW-* e PESSOAL
- **Frank** (1 bot): segundo cérebro pessoal via Fly.io, canais CÉREBRO-*

## Agentes OpenClaw (5 bots, 1 gateway)

| Agent     | Bot Discord        | App ID              | Canais                        | Workspace                       |
|-----------|--------------------|--------------------|-------------------------------|---------------------------------|
| backstage | FreelawBackstage   | 1474797465956782181 | #backstage, #financeiro       | ~/.openclaw/workspace-backstage |
| data      | FreelawData        | 1474798135468621956 | #data, #schemas               | ~/.openclaw/workspace-data      |
| review    | FreelawReview      | 1474799022479769600 | #review                       | ~/.openclaw/workspace-review    |
| ops       | FreelawOps         | 1474800889570132048 | #ops, #status                 | ~/.openclaw/workspace-ops       |
| pessoal   | GuilhermePessoal   | 1474802455991554070 | #cortex-app, #cortex-cash, #atlas | ~/.openclaw/workspace-pessoal |

## Frank — Segundo Cérebro (1 bot, Fly.io)

| Bot     | App ID              | Canais                                                  | Deploy   |
|---------|--------------------|---------------------------------------------------------|----------|
| Frank   | 1474824057189830747 | #chat, #tarefas, #email, #notas, #decisões, #planning, #briefings, #frank-logs | Fly.io |

### Canais CÉREBRO

| Categoria        | Canal       | ID                  | Função                    |
|------------------|-------------|---------------------|---------------------------|
| CÉREBRO-PESSOAL  | #chat       | 1474826875883749426 | Conversação geral pessoal |
| CÉREBRO-PESSOAL  | #tarefas    | 1474827201193967638 | Todoist, habits, rotina   |
| CÉREBRO-PESSOAL  | #email      | 1474827451531268227 | Gmail triage + ações      |
| CÉREBRO-PESSOAL  | #notas      | 1474827722604941575 | Quick notes (sem LLM)     |
| CÉREBRO-FREELAW  | #decisões   | 1474828003094691902 | Decisões de negócio       |
| CÉREBRO-FREELAW  | #planning   | 1474828275770589508 | Sprints, roadmap          |
| CÉREBRO-GERAL    | #briefings  | 1474828560962293920 | Briefing diário auto      |
| CÉREBRO-GERAL    | #frank-logs | 1474828943365378058 | Logs de atividade         |

**Servidor:** OpenClaw HQ (Guild ID: `1474803246022266911`)
**Owner:** `703006877700587622`

## Setup

### OpenClaw (WSL2)
1. Criar 5 bots no Discord Developer Portal
2. Criar servidor Discord privado com canais
3. Instalar OpenClaw no WSL2
4. Copiar `openclaw.json` para `~/.openclaw/`
5. Copiar workspaces para `~/.openclaw/`
6. Rodar `openclaw gateway`

### Frank (Fly.io)
1. Bot já criado (App ID: 1474824057189830747)
2. Token em `.tokens` (DISCORD_BOT_FRANK)
3. Canais CÉREBRO-* já criados no servidor
4. Configurar secrets no Fly.io:
   ```
   fly secrets set CORTEX_DISCORD_ENABLED=true
   fly secrets set DISCORD_BOT_TOKEN=<token>
   fly secrets set DISCORD_GUILD_ID=1474803246022266911
   fly secrets set DISCORD_AUTHORIZED_USERS=703006877700587622
   fly secrets set DISCORD_CHANNEL_CHAT=1474826875883749426
   fly secrets set DISCORD_CHANNEL_TAREFAS=1474827201193967638
   fly secrets set DISCORD_CHANNEL_EMAIL=1474827451531268227
   fly secrets set DISCORD_CHANNEL_NOTAS=1474827722604941575
   fly secrets set DISCORD_CHANNEL_DECISOES=1474828003094691902
   fly secrets set DISCORD_CHANNEL_PLANNING=1474828275770589508
   fly secrets set DISCORD_CHANNEL_BRIEFINGS=1474828560962293920
   fly secrets set DISCORD_CHANNEL_LOGS=1474828943365378058
   ```
5. Deploy cortex-app: push to main → CI → Fly.io

Ver instruções detalhadas em `setup-windows.sh` e `setup-discord.md`.

## Remote Access (SSH via Tailscale)

Acesso direto do Mac ao WSL2, independente do Discord/Gateway/Relay.
Sobrevive a qualquer crash de aplicação.

```
Mac (Tailscale) ──> VPN mesh ──> WSL2 (Tailscale)
                                   └── SSH port 22
                                   └── systemctl --user ...
                                   └── curl localhost:18790/health
```

### Quick Reference

```bash
# Operações remotas (do Mac):
./ops.sh status              # health de todos os serviços
./ops.sh restart-relay       # restart claude-relay
./ops.sh restart-gateway     # restart openclaw gateway
./ops.sh deploy              # full deploy (pull, sync, restart)
./ops.sh logs relay          # logs recentes do relay
./ops.sh logs gateway        # logs do gateway
./ops.sh stats               # uso do relay hoje
./ops.sh exec "comando"      # rodar qualquer comando no WSL2
./ops.sh ssh                 # shell interativo

# SSH direto:
ssh wsl2                     # shell interativo
ssh wsl2 "uptime"            # comando único
```

### Setup

1. Mac: `brew install --cask tailscale` (abrir app, fazer login)
2. WSL2: `bash setup-remote-access.sh "ssh-ed25519 AAAA..."`
3. WSL2: `sudo tailscale up --ssh` (anotar IP)
4. Mac: adicionar `Host wsl2` ao `~/.ssh/config`
5. Testar: `ssh wsl2 "echo ok"` e `./ops.sh status`

Ver `setup-remote-access.sh` para instruções detalhadas.
