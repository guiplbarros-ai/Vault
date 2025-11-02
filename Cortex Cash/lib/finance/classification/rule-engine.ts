/**
 * Rule Engine - Motor de Classificação Automática
 * Agent DATA: Owner
 *
 * Coordena classificação de transações usando regras e IA
 */

import { regraClassificacaoService } from '../../services/regra-classificacao.service';
import { categoriaService } from '../../services/categoria.service';
import { getDB } from '../../db/client';
import type { Transacao, TipoTransacao, OrigemClassificacao } from '../../types';

export interface ClassificationRequest {
  transacao_id?: string;
  descricao: string;
  valor: number;
  tipo: TipoTransacao;
  conta_id?: string;
}

export interface ClassificationResult {
  categoria_id: string | null;
  categoria_nome: string | null;
  origem: OrigemClassificacao;
  confianca: number;
  reasoning: string;
  regra_aplicada_id?: string;
  regra_aplicada_nome?: string;
}

export interface BatchClassificationRequest {
  transacoes: ClassificationRequest[];
  useAI?: boolean;
  aiConfig?: {
    defaultModel?: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';
    monthlyCostLimit?: number;
    allowOverride?: boolean;
    strategy?: 'aggressive' | 'balanced' | 'quality';
  };
}

export interface BatchClassificationResult {
  total: number;
  classified: number;
  by_rules: number;
  by_ai: number;
  unclassified: number;
  results: (ClassificationResult & { transacao_index: number })[];
}

/**
 * Classifica uma transação usando regras primeiro, depois IA (se configurado)
 */
export async function classifyTransaction(
  request: ClassificationRequest,
  useAI: boolean = true,
  aiConfig?: BatchClassificationRequest['aiConfig']
): Promise<ClassificationResult> {
  // ETAPA 1: Tenta aplicar regras primeiro
  const regraResultado = await regraClassificacaoService.aplicarRegras(request.descricao);

  if (regraResultado) {
    // Encontrou uma regra que casa
    try {
      const categoria = await categoriaService.getCategoriaById(regraResultado);

      // Verifica se categoria existe e não foi deletada
      if (categoria) {
        const regra = await regraClassificacaoService.listRegras({
          categoria_id: regraResultado,
          ativa: true,
        });

        const regraAplicada = regra[0]; // Pega a primeira (maior prioridade)

        return {
          categoria_id: regraResultado,
          categoria_nome: categoria.nome,
          origem: 'regra',
          confianca: 1.0, // Regras têm 100% de confiança
          reasoning: `Classificado por regra: ${regraAplicada?.nome || 'Desconhecida'}`,
          regra_aplicada_id: regraAplicada?.id,
          regra_aplicada_nome: regraAplicada?.nome,
        };
      }
    } catch (error) {
      // Se categoria não existe mais, ignora e tenta IA
      console.error('Erro ao buscar categoria da regra:', error);
    }
  }

  // ETAPA 2: Se não encontrou regra e IA está habilitada, usa IA
  if (useAI) {
    try {
      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: request.descricao,
          valor: request.valor,
          tipo: request.tipo,
          transacao_id: request.transacao_id,
          config: aiConfig,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          categoria_id: data.categoria_sugerida_id,
          categoria_nome: data.categoria_nome,
          origem: 'ia',
          confianca: data.confianca,
          reasoning: data.reasoning,
        };
      }
    } catch (error) {
      console.error('Erro ao classificar com IA:', error);
    }
  }

  // ETAPA 3: Não conseguiu classificar
  return {
    categoria_id: null,
    categoria_nome: null,
    origem: 'manual',
    confianca: 0,
    reasoning: 'Nenhuma regra ou sugestão de IA disponível',
  };
}

/**
 * Classifica múltiplas transações em lote (batch processing)
 */
export async function classifyBatch(
  request: BatchClassificationRequest
): Promise<BatchClassificationResult> {
  const results: (ClassificationResult & { transacao_index: number })[] = [];
  let by_rules = 0;
  let by_ai = 0;
  let unclassified = 0;

  for (let i = 0; i < request.transacoes.length; i++) {
    const transacao = request.transacoes[i];

    const result = await classifyTransaction(
      transacao,
      request.useAI ?? true,
      request.aiConfig
    );

    results.push({
      ...result,
      transacao_index: i,
    });

    // Contabiliza origem
    if (result.origem === 'regra') {
      by_rules++;
    } else if (result.origem === 'ia') {
      by_ai++;
    } else {
      unclassified++;
    }
  }

  return {
    total: request.transacoes.length,
    classified: by_rules + by_ai,
    by_rules,
    by_ai,
    unclassified,
    results,
  };
}

/**
 * Aplica classificação a uma transação existente no banco e atualiza
 */
