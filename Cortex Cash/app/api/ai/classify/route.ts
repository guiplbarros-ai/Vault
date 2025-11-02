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

interface ClassifyRequest {
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  transacao_id?: string;
  // Client config (optional, uses defaults if not provided)
  config?: {
    defaultModel?: AIModel;
    monthlyCostLimit?: number;
    allowOverride?: boolean;
    strategy?: AIStrategy;
  };
}

interface ClassifyResponse {
  categoria_sugerida_id: string | null;
  categoria_nome: string | null;
  confianca: number;
  reasoning: string;
  cached?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Verifica se a API key está configurada
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body: ClassifyRequest = await request.json();
    const { descricao, valor, tipo, transacao_id, config } = body;

    // Extract config with defaults
    const modelo = (config?.defaultModel || 'gpt-4o-mini') as AIModel;
    const monthlyCostLimit = config?.monthlyCostLimit ?? 10.0;
    const allowOverride = config?.allowOverride ?? false;
    const strategy = config?.strategy || 'balanced';

    // ETAPA 1: Verifica cache primeiro (para economizar custos)
    const cached = getCachedClassification(descricao, tipo);
    if (cached && cached.categoria_id) {
      console.log('✅ Cache hit para:', descricao.substring(0, 30));
      return NextResponse.json({
        categoria_sugerida_id: cached.categoria_id,
        categoria_nome: cached.categoria_nome,
        confianca: cached.confianca,
        reasoning: `${cached.reasoning} (cache)`,
        cached: true,
      });
    }

    // ETAPA 2: Verifica limite de gastos antes de fazer a chamada
    const budgetCheck = await checkAIBudgetLimit(new Date(), monthlyCostLimit, 0.8);
    if (budgetCheck.isOverLimit && !allowOverride) {
      return NextResponse.json(
        {
          error: 'AI budget limit exceeded',
          message: 'Limite de gastos de IA excedido. Ajuste nas configurações.',
        },
        { status: 429 }
      );
    }

    if (!descricao || !valor || !tipo) {
      return NextResponse.json(
        { error: 'Missing required fields: descricao, valor, tipo' },
        { status: 400 }
      );
    }

    // Busca categorias disponíveis
    const categorias = await categoriaService.listCategorias({
      tipo,
      ativas: true,
    });

    if (categorias.length === 0) {
      return NextResponse.json(
        {
          error: 'No categories available',
          message: 'Nenhuma categoria disponível para classificação',
        },
        { status: 400 }
      );
    }

    // ETAPA 3: Monta o prompt otimizado para a IA
    const prompt = generateClassificationPrompt(descricao, valor, tipo, categorias);

    // Define parâmetros baseados na estratégia
    const strategyParams = {
      aggressive: { temperature: 0.5, max_tokens: 150 },
      balanced: { temperature: 0.3, max_tokens: 200 },
      quality: { temperature: 0.1, max_tokens: 300 },
    };

    const params = strategyParams[strategy];

    // ETAPA 4: Faz chamada à OpenAI com prompt melhorado
    const completion = await openai.chat.completions.create({
      model: modelo,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
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
    let resultado: {
      categoria_id: string | null;
      confianca: number;
      reasoning: string;
    };

    try {
      // Remove possíveis markdown code blocks
      const jsonStr = resposta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      resultado = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', resposta);
      return NextResponse.json(
        {
          error: 'Invalid AI response',
          message: 'Resposta da IA não pôde ser processada',
        },
        { status: 500 }
      );
    }

    // Valida categoria sugerida
    let categoria_sugerida_id: string | null = null;
    let categoria_nome: string | null = null;

    if (resultado.categoria_id) {
      const categoria = categorias.find(c => c.id === resultado.categoria_id);
      if (categoria) {
        categoria_sugerida_id = categoria.id;
        categoria_nome = categoria.nome;
      }
    }

    // Registra uso da IA
    await logAIUsage({
      transacao_id,
      prompt,
      resposta,
      modelo: modelo as 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo',
      tokens_prompt: usage.prompt_tokens,
      tokens_resposta: usage.completion_tokens,
      categoria_sugerida_id: categoria_sugerida_id ?? undefined,
      confianca: resultado.confianca,
    });

    // ETAPA 5: Adiciona ao cache (se categoria foi encontrada e confiança >= 0.7)
    if (categoria_sugerida_id && categoria_nome && resultado.confianca >= 0.7) {
      setCachedClassification(
        descricao,
        tipo,
        categoria_sugerida_id,
        categoria_nome,
        resultado.confianca,
        resultado.reasoning
      );
      console.log('✅ Adicionado ao cache:', descricao.substring(0, 30));
    }

    const response: ClassifyResponse = {
      categoria_sugerida_id,
      categoria_nome,
      confianca: resultado.confianca,
      reasoning: resultado.reasoning,
      cached: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error classifying transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to classify transaction',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
