import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logAIUsage, checkAIBudgetLimit } from '@/lib/services/ai-usage.service';
import { categoriaService } from '@/lib/services/categoria.service';
import { generateClassificationPrompt, SYSTEM_PROMPT } from '@/lib/finance/classification/prompts';
import { getCachedClassification, setCachedClassification } from '@/lib/finance/classification/prompt-cache';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AIModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
type AIStrategy = 'aggressive' | 'balanced' | 'quality';

interface BatchClassifyItem {
  id: string; // ID único para rastrear a transação
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  transacao_id?: string;
}

interface BatchClassifyRequest {
  items: BatchClassifyItem[];
  config?: {
    defaultModel?: AIModel;
    monthlyCostLimit?: number;
    allowOverride?: boolean;
    strategy?: AIStrategy;
    concurrency?: number; // Número de classificações paralelas (padrão: 5)
  };
}

interface BatchClassifyResult {
  id: string;
  categoria_sugerida_id: string | null;
  categoria_nome: string | null;
  confianca: number;
  reasoning: string;
  cached: boolean;
  error?: string;
}

interface BatchClassifyResponse {
  results: BatchClassifyResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
    api_calls: number;
  };
}

/**
 * Processa uma única classificação
 */
async function classifyOne(
  item: BatchClassifyItem,
  config: {
    modelo: AIModel;
    strategy: AIStrategy;
    categorias: Array<any>; // Permite qualquer estrutura de categoria
  }
): Promise<BatchClassifyResult> {
  try {
    // Verifica cache primeiro
    const cached = getCachedClassification(item.descricao, item.tipo);
    if (cached && cached.categoria_id) {
      return {
        id: item.id,
        categoria_sugerida_id: cached.categoria_id,
        categoria_nome: cached.categoria_nome,
        confianca: cached.confianca,
        reasoning: `${cached.reasoning} (cache)`,
        cached: true,
      };
    }

    // Monta prompt
    const prompt = generateClassificationPrompt(
      item.descricao,
      item.valor,
      item.tipo,
      config.categorias
    );

    // Define parâmetros baseados na estratégia
    const strategyParams = {
      aggressive: { temperature: 0.5, max_tokens: 150 },
      balanced: { temperature: 0.3, max_tokens: 200 },
      quality: { temperature: 0.1, max_tokens: 300 },
    };

    const params = strategyParams[config.strategy];

    // Chama OpenAI
    const completion = await openai.chat.completions.create({
      model: config.modelo,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    });

    const resposta = completion.choices[0]?.message?.content ?? '';
    const usage = completion.usage;

    if (!usage) {
      throw new Error('No usage data returned from OpenAI');
    }

    // Parse da resposta
    const jsonStr = resposta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const resultado = JSON.parse(jsonStr) as {
      categoria_id: string | null;
      confianca: number;
      reasoning: string;
    };

    // Valida categoria
    let categoria_sugerida_id: string | null = null;
    let categoria_nome: string | null = null;

    if (resultado.categoria_id) {
      const categoria = config.categorias.find(c => c.id === resultado.categoria_id);
      if (categoria) {
        categoria_sugerida_id = categoria.id;
        categoria_nome = categoria.nome;
      }
    }

    // Registra uso
    await logAIUsage({
      transacao_id: item.transacao_id,
      prompt,
      resposta,
      modelo: config.modelo as 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo',
      tokens_prompt: usage.prompt_tokens,
      tokens_resposta: usage.completion_tokens,
      categoria_sugerida_id: categoria_sugerida_id ?? undefined,
      confianca: resultado.confianca,
    });

    // Adiciona ao cache se confiança >= 0.7
    if (categoria_sugerida_id && categoria_nome && resultado.confianca >= 0.7) {
      setCachedClassification(
        item.descricao,
        item.tipo,
        categoria_sugerida_id,
        categoria_nome,
        resultado.confianca,
        resultado.reasoning
      );
    }

    return {
      id: item.id,
      categoria_sugerida_id,
      categoria_nome,
      confianca: resultado.confianca,
      reasoning: resultado.reasoning,
      cached: false,
    };
  } catch (error) {
    console.error(`Error classifying item ${item.id}:`, error);
    return {
      id: item.id,
      categoria_sugerida_id: null,
      categoria_nome: null,
      confianca: 0,
      reasoning: '',
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Processa batch com controle de concorrência
 */
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          const result = await processor(item);
          results.push(result);
        }
      }
    });

  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  try {
    // Verifica API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body: BatchClassifyRequest = await request.json();
    const { items, config } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid items array' },
        { status: 400 }
      );
    }

    // Limita tamanho do batch (máximo 100 itens)
    if (items.length > 100) {
      return NextResponse.json(
        { error: 'Batch size exceeds maximum (100 items)' },
        { status: 400 }
      );
    }

    // Extract config
    const modelo = (config?.defaultModel || 'gpt-4o-mini') as AIModel;
    const monthlyCostLimit = config?.monthlyCostLimit ?? 10.0;
    const allowOverride = config?.allowOverride ?? false;
    const strategy = config?.strategy || 'balanced';
    const concurrency = config?.concurrency ?? 5;

    // Verifica limite de gastos
    const budgetCheck = await checkAIBudgetLimit(new Date(), monthlyCostLimit, 0.8);
    if (budgetCheck.isOverLimit && !allowOverride) {
      return NextResponse.json(
        {
          error: 'AI budget limit exceeded',
          message: 'Limite de gastos de IA excedido',
        },
        { status: 429 }
      );
    }

    // Busca categorias disponíveis (por tipo)
    const tiposUnicos = [...new Set(items.map(i => i.tipo))];
    const categoriasMap = new Map<'receita' | 'despesa', Array<any>>();

    for (const tipo of tiposUnicos) {
      const categorias = await categoriaService.listCategorias({
        tipo: tipo as 'receita' | 'despesa',
        ativas: true,
      });
      categoriasMap.set(tipo as 'receita' | 'despesa', categorias);
    }

    // Processa batch com concorrência controlada
    const results = await processBatch(
      items,
      async (item) => {
        const categorias = categoriasMap.get(item.tipo) || [];
        if (categorias.length === 0) {
          return {
            id: item.id,
            categoria_sugerida_id: null,
            categoria_nome: null,
            confianca: 0,
            reasoning: '',
            cached: false,
            error: 'No categories available',
          };
        }

        return classifyOne(item, { modelo, strategy, categorias });
      },
      concurrency
    );

    // Calcula estatísticas
    const summary = {
      total: results.length,
      successful: results.filter(r => r.categoria_sugerida_id && !r.error).length,
      failed: results.filter(r => r.error).length,
      cached: results.filter(r => r.cached).length,
      api_calls: results.filter(r => !r.cached && !r.error).length,
    };

    const response: BatchClassifyResponse = {
      results,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in batch classification:', error);
    return NextResponse.json(
      {
        error: 'Failed to process batch classification',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
