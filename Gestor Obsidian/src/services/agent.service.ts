import { getBrainService, type BrainService } from './brain.service.js';
import { getRulesService } from './rules.service.js';

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
    // Inject external rules (vault) into Brain prompt (cached internally).
    const rules = getRulesService().getRules();
    this.brain.setExternalRules(rules);

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

