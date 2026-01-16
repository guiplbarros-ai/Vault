import OpenAI from 'openai'
import type { NoteType } from '../types/index.js'
import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'

loadEnv()

interface ClassificationResult {
  type: 'note' | 'task'
  noteType?: NoteType
  title: string
  content: string
  confidence: number
  reasoning: string
}

class AIService {
  private client: OpenAI
  private model = 'gpt-4o-mini'

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurado. Adicione ao arquivo .env')
    }

    this.client = new OpenAI({ apiKey })
  }

  async classifyMessage(message: string): Promise<ClassificationResult> {
    const systemPrompt = `Você é um assistente que classifica mensagens para um sistema de segundo cérebro (Obsidian + Todoist).

Analise a mensagem e decida:
1. Se é uma TAREFA (algo a fazer) → type: "task"
2. Se é uma NOTA (informação a guardar) → type: "note"

Para NOTAS, classifique em:
- "livro": Anotações sobre livros, resumos de capítulos, citações de livros
- "conceito": Definições, conceitos teóricos, explicações de termos
- "projeto": Informações sobre projetos específicos, planejamentos
- "prof": Assuntos de trabalho, reuniões profissionais, empresas (Freelaw, etc)
- "pessoal": Vida pessoal, família, saúde, hobbies, finanças pessoais
- "reuniao": Notas de reuniões específicas, atas, decisões de meetings
- "inbox": Quando não se encaixa bem em nenhuma categoria ou é muito genérico

Retorne APENAS um JSON válido no formato:
{
  "type": "note" ou "task",
  "noteType": "livro|conceito|projeto|prof|pessoal|reuniao|inbox" (apenas se type=note),
  "title": "título curto e descritivo (max 50 chars)",
  "content": "conteúdo processado/limpo",
  "confidence": 0.0 a 1.0,
  "reasoning": "explicação curta da classificação"
}`

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')

      logger.info(
        `AI classificou: "${message.substring(0, 30)}..." → ${result.type}/${result.noteType || 'task'} (${Math.round(result.confidence * 100)}%)`
      )

      return result as ClassificationResult
    } catch (error) {
      logger.error(`AI error: ${error instanceof Error ? error.message : 'Unknown'}`)

      // Fallback to inbox
      return {
        type: 'note',
        noteType: 'inbox',
        title: message.substring(0, 50),
        content: message,
        confidence: 0,
        reasoning: 'Fallback devido a erro na API',
      }
    }
  }

  async generateTitle(content: string, type: NoteType): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'Gere um título curto (max 50 caracteres) e descritivo para esta nota. Retorne APENAS o título, sem aspas ou formatação.',
          },
          { role: 'user', content: `Tipo: ${type}\nConteúdo: ${content}` },
        ],
        temperature: 0.5,
        max_tokens: 60,
      })

      return response.choices[0].message.content?.trim() || content.substring(0, 50)
    } catch {
      return content.substring(0, 50)
    }
  }

  async enrichContent(content: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que organiza notas. 
Receba o conteúdo e retorne uma versão melhor formatada em Markdown:
- Adicione headers se fizer sentido
- Use bullet points para listas
- Destaque termos importantes em **negrito**
- Mantenha o conteúdo original, apenas melhore a formatação
- Não adicione informação que não estava no original
- Se já estiver bem formatado, retorne como está`,
          },
          { role: 'user', content },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })

      return response.choices[0].message.content || content
    } catch {
      return content
    }
  }
}

let aiInstance: AIService | null = null

export function getAIService(): AIService {
  if (!aiInstance) {
    aiInstance = new AIService()
  }
  return aiInstance
}

export { AIService, type ClassificationResult }
