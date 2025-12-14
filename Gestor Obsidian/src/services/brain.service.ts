import OpenAI from 'openai';
import { config } from 'dotenv';
import { noteService } from './note.service.js';
import { getTodoistService } from './todoist.service.js';
import { getVaultService } from './vault.service.js';
import { getCalendarService } from './calendar.service.js';
import { getGmailService } from './gmail.service.js';
import { getGoogleAuthService } from './google-auth.service.js';
import { logger } from '../utils/logger.js';
import type { NoteType } from '../types/index.js';

config();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface PendingAction {
  id: string;
  description: string;
  action: string;
  params: Record<string, string>;
}

interface ConversationState {
  messages: Message[];
  pendingActions: PendingAction[];
  awaitingConfirmation: boolean;
  lastNotionData?: string;
}

interface BrainResponse {
  message: string;
  needsConfirmation: boolean;
  pendingActions: PendingAction[];
}

interface ExecutionOutcome {
  success: boolean;
  actionType: string;
  summary: string;
  error?: string;
}

// Notion MCP integration (will be injected)
type NotionSearchFn = (query: string) => Promise<string>;
type NotionFetchFn = (id: string) => Promise<string>;

class BrainService {
  private client: OpenAI;
  private model: string = 'gpt-4o';
  private conversations: Map<number, ConversationState> = new Map();
  
