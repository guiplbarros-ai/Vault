# Segundo Cérebro (Telegram) — lista de usos possíveis (checklist)

Marque com **X** o que você quer priorizar.

## Comunicação / experiência no Telegram
- [x] Conversa natural (perguntar/consultar) + respostas curtas
- [x] “Modo comando” sempre disponível (`/nota`, `/tarefas`, etc.)
- [x] Mensagens longas com paginação (“enviar mais”)
- [ ] Botões/inline keyboard para confirmar ações (Sim/Não) em vez de texto
- [x] Respostas com “fontes” (caminho do arquivo no Obsidian / link do Notion / id da tarefa)
- [x] Mensagens proativas (briefings, lembretes, alertas)
- [ ] “Modo silencioso” (não proativo fora de horários)
- [ ] Multi-chat (pessoal vs trabalho em chats separados)

## Regras / preferências / “manual do Guilherme”
- [ ] Arquivo único de regras (`CORTEX_RULES.md`) com prioridades e estilo
- [x] Regras por contexto (pessoal vs Freelaw)
- [x] Preferências de escrita por tipo (reunião, avaliação, decisão, projeto)
- [x] “Eu disse que…” (registrar regras novas automaticamente quando você explicitar)
- [ ] Auditoria de mudanças no “manual” (changelog automático)

## Obsidian (notas)
- [x] Captura rápida (texto vira nota inbox)
- [x] Classificação automática (livro/conceito/projeto/prof/pessoal/reunião)
- [x] Perguntar 1 vez quando estiver ambíguo (“é pessoal ou Freelaw?”)
- [x] Buscar notas por pessoa/projeto/termo
- [x] Resumir uma nota longa em bullets
- [x] Transformar conversa em nota (“resume e salva”)
- [x] Criar “ata de reunião” com decisões + próximos passos
- [x] “Decisões” (registro de decisões com contexto e trade-offs)
- [ ] “Diário” (log diário automático)
- [x] Criar nota e também criar tarefas (derivadas da nota)
- [x] Enriquecer nota com dados do Notion (puxar e colar resumo)

## Tarefas (Todoist)
- [x] Criar tarefas a partir de mensagem natural, sempre perguntar para confirmar
- [x] Priorizar tarefa (P1–P4) por regra/heurística
- [x] “Inbox de tarefas” vs projeto específico (roteamento)
- [x] Listar tarefas do dia + atrasadas
- [x] Revisão semanal (gerar lista e plano)
- [x] Fechar tarefas (concluir) via bot
- [x] Alertas de tarefas atrasadas importantes

## Agenda (Google Calendar)
- [x] “O que tenho hoje?” (agenda do dia)
- [x] “Qual meu próximo compromisso?”
- [x] Agenda da semana (visão geral)
- [x] Criar evento por texto (quick add), sempre confirmar antes com o usuário
- [ ] Propor horários para reunião (sugerir slots livres)
- [x] Lembretes automáticos antes de eventos importantes
- [x] Briefing pré-reunião (contexto + última nota + tarefas relacionadas)

## Email (Gmail)
- [x] Resumo de não lidos (top 5–10)
- [x] “Emails importantes” (regras: remetentes, labels, palavras-chave)
- [x] Buscar email por query (“from:… subject:…”)
- [x] Ler email e resumir em 3 bullets
- [x] Sugerir respostas (rascunho) com seu estilo
- [x] Enviar email somente com confirmação explícita
- [x] Rotular/arquivar emails por automação (com regras)

## Notion
- [x] Buscar no Notion (Freelaw) e resumir no Telegram
- [x] Buscar no Notion Pessoal e resumir no Telegram
- [x] “Puxar dados” do Notion e registrar em nota do Obsidian
- [x] Manter “bases” de projeto sincronizadas (Notion ↔ Obsidian)

## Financeiro / Operações (exemplos)
- [x] Rotina diária: “status financeiro” (se houver integrações)
- [x] Checklist de fechamento do mês
- [x] Registrar gastos/receitas em uma planilha e gerar resumo
- [x] Alertas de contas a pagar/receber (se houver fonte)

