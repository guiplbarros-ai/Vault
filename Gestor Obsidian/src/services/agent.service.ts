import { getBrainService, type BrainService } from './brain.service.js';
import { getRulesService } from './rules.service.js';
import { getRulesDbService } from './rules-db.service.js';
import { getChatSettingsDbService } from './chat-settings-db.service.js';
import { getPolicyService } from './policy.service.js';

export interface AgentResponse {
  message: string;
  needsConfirmation: boolean;
}

class AgentService {
  private brain: BrainService;

  constructor() {
    this.brain = getBrainService();
  }

  async chat(chatId: number, text: string): Promise<AgentResponse> {
    // Inject rules into Brain prompt.
    // Cloud-first: Supabase rules (active). Fallback: vault file rules.
    let rules: string | null = null;
    try {
      const db = getRulesDbService();
      if (db.enabled()) {
        const chatDb = getChatSettingsDbService();
        const ws = chatDb.enabled() ? (await chatDb.getOrCreate(chatId)).workspace_id : undefined;
        rules = (await db.getActive(ws))?.body_md ?? null;
      }
    } catch {
      // ignore and fallback
    }
    if (!rules) {
      rules = getRulesService().getRules();
    }
    this.brain.setExternalRules(rules);

    // Policy layer: classify message and prefetch RAG context when useful.
    // Best-effort: never break user flow on policy errors.
    try {
      const policy = getPolicyService();
      if (policy.enabled()) {
        // Avoid accumulation of stale snippets across turns.
        this.brain.clearPrefilledContext(chatId);
        const decision = await policy.decide(chatId, text);
        await policy.apply(chatId, decision, (title, payload) => this.brain.prefillContext(chatId, title, payload));
      }
    } catch {
      // ignore
    }

    const res = await this.brain.chat(chatId, text);
    return { message: res.message, needsConfirmation: res.needsConfirmation };
  }

  clearConversation(chatId: number): void {
    this.brain.clearConversation(chatId);
  }
}

let agentInstance: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!agentInstance) agentInstance = new AgentService();
  return agentInstance;
}

export { AgentService };

