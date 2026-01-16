import type { AgentTool, AgentToolContext, ToolParams } from './types.js'

export class ToolRegistry {
  private tools = new Map<string, AgentTool>()

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  list(): Array<{ name: string; description: string }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
    }))
  }

  async execute(name: string, params: ToolParams, ctx: AgentToolContext): Promise<string> {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new Error(`Ação desconhecida: ${name}`)
    }
    return await tool.execute(params, ctx)
  }
}