## Reservas / vida prática
- [x] Lembretes de reservas (restaurante, viagem, consultas)
- [x] “Planejar viagem”: checklist + tarefas + eventos
- [x] “Renovar X” (CNH, documentos, assinaturas) com alertas

## Pessoas / relacionamentos (aniversários e follow-ups)
- [x] Cadastro simples de pessoas importantes (nome + data + tags: família/trabalho/amigos)
- [x] Lembretes de aniversários (ex.: 7 dias antes + no dia)
- [x] Sugestão de mensagem pronta de parabéns (no seu tom)
- [x] Registro de presentes/ideias por pessoa (e puxar na data)
- [x] Follow-up de relacionamento (ex.: “faz 30 dias que não falo com X”)
- [x] Registrar “notas sobre pessoas” (preferências, contexto, últimos assuntos)

## Conhecimento / aprendizado
- [ ] Resumo de livro/artigo e salvar em “Livros/Conceitos”
- [ ] Flashcards/Anki (gerar perguntas e respostas)
- [x] “Curadoria semanal”: top ideias capturadas + próximos passos

## Proatividade (mensagens preprogramadas)
- [x] Briefing diário (07:00) com agenda + tarefas + emails
- [ ] Briefing fim do dia (18:00) com pendências + amanhã
- [x] Pergunta diária curta (“qual 1 prioridade hoje?”) e registrar resposta
- [x] Revisão semanal guiada (sexta/domingo)
- [x] Lembretes por contexto (ex.: “antes do Weekly”)

## Segurança / confiabilidade
- [ ] Lista de usuários autorizados no Telegram
- [x] Confirmação sempre que houver “efeito colateral” (criar/enviar/apagar)
- [ ] “Modo somente leitura”
- [x] Log/auditoria: o que foi consultado, o que foi criado, quando
- [ ] Rate limit / anti-loop / anti-spam

## Segurança / riscos (guardrails avançados)
- [x] Confirmação em 2 passos para ações críticas (enviar email, convidar pessoas no calendar, concluir tarefa importante)
- [x] Lista de “ações proibidas” (nunca fazer automaticamente)
- [x] Janela de silêncio + “não me interrompa” (ex.: durante reuniões)
- [ ] Auditoria com “por quê” + fonte usada (além do log básico)

## Operação / confiabilidade (produção)
- [x] Health check do bot (status + integrações ok/erro)
- [x] Fallback offline (se OpenAI cair, manter comandos/rotinas simples)
- [x] Backups/rollback (notas/tarefas/eventos criados automaticamente fáceis de desfazer)
- [x] Fila de ações (evitar spam/duplicidade, retries controlados)
- [x] Detecção de duplicatas (mesma tarefa/nota/evento criado 2x)

## “Trabalho de secretário” (rotinas)
- [x] Preparação de reuniões (agenda + contexto + perguntas + decisões pendentes)
- [x] Follow-up pós-reunião (ata + tarefas + email de recap — com confirmação)
- [x] Gestão de pendências por pessoa (“o que estou esperando do X?”)
- [x] Rotina de triagem (processar inbox: emails/notas/tarefas)

## Memória / conhecimento (estrutura)
- [x] Glossário pessoal (termos internos, siglas, pessoas)
- [x] Timeline por projeto/pessoa (eventos, decisões, contexto)
- [x] Versionamento do “manual” (regras que expiram / mudanças de opinião)
- [x] Sinalização de confiança (quando não houver fonte: marcar como hipótese)

## Automação com triggers
- [x] Triggers por evento (calendar/email/tarefa) → mensagem no Telegram
- [x] Regras por horário e contexto (dia útil vs fim de semana, viagem, férias)
- [x] Detecção de urgência (emails/assuntos críticos → alerta)

## Qualidade de resposta
- [x] Respostas sempre com “próximo passo” (quando fizer sentido)
- [ ] Perguntas no máximo 1–2 quando faltar informação
- [x] Evitar “dicas genéricas” (responder com base no seu contexto)
- [ ] “Citações” do que foi usado (arquivo/ID)