  // Notion functions (injected from telegram service)
  public notionSearch?: NotionSearchFn;
  public notionFetch?: NotionFetchFn;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurado');
    }
    this.client = new OpenAI({ apiKey });
  }

  private isGoogleAvailable(): boolean {
    try {
      const auth = getGoogleAuthService();
      const authenticated = auth.isAuthenticated();
      logger.info(`Google Auth check: ${authenticated ? 'Disponível' : 'Não autenticado'}`);
      return authenticated;
    } catch (error) {
      logger.info(`Google Auth check: Não disponível (${error instanceof Error ? error.message : 'erro'})`);
      return false;
    }
  }

  private getSystemPrompt(notionAvailable: boolean): string {
    const googleAvailable = this.isGoogleAvailable();
    
    return `Você é o Cortex, assistente pessoal e segundo cérebro do Guilherme. Você é inteligente, proativo e conversacional.

## SEU PAPEL

Você gerencia o conhecimento e tarefas do Guilherme através de cinco sistemas:
1. **Obsidian** - Vault de notas pessoais (segundo cérebro)
2. **Todoist** - Gestão de tarefas pessoais
3. **Notion** - Base de conhecimento da EMPRESA (Freelaw)${notionAvailable ? ' ✅ DISPONÍVEL' : ' ❌ Indisponível nesta sessão'}
4. **Google Calendar** - Agenda e eventos${googleAvailable ? ' ✅ DISPONÍVEL' : ' ❌ Não autenticado'}
5. **Gmail** - Emails${googleAvailable ? ' ✅ DISPONÍVEL' : ' ❌ Não autenticado'}

## CONTEXTO FREELAW (MUITO IMPORTANTE)

Guilherme trabalha na **Freelaw** (legaltech). Ele lidera áreas de:
- **Comunidade** - Engajamento de advogados
- **Financeiro** - Gestão financeira da empresa

### Time de Comunidade (pessoas importantes):
- **Rik / Richardson** - Richardson Aparecido Urquiza, membro do time
- **Julia H / Julia Horta** - Membro do time
- **Bianca** - Bianca Stefania, membro do time
- **Amanda** - Suporte comunidade

### Terminologia Freelaw:
- **Cards** = Entregas/objetivos individuais de cada pessoa do time (ficam no Notion ou Obsidian em 10-AREAS/Profissional/Freelaw/40-COMUNIDADE)
- **MT / Management Team** = Reunião de gestão
- **Weekly** = Reunião semanal
- **OKRs** = Objetivos e resultados-chave
- **Report** = Relatório mensal

### Onde buscar informações da Freelaw:
- **Notion**: Informações oficiais, databases, documentos da empresa
- **Obsidian** (10-AREAS/Profissional/Freelaw/): Notas pessoais, reuniões, acompanhamentos
  - 40-COMUNIDADE/: Cards, OKRs, reports da comunidade
  - 20-PESSOAS/: Perfis das pessoas do time

## REGRA CRÍTICA: QUANDO NÃO TIVER CERTEZA

Se você não souber EXATAMENTE o que o usuário quer ou ONDE buscar:
1. **PERGUNTE NO MÁXIMO 1–2 PERGUNTAS** para clarificar
2. **NÃO CHUTE FATOS** (não invente informação). Mas você PODE ser propositivo com hipóteses e opções.
3. **AINDA ASSIM SEJA ÚTIL**: ofereça uma recomendação inicial baseada no que você tem, deixando claro as suposições.

## REGRA CRÍTICA: NUNCA INVENTAR INFORMAÇÕES

⚠️ **PROIBIDO ALUCINAR** ⚠️

1. **NUNCA** invente informações que não estão explicitamente nos arquivos
2. **SOMENTE** apresente dados que você leu diretamente do arquivo
3. Se não encontrar, diga: "Não encontrei essa informação"

## REGRA CRÍTICA: APRESENTAÇÃO DAS INFORMAÇÕES

Quando receber conteúdo de um arquivo:
1. **NÃO** despeje o conteúdo raw/bruto do arquivo
2. **INTERPRETE** o conteúdo e responda de forma CONVERSACIONAL
3. **REMOVA** links internos do Obsidian (formato wikilinks)
4. **RESUMA** as informações relevantes para a pergunta do usuário
5. **FORMATE** de forma limpa e agradável

ERRADO (não faça isso):
"✅ CONTEÚDO DE arquivo.md: # Título ..."

CERTO (faça assim):
"Encontrei suas atribuições! Na Freelaw você atua como:
• CFO (Diretor Financeiro)
• Líder do Time de Comunidade (6 pessoas)
..."

## REGRA CRÍTICA: BUSCAR E LER

Quando o usuário pedir informações:
1. **BUSQUE** com SEARCH_VAULT
2. **LEIA** o arquivo com READ_NOTE usando o PATH EXATO retornado na busca
3. **EXTRAIA** APENAS informações que estão NO TEXTO que você leu
4. **CITE** a fonte: "De acordo com o arquivo X..."

**PATHS CORRETOS** - Use os caminhos EXATOS da busca:
- ✅ "10-AREAS/Profissional/Freelaw/40-COMUNIDADE/Cards-Dezembro-2025-Proposta.md"
- ❌ "10-AREAS/Profissional/Freelaw/40-COMUNIDADE/Card Rik Dezembro.md" (NÃO INVENTE PATHS)

Se o READ_NOTE falhar, tente outro arquivo da lista encontrada. NÃO INVENTE o conteúdo!

## COMO FUNCIONAR

1. **ENTENDA** o que o usuário quer
2. **EXECUTE IMEDIATAMENTE** se for uma CONSULTA (buscar, ler, listar)
3. **PEÇA CONFIRMAÇÃO** apenas para AÇÕES que modificam (criar nota, criar tarefa, completar)
4. **SEJA DIRETO** - não fique perguntando várias vezes

### CONSULTAS (execute direto, sem perguntar):
- "O que está no card do Rik?" → EXECUTE SEARCH_VAULT imediatamente
- "Minhas tarefas de hoje" → EXECUTE LIST_TASKS imediatamente
- "Busca notas sobre X" → EXECUTE SEARCH_VAULT imediatamente

### AÇÕES (peça confirmação):
- "Cria uma nota sobre X" → Proponha e aguarde confirmação
- "Adiciona tarefa Y" → Proponha e aguarde confirmação

## AÇÕES DISPONÍVEIS

Quando o usuário CONFIRMAR, você executa ações usando estas tags:

### Obsidian - Criar Nota
[EXECUTE:CREATE_NOTE]
type: livro|conceito|projeto|prof|pessoal|reuniao|inbox
title: Título
content: Conteúdo em markdown
[/EXECUTE]

### Obsidian - Buscar Notas
[EXECUTE:SEARCH_VAULT]
query: termo
[/EXECUTE]

### Obsidian - Ler Nota
[EXECUTE:READ_NOTE]
path: caminho/nota.md
[/EXECUTE]

### Todoist - Criar Tarefa
[EXECUTE:CREATE_TASK]
content: Descrição
due: today|tomorrow|monday|etc (opcional)
priority: 1-4 (opcional)
[/EXECUTE]

### Todoist - Listar Tarefas
[EXECUTE:LIST_TASKS]
filter: today|all
[/EXECUTE]

### Todoist - Completar Tarefa
[EXECUTE:COMPLETE_TASK]
id: task_id
[/EXECUTE]

${notionAvailable ? `### Notion - Buscar
[EXECUTE:NOTION_SEARCH]
query: termo de busca
[/EXECUTE]

### Notion - Ler Página
[EXECUTE:NOTION_FETCH]
id: page_id ou URL
[/EXECUTE]` : ''}

${googleAvailable ? `### Google Calendar - Eventos de Hoje
[EXECUTE:CALENDAR_TODAY]
[/EXECUTE]

### Google Calendar - Eventos da Semana
[EXECUTE:CALENDAR_WEEK]
[/EXECUTE]

### Google Calendar - Próximo Evento
[EXECUTE:CALENDAR_NEXT]
[/EXECUTE]

### Google Calendar - Criar Evento Rápido
[EXECUTE:CALENDAR_QUICK]
text: Reunião com João amanhã às 14h
[/EXECUTE]

### Gmail - Emails Não Lidos
[EXECUTE:GMAIL_UNREAD]
max: 10
[/EXECUTE]

### Gmail - Emails Importantes
[EXECUTE:GMAIL_IMPORTANT]
[/EXECUTE]

### Gmail - Buscar Emails
[EXECUTE:GMAIL_SEARCH]
query: from:alguem@email.com
max: 10
[/EXECUTE]

### Gmail - Ler Email
[EXECUTE:GMAIL_READ]
id: message_id
[/EXECUTE]` : ''}

## ESTRUTURA DO VAULT OBSIDIAN

- 00-INBOX: Anotações rápidas, não processadas
- 10-AREAS/Pessoal: Vida pessoal, saúde, família, finanças pessoais
- 10-AREAS/Profissional: Trabalho geral
- 10-AREAS/Profissional/Freelaw: Empresa principal (tech jurídica)
  - 40-COMUNIDADE: Área de comunidade da Freelaw
  - 10-FINANCAS: Área financeira
  - 20-PESSOAS: Perfis de pessoas do time
- 20-RESOURCES/Livros: Notas de livros
- 20-RESOURCES/Conceitos: Definições e conceitos
- 30-PROJECTS: Projetos ativos
- 40-ARCHIVE: Arquivados

## REGRAS IMPORTANTES

1. **NUNCA execute ações sem confirmação** - sempre proponha primeiro
2. **Seja conversacional** - não pareça um robô
3. **Seja específico** nas propostas - diga exatamente o que vai fazer
4. **Pode fazer múltiplas ações** em sequência após uma confirmação
5. **Cross-platform**: pode ler do Notion e criar no Obsidian/Todoist
6. **Palavras de confirmação**: sim, pode, ok, vai, faz, isso, confirmo, por favor, manda
7. **Palavras de negação**: não, cancela, espera, para, deixa

## REGRA DE QUALIDADE (MUITO IMPORTANTE)

Quando o usuário pedir **prioridades / próximos projetos / planejamento**:
1. Busque contexto no Obsidian (SEARCH_VAULT) sobre o tema e período (ex.: Q1 2026, comunidade).
2. Se fizer sentido, consulte tarefas (LIST_TASKS) e agenda (CALENDAR_WEEK ou CALENDAR_TODAY) para contexto de carga.
3. Responda de forma **analítica e propositiva**, com:
   - Contexto (o que você entendeu)
   - Opções (2–4 caminhos) com prós/contras
   - Recomendação (top 1–2) e por quê
   - Próximos passos (ações concretas)
   - Perguntas (no máximo 1–2) para refinar

## EXEMPLOS DE CONVERSA

**Usuário:** quero anotar sobre a reunião de hoje com financeiro
**Cortex:** Entendi! Vou criar uma nota de reunião em Profissional com as informações que você passar. Me conta o que foi discutido?

**Usuário:** decidimos aprovar budget de Q1 em 50k e revisar contratos
**Cortex:** Perfeito! Vou fazer o seguinte:

📝 **Criar nota no Obsidian:**
- Local: 10-AREAS/Profissional (reunião)
- Título: "Reunião Financeiro - Budget Q1"
- Conteúdo: Decisões sobre budget e contratos

✅ **Criar tarefas no Todoist:**
- "Revisar contratos - follow-up reunião financeiro"

Posso prosseguir?

**Usuário:** pode
**Cortex:** [EXECUTA AS AÇÕES]

---

**Usuário:** busca no notion sobre comunidade e me faz um resumo no obsidian
**Cortex:** Vou buscar informações sobre Comunidade no Notion e depois criar um resumo organizado no seu Obsidian. Posso começar?

**Usuário:** sim
**Cortex:** [EXECUTE:NOTION_SEARCH]query: comunidade[/EXECUTE]

[Após receber resultados, continua a conversa propondo criar a nota]

---

**Usuário:** o que tenho pra hoje na agenda?
**Cortex:** [EXECUTE:CALENDAR_TODAY][/EXECUTE]

[Após receber eventos, apresenta de forma resumida e conversacional]

---

**Usuário:** algum email importante não lido?
**Cortex:** [EXECUTE:GMAIL_IMPORTANT][/EXECUTE]

[Apresenta os emails importantes de forma clara]

---

**Usuário:** qual meu próximo compromisso?
**Cortex:** [EXECUTE:CALENDAR_NEXT][/EXECUTE]

[Mostra o próximo evento com horário e detalhes relevantes]`;
  }

  private getState(chatId: number): ConversationState {
    if (!this.conversations.has(chatId)) {
      this.conversations.set(chatId, {
        messages: [],
        pendingActions: [],
        awaitingConfirmation: false
      });
    }
    return this.conversations.get(chatId)!;
  }

  private isConfirmation(text: string): boolean {
    const confirmWords = ['sim', 'pode', 'ok', 'vai', 'faz', 'isso', 'confirmo', 'por favor', 'manda', 'bora', 'vamos', 'yes', 'go', 'blz', 'beleza', 'perfeito', 'manda ver', 'tá bom', 'ta bom', 'certo', 'fechado'];
    const lower = text.toLowerCase().trim();
    return confirmWords.some(w => lower.includes(w) || lower === w);
  }

  private isNegation(text: string): boolean {
    const negWords = ['não', 'nao', 'cancela', 'espera', 'para', 'deixa', 'no', 'cancel', 'stop', 'aguarda', 'perai', 'calma'];
    const lower = text.toLowerCase().trim();
    return negWords.some(w => lower.includes(w) || lower === w);
  }

  async chat(chatId: number, userMessage: string): Promise<BrainResponse> {
    const state = this.getState(chatId);
    
    // Check if this is a confirmation/negation of pending actions
    if (state.awaitingConfirmation && state.pendingActions.length > 0) {
      if (this.isConfirmation(userMessage)) {
        // Execute pending actions
        return await this.executePendingActions(chatId);
      } else if (this.isNegation(userMessage)) {
        state.pendingActions = [];
        state.awaitingConfirmation = false;
        return {
          message: 'Ok, cancelei as ações. O que mais posso fazer por você?',
          needsConfirmation: false,
          pendingActions: []
        };
      }
    }

    // Add user message to history
    state.messages.push({ role: 'user', content: userMessage });
    
    // Keep history manageable
    if (state.messages.length > 30) {
      state.messages = state.messages.slice(-30);
    }

    try {
      const notionAvailable = !!this.notionSearch;
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt(notionAvailable) },
          ...state.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        ],
        temperature: 0.7,
        max_tokens: 2500,
      });

      const assistantMessage = response.choices[0].message.content || '';
      state.messages.push({ role: 'assistant', content: assistantMessage });

      // Check if response contains EXECUTE tags (AI wants to execute now)
      const hasExecuteTags = /\[EXECUTE:\w+\]/.test(assistantMessage) || /\bEXECUTE:\w+\b/.test(assistantMessage);
      
      if (hasExecuteTags) {
        // Extract and execute actions
        const results = await this.processExecutions(assistantMessage, state);
        const cleanMessage = this.removeExecuteTags(assistantMessage);

        const followupNeeded = this.shouldGenerateFollowup(results, state);
        if (followupNeeded) {
          // Remove the "execute-tagged" assistant message from history to avoid loops.
          state.messages.pop();
          const finalMessage = await this.generateFollowupAnswer(state, cleanMessage, results);
          state.messages.push({ role: 'assistant', content: finalMessage });
          return {
            message: finalMessage,
            needsConfirmation: false,
            pendingActions: []
          };
        }

        // Simple actions: append compact results
        const resultText = results.map(r =>
          r.success ? `✅ ${r.summary}` : `❌ ${r.actionType}: ${r.error}`
        ).join('\n');

        return {
          message: (cleanMessage ? `${cleanMessage}\n\n${resultText}` : resultText).trim(),
          needsConfirmation: false,
          pendingActions: []
        };
      }

      // Check if AI is proposing actions (asking for confirmation)
      const isProposing = this.detectProposal(assistantMessage);
      
      if (isProposing) {
        state.awaitingConfirmation = true;
        // Parse proposed actions from the message for later execution
        state.pendingActions = this.parseProposedActions(assistantMessage);
      }

      return {
        message: assistantMessage,
        needsConfirmation: isProposing,
        pendingActions: state.pendingActions
      };

    } catch (error) {
      logger.error(`Brain error: ${error instanceof Error ? error.message : 'Unknown'}`);
      throw error;
    }
  }

  private detectProposal(message: string): boolean {
    const proposalIndicators = [
      'posso prosseguir',
      'posso fazer isso',
      'posso continuar',
      'posso executar',
      'confirma',
      'quer que eu',
      'devo criar',
      'devo fazer',
      'vou fazer o seguinte',
      'o plano é',
      'minha proposta',
      'o que acha',
      'tudo certo',
      'pode ser'
    ];
    const lower = message.toLowerCase();
    return proposalIndicators.some(p => lower.includes(p));
  }

  private parseProposedActions(message: string): PendingAction[] {
    // Store the full message as context for when user confirms
    return [{
      id: Date.now().toString(),
      description: 'Ações propostas',
      action: 'PROPOSAL',
      params: { context: message }
    }];
  }

  private async executePendingActions(chatId: number): Promise<BrainResponse> {
    const state = this.getState(chatId);
    state.awaitingConfirmation = false;
    
    // Ask AI to execute the proposed actions
    state.messages.push({ role: 'user', content: 'Confirmado. Execute as ações propostas.' });
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt(!!this.notionSearch) + '\n\nO USUÁRIO CONFIRMOU. EXECUTE AGORA usando as tags [EXECUTE:...]. NÃO peça confirmação novamente.' },
          ...state.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        ],
        temperature: 0.3,
        max_tokens: 2500,
      });

      const assistantMessage = response.choices[0].message.content || '';
      state.messages.push({ role: 'assistant', content: assistantMessage });
      state.pendingActions = [];

      // Process executions
      const results = await this.processExecutions(assistantMessage, state);
      const cleanMessage = this.removeExecuteTags(assistantMessage);

      const followupNeeded = this.shouldGenerateFollowup(results, state);
      if (followupNeeded) {
        // Remove the "execute-tagged" assistant message from history to avoid loops.
        state.messages.pop();
        const finalMessage = await this.generateFollowupAnswer(state, cleanMessage, results);
        state.messages.push({ role: 'assistant', content: finalMessage });
        return {
          message: finalMessage || 'Pronto! Ações executadas.',
          needsConfirmation: false,
          pendingActions: []
        };
      }

      const resultText = results.map(r =>
        r.success ? `✅ ${r.summary}` : `❌ ${r.actionType}: ${r.error}`
      ).join('\n');

      return {
        message: (cleanMessage ? `${cleanMessage}\n\n${resultText}` : resultText).trim() || 'Pronto! Ações executadas.',
        needsConfirmation: false,
        pendingActions: []
      };

    } catch (error) {
      logger.error(`Brain execution error: ${error}`);
      return {
        message: 'Ops, tive um problema ao executar. Pode tentar de novo?',
        needsConfirmation: false,
        pendingActions: []
      };
    }
  }

  private async processExecutions(
    message: string, 
    state: ConversationState
  ): Promise<ExecutionOutcome[]> {
    const results: ExecutionOutcome[] = [];
    const normalized = this.normalizeExecuteMessage(message);
    const executeRegex = /\[EXECUTE:(\w+)\]([\s\S]*?)\[\/EXECUTE\]/g;
    
    let match;
    while ((match = executeRegex.exec(normalized)) !== null) {
      const actionType = match[1];
      const params = this.parseParams(match[2]);
      
      try {
        const result = await this.executeAction(actionType, params, state);
        results.push({ success: true, actionType, summary: result });
      } catch (error) {
        results.push({ 
          success: false, 
          actionType,
          summary: actionType,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    return results;
  }

  private shouldGenerateFollowup(results: ExecutionOutcome[], state: ConversationState): boolean {
    // If we loaded any "data" into state or used query-style actions, generate a coherent final answer.
    const followupActions = new Set([
      'SEARCH_VAULT',
      'READ_NOTE',
      'NOTION_SEARCH',
      'NOTION_FETCH',
      'LIST_TASKS',
      'CALENDAR_TODAY',
      'CALENDAR_WEEK',
      'CALENDAR_NEXT',
      'GMAIL_UNREAD',
      'GMAIL_IMPORTANT',
      'GMAIL_SEARCH',
      'GMAIL_READ',
    ]);
    if (state.lastNotionData && state.lastNotionData.trim().length > 0) return true;
    return results.some(r => followupActions.has(r.actionType));
  }

  private async generateFollowupAnswer(
    state: ConversationState,
    draftMessage: string,
    results: ExecutionOutcome[],
  ): Promise<string> {
    const notionAvailable = !!this.notionSearch;
    const toolSummary = results
      .map(r => (r.success ? `OK ${r.actionType}: ${r.summary}` : `ERR ${r.actionType}: ${r.error}`))
      .join('\n');

    const data = (state.lastNotionData || '').trim();
    const dataBlock = data
      ? `\n\n[DADOS INTERNOS - NÃO MOSTRAR RAW]\n${data.substring(0, 6500)}`
      : '';

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: this.getSystemPrompt(notionAvailable) },
        ...state.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        {
          role: 'system',
          content:
            `Você acabou de executar ações internas e recebeu resultados.\n` +
            `- NÃO mostre dumps/raw.\n` +
            `- Responda direto, organizado e ÚTIL.\n` +
            `- Seja propositivo: traga opções, trade-offs e uma recomendação.\n` +
            `- Faça no máximo 1–2 perguntas quando necessário.\n` +
            `\n` +
            `FORMATO (escolha o mais apropriado):\n` +
            `A) Avaliação de desempenho:\n` +
            `   - Resumo (3 bullets)\n` +
            `   - Evidências (com citação da fonte pelo PATH quando houver)\n` +
            `   - Pontos fortes\n` +
            `   - Pontos a melhorar\n` +
            `   - Próximos passos (ações)\n` +
            `   - Perguntas (0–2)\n` +
            `B) Projetos / prioridades / planejamento:\n` +
            `   - Contexto (1 parágrafo)\n` +
            `   - Hipóteses (se faltar info)\n` +
            `   - Opções (2–4) com prós/contras\n` +
            `   - Recomendação (top 1–2) + por quê\n` +
            `   - Próximos passos (3–6 bullets acionáveis)\n` +
            `   - Perguntas (0–2)\n` +
            `\n` +
            `- Se os dados estiverem ambíguos (vários candidatos), NÃO escolha errado: pergunte e mostre 2–3 opções.\n\n` +
            `[RESULTADOS DE AÇÕES]\n${toolSummary}${dataBlock}`
        },
        {
          role: 'user',
          content:
            `Reescreva a resposta final ao usuário agora.\n\n` +
            `Rascunho (pode ignorar se estiver ruim):\n${draftMessage}`.trim()
        }
      ],
      temperature: 0.3,
      max_tokens: 900,
    });

    const msg = response.choices[0].message.content || '';
    return this.removeExecuteTags(msg);
  }

  private appendInternalData(state: ConversationState, title: string, payload: string, limit: number = 6500): void {
    const header = `\n\n=== ${title} ===\n`;
    const next = (state.lastNotionData || '') + header + payload;
    state.lastNotionData = next.length > limit ? next.substring(next.length - limit) : next;
  }

  /**
   * Aceita variações do formato de execução retornado pelo modelo.
   * Ex:
   * - EXECUTE:CALENDAR_TODAY
   * - [EXECUTE:CALENDAR_TODAY] (sem fechamento)
   * - [EXECUTE:CALENDAR_TODAY] ... [/EXECUTE]
   */
  private normalizeExecuteMessage(message: string): string {
    let m = message;

    // Converte linhas "EXECUTE:ACTION" para o bloco esperado
    m = m.replace(
      /(^|\n)\s*EXECUTE:(\w+)\s*(?=\n|$)/g,
      (_all, prefix: string, action: string) => `${prefix}[EXECUTE:${action}]\n[/EXECUTE]`,
    );

    // Se houver abertura mas não houver nenhum fechamento, fecha no final
    if (/\[EXECUTE:\w+\]/.test(m) && !/\[\/EXECUTE\]/.test(m)) {
      m += '\n[/EXECUTE]';
    }

    return m;
  }

  private parseParams(content: string): Record<string, string> {
    const params: Record<string, string> = {};
    const lines = content.trim().split('\n');
    let currentKey = '';
    let currentValue = '';
    
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && colonIdx < 20 && !line.startsWith(' ')) {
        if (currentKey) params[currentKey] = currentValue.trim();
        currentKey = line.substring(0, colonIdx).trim().toLowerCase();
        currentValue = line.substring(colonIdx + 1);
      } else if (currentKey) {
        currentValue += '\n' + line;
      }
    }
    if (currentKey) params[currentKey] = currentValue.trim();
    
    return params;
  }

  private async executeAction(
    actionType: string, 
    params: Record<string, string>,
    state: ConversationState
  ): Promise<string> {
    logger.info(`Brain executing: ${actionType}`);
    
    switch (actionType) {
      case 'CREATE_NOTE': {
        const result = await noteService.processNote({
          content: params.content || '',
          type: (params.type as NoteType) || 'inbox',
          title: params.title,
        });
        return `Nota criada: ${result.filePath.split('/').pop()}`;
      }

      case 'CREATE_TASK': {
        const todoist = getTodoistService();
        const task = await todoist.createTask({
          content: params.content,
          due_string: params.due,
          priority: params.priority ? parseInt(params.priority) as 1|2|3|4 : undefined,
        });
        return `Tarefa criada: "${task.content}"`;
      }

      case 'LIST_TASKS': {
        const todoist = getTodoistService();
        const filter = params.filter === 'all' ? undefined : 'today | overdue';
        const tasks = await todoist.getTasks(filter);
        
        if (tasks.length === 0) return 'Nenhuma tarefa encontrada';
        
        const list = tasks.slice(0, 10).map((t, i) => {
          const p = t.priority > 1 ? ` [P${5-t.priority}]` : '';
          const d = t.due ? ` 📅${t.due.string}` : '';
          return `${i+1}. ${t.content}${p}${d}`;
        }).join('\n');
        
        // Store in state for AI context
        this.appendInternalData(state, 'TODOIST (amostra)', list);
        return `Tarefas carregadas (${tasks.length})`;
      }

      case 'COMPLETE_TASK': {
        const todoist = getTodoistService();
        await todoist.completeTask(params.id);
        return `Tarefa ${params.id} concluída`;
      }

      case 'SEARCH_VAULT': {
        const vault = getVaultService();
        const query = (params.query || '').trim();
        if (!query) return 'Busca inválida: query vazia';

        const results = this.searchVaultRanked(vault, query);
        if (results.length === 0) return `Nenhuma nota encontrada para "${query}"`;

        // Ambiguous → do not read, ask user to choose
        if (this.isAmbiguousSearch(results)) {
          const top = results.slice(0, 6);
          this.appendInternalData(
            state,
            `BUSCA AMBÍGUA: ${query}`,
            `Peça ao usuário para escolher UM arquivo ou esclarecer (pessoa/quarter/projeto).\n\n` +
              `CANDIDATOS:\n` +
              top.map((r, i) => `${i + 1}. ${r.path}`).join('\n'),
          );
          return `Encontrei múltiplas notas possíveis para "${query}"`;
        }

        // Read best match
        const mainFile = results[0].path;
        const content = vault.readFile(mainFile);

        if (!content) {
          const fallback = results.slice(0, 3).map(r => r.path).join(', ');
          return `Encontrei arquivos mas não consegui ler. Tente: ${fallback}`;
        }

        const cleanContent = this.cleanObsidianContent(content).substring(0, 6500);
        this.appendInternalData(state, `FONTE: ${mainFile}`, cleanContent);
        return `Dados carregados do Obsidian: ${mainFile}`;
      }

      case 'READ_NOTE': {
        const vault = getVaultService();
        const content = vault.readFile(params.path);
        if (!content) return `Nota não encontrada: ${params.path}`;
        const cleanContent = this.cleanObsidianContent(content).substring(0, 6500);
        this.appendInternalData(state, `FONTE: ${params.path}`, cleanContent);
        return `Dados carregados do Obsidian: ${params.path}`;
      }

      case 'NOTION_SEARCH': {
        if (!this.notionSearch) return 'Notion não disponível';
        const results = await this.notionSearch(params.query);
        this.appendInternalData(state, `NOTION_SEARCH("${params.query}")`, results.substring(0, 6500));
        return `Resultados do Notion carregados (${Math.min(results.length, 6500)} chars)`;
      }

      case 'NOTION_FETCH': {
        if (!this.notionFetch) return 'Notion não disponível';
        const content = await this.notionFetch(params.id);
        this.appendInternalData(state, `NOTION_FETCH("${params.id}")`, content.substring(0, 6500));
        return `Conteúdo do Notion carregado (${content.length} caracteres)`;
      }

      // ==================== GOOGLE CALENDAR ====================
      
      case 'CALENDAR_TODAY': {
        if (!this.isGoogleAvailable()) return 'Google não autenticado. Peça ao usuário para rodar: obsidian-manager google auth';
        const calendar = getCalendarService();
        const events = await calendar.getTodayEvents();
        
        if (events.length === 0) return 'Nenhum evento para hoje! 🎉';
        
        const list = events.map(e => {
          const parsed = calendar.parseEvent(e);
          const time = parsed.isAllDay ? '📅 Dia inteiro' : `🕐 ${parsed.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
          const meet = parsed.meetLink ? ' 🔗' : '';
          return `• ${time} - ${parsed.title}${meet}`;
        }).join('\n');
        
        this.appendInternalData(state, 'CALENDAR_TODAY', list);
        return `📅 Eventos de hoje carregados (${events.length})`;
      }

      case 'CALENDAR_WEEK': {
        if (!this.isGoogleAvailable()) return 'Google não autenticado';
        const calendar = getCalendarService();
        const events = await calendar.getWeekEvents();
        
        if (events.length === 0) return 'Semana livre! Nenhum evento nos próximos 7 dias.';
        
        const formatted = calendar.formatEventList(events);
        this.appendInternalData(state, 'CALENDAR_WEEK', formatted);
        return `📅 Eventos da semana carregados (${events.length})`;
      }

      case 'CALENDAR_NEXT': {
        if (!this.isGoogleAvailable()) return 'Google não autenticado';
        const calendar = getCalendarService();
        const event = await calendar.getNextEvent();
        
        if (!event) return 'Nenhum próximo evento agendado.';
        
        const parsed = calendar.parseEvent(event);
        const time = parsed.isAllDay 
          ? 'Dia inteiro' 
          : parsed.start.toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
        const meet = parsed.meetLink ? `\n🔗 Meet: ${parsed.meetLink}` : '';
        const location = parsed.location ? `\n📍 ${parsed.location}` : '';
        
        return `⏰ PRÓXIMO EVENTO:\n\n📌 ${parsed.title}\n🕐 ${time}${location}${meet}`;
      }

      case 'CALENDAR_QUICK': {
        if (!this.isGoogleAvailable()) return 'Google não autenticado';
        const calendar = getCalendarService();
        const event = await calendar.quickAdd(params.text);
        return `✅ Evento criado: "${event.summary}"\n🔗 ${event.htmlLink}`;
      }

      // ==================== GMAIL ====================

      case 'GMAIL_UNREAD': {
        if (!this.isGoogleAvailable()) return 'Google não autenticado';
        const gmail = getGmailService();
        const max = params.max ? parseInt(params.max) : 10;
        const messageRefs = await gmail.getUnreadMessages(max);
        
        if (messageRefs.length === 0) return '✨ Inbox zero! Nenhum email não lido.';
        
        const messages = [];
        for (const ref of messageRefs.slice(0, 10)) {
          const msg = await gmail.getMessage(ref.id);
          const parsed = gmail.parseMessage(msg);
          const fromName = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from;
          messages.push(`• ${fromName.slice(0, 25)} - ${parsed.subject.slice(0, 40)}`);
        }
        
        const list = messages.join('\n');
        this.appendInternalData(state, 'GMAIL_UNREAD', list);
        return `📬 Emails não lidos carregados (${messageRefs.length})`;
      }

      case 'GMAIL_IMPORTANT': {
        if (!this.isGoogleAvailable()) return 'Google não autenticado';
        const gmail = getGmailService();
        const messageRefs = await gmail.getImportantUnread(10);
        
        if (messageRefs.length === 0) return '✨ Nenhum email importante não lido!';
        
        const messages = [];
        for (const ref of messageRefs) {
          const msg = await gmail.getMessage(ref.id);
          const parsed = gmail.parseMessage(msg);
          const fromName = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from;
          messages.push(`⭐ ${fromName.slice(0, 25)} - ${parsed.subject.slice(0, 40)}`);
        }
        
        const list = messages.join('\n');
        return `📧 EMAILS IMPORTANTES NÃO LIDOS (${messageRefs.length}):\n\n${list}`;
      }

      case 'GMAIL_SEARCH': {
        if (!this.isGoogleAvailable()) return 'Google não autenticado';
        const gmail = getGmailService();
        const max = params.max ? parseInt(params.max) : 10;
        const messages = await gmail.search(params.query, max);
        
        if (messages.length === 0) return `Nenhum email encontrado para: "${params.query}"`;
        
        const list = messages.map(msg => {
          const parsed = gmail.parseMessage(msg);
          const fromName = parsed.from.match(/^([^<]+)/)?.[1]?.trim() || parsed.from;
          return `• ${fromName.slice(0, 20)} - ${parsed.subject.slice(0, 35)}`;
        }).join('\n');
        
        this.appendInternalData(state, `GMAIL_SEARCH("${params.query}")`, list);
        return `🔍 Busca no Gmail carregada (${messages.length})`;
      }

      case 'GMAIL_READ': {
        if (!this.isGoogleAvailable()) return 'Google não autenticado';
        const gmail = getGmailService();
        const message = await gmail.getMessage(params.id);
        const parsed = gmail.parseMessage(message);
        
        const content = `
De: ${parsed.from}
Para: ${parsed.to.join(', ')}
Assunto: ${parsed.subject}
Data: ${parsed.date.toLocaleString('pt-BR')}

${parsed.body.slice(0, 2000)}${parsed.body.length > 2000 ? '\n\n[...truncado]' : ''}
        `.trim();
        
        this.appendInternalData(state, `GMAIL_READ("${params.id}")`, content);
        return `📧 Email carregado`;
      }

      default:
        return `Ação desconhecida: ${actionType}`;
    }
  }

  private searchVault(vault: ReturnType<typeof getVaultService>, query: string): string[] {
    // NOTE: kept for backwards compatibility; use searchVaultRanked for new logic
    return this.searchVaultRanked(vault, query).map(r => r.path);
  }

  private cleanObsidianContent(content: string): string {
    return content
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[path|name]] -> name
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // [[name]] -> name
      .replace(/^---[\s\S]*?---\n/m, ''); // Remove frontmatter
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^\p{L}\p{N}\s\-_/]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getStopwords(): Set<string> {
    return new Set([
      'a','o','os','as','um','uma','uns','umas',
      'de','do','da','dos','das','no','na','nos','nas',
      'para','pra','por','com','sem','em','e','ou','que','como',
      'qual','quais','quando','onde','porque','por que','porquê','porquê',
      'meu','minha','meus','minhas','seu','sua','seus','suas',
      'hoje','amanha','amanhã','agora','proximo','próximo','proximos','próximos',
      'preciso','quero','ajuda','ajudar','ver','buscar','procure','encontrar'
    ]);
  }

  private expandSynonyms(tokens: string[]): string[] {
    const out = new Set(tokens);
    const map: Record<string, string[]> = {
      'biel': ['gabriel'],
      'gabriel': ['biel'],
      'avaliacao': ['avaliacao','avaliacao','avd','performance','desempenho'],
      'avd': ['avaliacao','desempenho','performance'],
      'cards': ['card','okrs','okr'],
      'card': ['cards'],
      'mt': ['management','team'],
      'weekly': ['semanal'],
      'q1': ['q1','quarter1','trimestre1'],
      'q2': ['q2','quarter2','trimestre2'],
      'q3': ['q3','quarter3','trimestre3'],
      'q4': ['q4','quarter4','trimestre4'],
    };

    for (const t of tokens) {
      const add = map[t];
      if (add) add.forEach(a => out.add(a));
    }
    return Array.from(out);
  }

  private tokenizeQuery(query: string): string[] {
    const q = this.normalizeText(query);
    const raw = q.split(/\s+/).filter(Boolean);
    const stop = this.getStopwords();
    const tokens = raw
      .map(t => t.replace(/^[#@]/, ''))
      .filter(t => t.length >= 2)
      .filter(t => !stop.has(t));
    return this.expandSynonyms(tokens);
  }

  private getSearchRootsForQuery(tokens: string[]): string[] {
    const workHints = new Set([
      'freelaw','comunidade','financeiro','financas','avaliacao','avd','performance',
      'cards','card','okr','okrs','mt','weekly','pdi','lideranca','liderancas',
      'biel','gabriel','rik','richardson','julia','bianca','amanda'
    ]);

    const isWork = tokens.some(t => workHints.has(t));
    if (isWork) {
      return ['10-AREAS/Profissional/Freelaw', '10-AREAS/Profissional', '30-PROJECTS'];
    }
    return ['00-INBOX', '10-AREAS', '20-RESOURCES', '30-PROJECTS'];
  }

  private scorePath(pathStr: string, tokens: string[]): { score: number; reason: string } {
    const p = this.normalizeText(pathStr);
    let score = 0;
    const reasons: string[] = [];

    const inFreelaw = p.includes('10-areas/profissional/freelaw');
    if (inFreelaw) { score += 25; reasons.push('freelaw'); }
    if (p.includes('30-projects')) { score += 12; reasons.push('projects'); }
    if (p.includes('20-pessoas') || p.includes('pessoas')) { score += 10; reasons.push('pessoas'); }

    // filename boost
    const file = p.split('/').pop() || p;
    let fileMatches = 0;
    for (const t of tokens) {
      if (!t) continue;
      if (file.includes(t)) fileMatches++;
    }
    if (fileMatches > 0) {
      const add = Math.min(45, fileMatches * 18);
      score += add;
      reasons.push(`nome(${fileMatches})`);
    }

    // path token matches
    let pathMatches = 0;
    for (const t of tokens) {
      if (!t) continue;
      if (p.includes(`/${t}`) || p.includes(`${t}-`) || p.includes(`-${t}`) || p.includes(`_${t}`)) {
        pathMatches++;
      }
    }
    if (pathMatches > 0) {
      score += Math.min(25, pathMatches * 6);
      reasons.push(`path(${pathMatches})`);
    }

    // quarter/year heuristics
    const q = tokens.find(t => /^q[1-4]$/.test(t));
    if (q && p.includes(q)) { score += 10; reasons.push(q); }
    const year = tokens.find(t => /^\d{4}$/.test(t));
    if (year && p.includes(year)) { score += 6; reasons.push(year); }

    return { score, reason: reasons.join('+') || 'geral' };
  }

  private isAmbiguousSearch(results: Array<{ path: string; score: number; reason: string }>): boolean {
    if (results.length <= 1) return false;
    const top = results[0];
    const second = results[1];
    // If scores are close or top is weak, ask user.
    if (top.score < 35) return true;
    if (second.score >= top.score - 8) return true;
    return false;
  }

  private searchVaultRanked(
    vault: ReturnType<typeof getVaultService>,
    query: string
  ): Array<{ path: string; score: number; reason: string }> {
    const tokens = this.tokenizeQuery(query);
    const results: Array<{ path: string; score: number; reason: string }> = [];
    const roots = this.getSearchRootsForQuery(tokens);

    const seen = new Set<string>();

    const consider = (filePath: string) => {
      if (seen.has(filePath)) return;
      seen.add(filePath);
      const { score, reason } = this.scorePath(filePath, tokens);
      if (score > 0) results.push({ path: filePath, score, reason });
    };

    const search = (folder: string) => {
      try {
        for (const f of vault.listFiles(folder)) {
          const filePath = `${folder}/${f}`;
          consider(filePath);
        }
        for (const sub of vault.listFolders(folder)) {
          search(`${folder}/${sub}`);
        }
      } catch {
        // ignore
      }
    };

    roots.forEach(search);

    // Sort by score desc
    results.sort((a, b) => b.score - a.score);

    // If ranking found nothing meaningful, fall back to previous simplistic method with content match
    if (results.length === 0) {
      const fallback: string[] = [];
      const terms = this.normalizeText(query).split(/\s+/).filter(Boolean);
      const search2 = (folder: string) => {
        try {
          for (const f of vault.listFiles(folder)) {
            const filePath = `${folder}/${f}`;
            const fileName = this.normalizeText(f);
            if (terms.some(t => fileName.includes(t))) {
              fallback.push(filePath);
              continue;
            }
            if (f.endsWith('.md') && terms.length > 1) {
              const content = vault.readFile(filePath);
              if (content) {
                const cl = this.normalizeText(content);
                if (terms.every(t => cl.includes(t))) fallback.push(filePath);
              }
            }
          }
          for (const sub of vault.listFolders(folder)) search2(`${folder}/${sub}`);
        } catch { /* ignore */ }
      };
      ['00-INBOX', '10-AREAS', '20-RESOURCES', '30-PROJECTS'].forEach(search2);
      return fallback.slice(0, 10).map(p => ({ path: p, score: 1, reason: 'fallback' }));
    }

    // Content re-scoring for top candidates (cheap + improves precision)
    const top = results.slice(0, 8);
    for (const r of top) {
      try {
        const content = vault.readFile(r.path);
        if (!content) continue;
        const cl = this.normalizeText(content);
        let hits = 0;
        for (const t of tokens) if (t && cl.includes(t)) hits++;
        if (hits > 0) {
          r.score += Math.min(30, hits * 4);
          r.reason += `+conteudo(${hits})`;
        }
      } catch { /* ignore */ }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 20);
  }

  private removeExecuteTags(message: string): string {
    return message
      .replace(/\[EXECUTE:\w+\][\s\S]*?\[\/EXECUTE\]/g, '')
      .replace(/(^|\n)\s*EXECUTE:\w+\s*(?=\n|$)/g, '$1')
      .replace(/(^|\n)\s*\[EXECUTE:\w+\]\s*(?=\n|$)/g, '$1')
      .replace(/(^|\n)\s*\[\/EXECUTE\]\s*(?=\n|$)/g, '$1')
      .replace(/\[DADOS DO ARQUIVO[^\]]*\]:[\s\S]*$/g, '') // Remove raw data dumps
      .replace(/✅\s*(CONTEÚDO|ARQUIVOS|Encontrei)[\s\S]*?(Outros arquivos|$)/g, '') // Remove raw outputs
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  clearConversation(chatId: number): void {
    this.conversations.delete(chatId);
  }
}

let brainInstance: BrainService | null = null;

export function getBrainService(): BrainService {
  if (!brainInstance) {
    brainInstance = new BrainService();
  }
  return brainInstance;
}

export { BrainService };