export async function classifyAndUpdateTransaction(
  transacao_id: string,
  useAI: boolean = true,
  aiConfig?: BatchClassificationRequest['aiConfig']
): Promise<ClassificationResult> {
  const db = getDB();
  const transacao = await db.transacoes.get(transacao_id);

  if (!transacao) {
    throw new Error(`Transação não encontrada: ${transacao_id}`);
  }

  // Classifica
  const result = await classifyTransaction(
    {
      transacao_id,
      descricao: transacao.descricao,
      valor: transacao.valor,
      tipo: transacao.tipo,
      conta_id: transacao.conta_id,
    },
    useAI,
    aiConfig
  );

  // Atualiza transação se encontrou categoria
  if (result.categoria_id) {
    await db.transacoes.update(transacao_id, {
      categoria_id: result.categoria_id,
      classificacao_origem: result.origem,
      classificacao_confianca: result.confianca,
      classificacao_confirmada: result.origem === 'regra', // Regras são auto-confirmadas
      updated_at: new Date(),
    });
  }

  return result;
}

/**
 * Classifica múltiplas transações existentes e atualiza no banco
 */
export async function classifyAndUpdateBatch(
  transacao_ids: string[],
  useAI: boolean = true,
  aiConfig?: BatchClassificationRequest['aiConfig']
): Promise<BatchClassificationResult> {
  const db = getDB();
  const transacoes = await db.transacoes.bulkGet(transacao_ids);

  const requests: ClassificationRequest[] = transacoes
    .filter((t): t is Transacao => t !== undefined)
    .map(t => ({
      transacao_id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      tipo: t.tipo,
      conta_id: t.conta_id,
    }));

  const batchResult = await classifyBatch({
    transacoes: requests,
    useAI,
    aiConfig,
  });

  // Atualiza todas as transações que foram classificadas
  for (const result of batchResult.results) {
    const transacao = transacoes[result.transacao_index];
    if (transacao && result.categoria_id) {
      await db.transacoes.update(transacao.id, {
        categoria_id: result.categoria_id,
        classificacao_origem: result.origem,
        classificacao_confianca: result.confianca,
        classificacao_confirmada: result.origem === 'regra',
        updated_at: new Date(),
      });
    }
  }

  return batchResult;
}

/**
 * Obtém estatísticas de classificação automática
 */
export async function getClassificationStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  total_transacoes: number;
  classificadas: number;
  por_regra: number;
  por_ia: number;
  manuais: number;
  confirmadas: number;
  pendentes_confirmacao: number;
  taxa_acuracia: number; // % de confirmadas vs classificadas automaticamente
}> {
  const db = getDB();
  const start = startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ?? new Date();

  // Busca todas as transações no período
  const allTransacoes = await db.transacoes.toArray();
  const transacoes = allTransacoes.filter(t => {
    const data = t.data instanceof Date ? t.data : new Date(t.data);
    return data >= start && data <= end;
  });

  const total_transacoes = transacoes.length;
  const classificadas = transacoes.filter(t => t.categoria_id !== undefined && t.categoria_id !== null).length;
  const por_regra = transacoes.filter(t => t.classificacao_origem === 'regra').length;
  const por_ia = transacoes.filter(t => t.classificacao_origem === 'ia').length;
  const manuais = transacoes.filter(
    t => !t.classificacao_origem || t.classificacao_origem === 'manual'
  ).length;
  const confirmadas = transacoes.filter(t => t.classificacao_confirmada === true).length;
  const pendentes_confirmacao = transacoes.filter(
    t => t.classificacao_origem && t.classificacao_origem !== 'manual' && !t.classificacao_confirmada
  ).length;

  // Taxa de acurácia: % de confirmadas entre as classificadas automaticamente
  const classificadas_auto = por_regra + por_ia;
  const taxa_acuracia = classificadas_auto > 0 ? (confirmadas / classificadas_auto) * 100 : 0;

  return {
    total_transacoes,
    classificadas,
    por_regra,
    por_ia,
    manuais,
    confirmadas,
    pendentes_confirmacao,
    taxa_acuracia,
  };
}

/**
 * Confirma uma classificação de IA (marca como confirmada)
 */
export async function confirmClassification(transacao_id: string): Promise<void> {
  const db = getDB();
  await db.transacoes.update(transacao_id, {
    classificacao_confirmada: true,
    updated_at: new Date(),
  });
}

/**
 * Rejeita uma classificação de IA e remove categoria
 */
export async function rejectClassification(transacao_id: string): Promise<void> {
  const db = getDB();
  await db.transacoes.update(transacao_id, {
    categoria_id: undefined,
    classificacao_origem: 'manual',
    classificacao_confianca: undefined,
    classificacao_confirmada: false,
    updated_at: new Date(),
  });
}

/**
 * Confirma múltiplas classificações em lote
 */
export async function confirmBatch(transacao_ids: string[]): Promise<void> {
  const db = getDB();

  await db.transaction('rw', db.transacoes, async () => {
    for (const id of transacao_ids) {
      await db.transacoes.update(id, {
        classificacao_confirmada: true,
        updated_at: new Date(),
      });
    }
  });
}

/**
 * Rejeita múltiplas classificações em lote
 */
export async function rejectBatch(transacao_ids: string[]): Promise<void> {
  const db = getDB();

  await db.transaction('rw', db.transacoes, async () => {
    for (const id of transacao_ids) {
      await db.transacoes.update(id, {
        categoria_id: undefined,
        classificacao_origem: 'manual',
        classificacao_confianca: undefined,
        classificacao_confirmada: false,
        updated_at: new Date(),
      });
    }
  });
}
