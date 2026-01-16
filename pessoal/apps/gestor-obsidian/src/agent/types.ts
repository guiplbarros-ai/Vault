export type ToolParams = Record<string, string>

export interface AgentToolContext {
  chatId: number
  appendInternalData: (title: string, payload: string, limit?: number) => void
  notion?: {
    search?: (query: string) => Promise<string>
    fetch?: (id: string) => Promise<string>
  }
}

export interface AgentTool {
  name: string
  description: string
  execute(params: ToolParams, ctx: AgentToolContext): Promise<string>
}
