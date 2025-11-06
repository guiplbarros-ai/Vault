/**
 * Serviço de Orçamentos
 * Agent FINANCE: Implementador
 *
 * Fornece operações CRUD e tracking de orçamentos mensais
 */

import { getDB } from '../db/client';
import type { Orcamento } from '../types';
import { NotFoundError, DatabaseError, ValidationError } from '../errors';

export interface CreateOrcamentoDTO {
  nome: string;
  tipo: 'categoria' | 'centro_custo';
  categoria_id?: string;
  centro_custo_id?: string;
  mes_referencia: string; // YYYY-MM format
  valor_planejado: number;
  alerta_80?: boolean;
  alerta_100?: boolean;
}

export interface UpdateOrcamentoDTO {
  nome?: string;
  valor_planejado?: number;
  alerta_80?: boolean;
  alerta_100?: boolean;
}

export interface OrcamentoComProgresso extends Orcamento {
  percentual_usado: number;
  valor_restante: number;
  status: 'ok' | 'atencao' | 'excedido';
  categoria_nome?: string;
  categoria_icone?: string;
  categoria_cor?: string;
  centro_custo_nome?: string;
}

export class OrcamentoService {
  // ============================================================================
  // CRUD - Orçamentos
  // ============================================================================

  /**
   * Lista orçamentos com filtros
   */
  async listOrcamentos(options?: {
    mesReferencia?: string;
    tipo?: 'categoria' | 'centro_custo';
    categoriaId?: string;
    centroCustoId?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'valor_planejado' | 'valor_realizado' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Orcamento[]> {
    const db = getDB();

    let orcamentos: Orcamento[] = await db.orcamentos.toArray();

    // Filtrar por mês referência
    if (options?.mesReferencia) {
      orcamentos = orcamentos.filter((o) => o.mes_referencia === options.mesReferencia);
    }

    // Filtrar por tipo
    if (options?.tipo) {
      orcamentos = orcamentos.filter((o) => o.tipo === options.tipo);
    }

    // Filtrar por categoria
    if (options?.categoriaId) {
      orcamentos = orcamentos.filter((o) => o.categoria_id === options.categoriaId);
    }

    // Filtrar por centro de custo
    if (options?.centroCustoId) {
      orcamentos = orcamentos.filter((o) => o.centro_custo_id === options.centroCustoId);
    }

    // Ordenar
    const sortBy = options?.sortBy || 'nome';
    const sortOrder = options?.sortOrder || 'asc';

    orcamentos.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'nome') {
        compareA = a.nome.toLowerCase();
        compareB = b.nome.toLowerCase();
      } else if (sortBy === 'valor_planejado') {
        compareA = a.valor_planejado;
        compareB = b.valor_planejado;
      } else if (sortBy === 'valor_realizado') {
        compareA = a.valor_realizado;
        compareB = b.valor_realizado;
      } else if (sortBy === 'created_at') {
        compareA = a.created_at instanceof Date ? a.created_at : new Date(a.created_at);
        compareB = b.created_at instanceof Date ? b.created_at : new Date(b.created_at);
        compareA = compareA.getTime();
        compareB = compareB.getTime();
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
      } else {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
      }
    });

    // Aplicar paginação
    const offset = options?.offset || 0;
    const limit = options?.limit;

    if (limit !== undefined) {
      orcamentos = orcamentos.slice(offset, offset + limit);
    } else if (offset > 0) {
      orcamentos = orcamentos.slice(offset);
    }

    return orcamentos;
  }

  /**
   * Busca orçamento por ID
   */
  async getOrcamentoById(id: string): Promise<Orcamento | null> {
    const db = getDB();
    const orcamento = await db.orcamentos.get(id);
    return orcamento || null;
  }

  /**
   * Busca orçamento com informações de progresso
   */
  async getOrcamentoComProgresso(id: string): Promise<OrcamentoComProgresso | null> {
    const orcamento = await this.getOrcamentoById(id);
    if (!orcamento) return null;

    return this.enrichOrcamentoComProgresso(orcamento);
  }

  /**
   * Lista orçamentos com informações de progresso
   */
  async listOrcamentosComProgresso(options?: {
    mesReferencia?: string;
    tipo?: 'categoria' | 'centro_custo';
  }): Promise<OrcamentoComProgresso[]> {
    const orcamentos = await this.listOrcamentos(options);

    const enriched = await Promise.all(
      orcamentos.map(o => this.enrichOrcamentoComProgresso(o))
    );

    return enriched;
  }

  /**
   * Helper: Enriquece orçamento com dados de progresso e relações
   */
  private async enrichOrcamentoComProgresso(orcamento: Orcamento): Promise<OrcamentoComProgresso> {
    const db = getDB();

    const percentual_usado = orcamento.valor_planejado > 0
      ? (orcamento.valor_realizado / orcamento.valor_planejado) * 100
      : 0;

    const valor_restante = orcamento.valor_planejado - orcamento.valor_realizado;

    let status: 'ok' | 'atencao' | 'excedido' = 'ok';
    if (percentual_usado >= 100) {
      status = 'excedido';
    } else if (percentual_usado >= 80) {
      status = 'atencao';
    }

    const enriched: OrcamentoComProgresso = {
      ...orcamento,
      percentual_usado,
      valor_restante,
      status,
    };

    // Buscar informações da categoria (se aplicável)
    if (orcamento.tipo === 'categoria' && orcamento.categoria_id) {
      const categoria = await db.categorias.get(orcamento.categoria_id);
      if (categoria) {
        enriched.categoria_nome = categoria.nome;
        enriched.categoria_icone = categoria.icone;
        enriched.categoria_cor = categoria.cor;
      }
    }

    // Buscar informações do centro de custo (se aplicável)
    if (orcamento.tipo === 'centro_custo' && orcamento.centro_custo_id) {
      const centroCusto = await db.centros_custo.get(orcamento.centro_custo_id);
      if (centroCusto) {
        enriched.centro_custo_nome = centroCusto.nome;
      }
    }

    return enriched;
  }

  /**
   * Cria novo orçamento
   */
  async createOrcamento(data: CreateOrcamentoDTO): Promise<Orcamento> {
    const db = getDB();

    // Validações
    if (data.tipo === 'categoria' && !data.categoria_id) {
      throw new ValidationError('categoria_id é obrigatório quando tipo é "categoria"');
    }

    if (data.tipo === 'centro_custo' && !data.centro_custo_id) {
      throw new ValidationError('centro_custo_id é obrigatório quando tipo é "centro_custo"');
    }

    if (data.valor_planejado <= 0) {
      throw new ValidationError('Valor planejado deve ser maior que zero');
    }

    // Validar formato do mes_referencia (YYYY-MM)
    const mesRegex = /^\d{4}-\d{2}$/;
    if (!mesRegex.test(data.mes_referencia)) {
      throw new ValidationError('mes_referencia deve estar no formato YYYY-MM (ex: 2025-11)');
    }

    // Verificar se categoria/centro de custo existe
    if (data.tipo === 'categoria' && data.categoria_id) {
      const categoria = await db.categorias.get(data.categoria_id);
      if (!categoria) {
        throw new NotFoundError('Categoria não encontrada');
      }
    }

    if (data.tipo === 'centro_custo' && data.centro_custo_id) {
      const centroCusto = await db.centros_custo.get(data.centro_custo_id);
      if (!centroCusto) {
        throw new NotFoundError('Centro de custo não encontrado');
      }
    }

    const now = new Date();
    const orcamento: Orcamento = {
      id: crypto.randomUUID(),
      nome: data.nome,
      tipo: data.tipo,
      categoria_id: data.categoria_id,
      centro_custo_id: data.centro_custo_id,
      mes_referencia: data.mes_referencia,
      valor_planejado: data.valor_planejado,
      valor_realizado: 0,
      alerta_80: data.alerta_80 ?? true,
      alerta_100: data.alerta_100 ?? true,
      alerta_80_enviado: false,
      alerta_100_enviado: false,
      created_at: now,
      updated_at: now,
    };

    try {
      await db.orcamentos.add(orcamento);
      return orcamento;
    } catch (error) {
      throw new DatabaseError('Erro ao criar orçamento: ' + (error instanceof Error ? error.message : 'desconhecido'));
    }
  }

  /**
   * Atualiza orçamento existente
   */
  async updateOrcamento(id: string, data: UpdateOrcamentoDTO): Promise<Orcamento> {
    const db = getDB();

    const existing = await this.getOrcamentoById(id);
    if (!existing) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    if (data.valor_planejado !== undefined && data.valor_planejado <= 0) {
      throw new ValidationError('Valor planejado deve ser maior que zero');
    }

    const updated: Partial<Orcamento> = {
      updated_at: new Date(),
    };

    if (data.nome !== undefined) updated.nome = data.nome;
    if (data.valor_planejado !== undefined) updated.valor_planejado = data.valor_planejado;
    if (data.alerta_80 !== undefined) updated.alerta_80 = data.alerta_80;
    if (data.alerta_100 !== undefined) updated.alerta_100 = data.alerta_100;

    try {
      await db.orcamentos.update(id, updated);

      const orcamentoAtualizado = await this.getOrcamentoById(id);
      if (!orcamentoAtualizado) {
        throw new NotFoundError('Orçamento não encontrado após atualização');
      }

      return orcamentoAtualizado;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erro ao atualizar orçamento: ' + (error instanceof Error ? error.message : 'desconhecido'));
    }
  }

  /**
   * Deleta orçamento
   */
  async deleteOrcamento(id: string): Promise<void> {
    const db = getDB();

    const existing = await this.getOrcamentoById(id);
    if (!existing) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    await db.orcamentos.delete(id);
  }

  // ============================================================================
  // TRACKING - Valor Realizado
  // ============================================================================

  /**
   * Recalcula o valor realizado de um orçamento com base nas transações
   */
  async recalcularValorRealizado(orcamentoId: string): Promise<Orcamento> {
    const db = getDB();

    const orcamento = await this.getOrcamentoById(orcamentoId);
    if (!orcamento) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    // Extrair ano e mês do mes_referencia (formato: YYYY-MM)
    const [ano, mes] = orcamento.mes_referencia.split('-').map(Number);
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);

    let valorRealizado = 0;

    if (orcamento.tipo === 'categoria' && orcamento.categoria_id) {
      // Buscar transações de despesa nesta categoria no mês
      const transacoes = await db.transacoes
        .where('categoria_id')
        .equals(orcamento.categoria_id)
        .and(t => {
          const transacaoData = t.data instanceof Date ? t.data : new Date(t.data);
          return transacaoData >= dataInicio && transacaoData <= dataFim && t.tipo === 'despesa';
        })
        .toArray();

      valorRealizado = transacoes.reduce((sum, t) => sum + Math.abs(t.valor), 0);
    } else if (orcamento.tipo === 'centro_custo' && orcamento.centro_custo_id) {
      // Buscar transações no centro de custo no mês
      const transacoes = await db.transacoes
        .where('centro_custo_id')
        .equals(orcamento.centro_custo_id)
        .and(t => {
          const transacaoData = t.data instanceof Date ? t.data : new Date(t.data);
          return transacaoData >= dataInicio && transacaoData <= dataFim && t.tipo === 'despesa';
        })
        .toArray();

      valorRealizado = transacoes.reduce((sum, t) => sum + Math.abs(t.valor), 0);
    }

    // Atualizar valor_realizado
    await db.orcamentos.update(orcamentoId, {
      valor_realizado: valorRealizado,
      updated_at: new Date(),
    });

    // Verificar alertas
    await this.verificarAlertas(orcamentoId);

    const orcamentoAtualizado = await this.getOrcamentoById(orcamentoId);
    if (!orcamentoAtualizado) {
      throw new NotFoundError('Orçamento não encontrado após recalcular');
    }

    return orcamentoAtualizado;
  }

  /**
   * Recalcula o valor realizado de todos os orçamentos de um mês
   */
  async recalcularTodosDoMes(mesReferencia: string): Promise<number> {
    const orcamentos = await this.listOrcamentos({ mesReferencia });

    let count = 0;
    for (const orcamento of orcamentos) {
      try {
        await this.recalcularValorRealizado(orcamento.id);
        count++;
      } catch (error) {
        console.error(`Erro ao recalcular orçamento ${orcamento.id}:`, error);
      }
    }

    return count;
  }

  /**
   * Verifica e atualiza flags de alertas (80% e 100%)
   */
  private async verificarAlertas(orcamentoId: string): Promise<void> {
    const db = getDB();
    const orcamento = await this.getOrcamentoById(orcamentoId);
    if (!orcamento) return;

    const percentualUsado = orcamento.valor_planejado > 0
      ? (orcamento.valor_realizado / orcamento.valor_planejado) * 100
      : 0;

    const updates: Partial<Orcamento> = {};

    // Alerta 80%
    if (orcamento.alerta_80 && !orcamento.alerta_80_enviado && percentualUsado >= 80) {
      updates.alerta_80_enviado = true;
      // TODO: Enviar notificação/email (implementar depois)
      console.log(`⚠️ Alerta 80%: Orçamento "${orcamento.nome}" atingiu ${percentualUsado.toFixed(1)}%`);
    }

    // Alerta 100%
    if (orcamento.alerta_100 && !orcamento.alerta_100_enviado && percentualUsado >= 100) {
      updates.alerta_100_enviado = true;
      // TODO: Enviar notificação/email (implementar depois)
      console.log(`🚨 Alerta 100%: Orçamento "${orcamento.nome}" atingiu ${percentualUsado.toFixed(1)}%`);
    }

    if (Object.keys(updates).length > 0) {
      await db.orcamentos.update(orcamentoId, updates);
    }
  }

  // ============================================================================
  // RELATÓRIOS E ANÁLISES
  // ============================================================================

  /**
   * Retorna resumo de todos os orçamentos de um mês
   */
  async getResumoMensal(mesReferencia: string): Promise<{
    total_planejado: number;
    total_realizado: number;
    total_restante: number;
    percentual_usado: number;
    orcamentos_ok: number;
    orcamentos_atencao: number;
    orcamentos_excedidos: number;
  }> {
    const orcamentos = await this.listOrcamentosComProgresso({ mesReferencia });

    const total_planejado = orcamentos.reduce((sum, o) => sum + o.valor_planejado, 0);
    const total_realizado = orcamentos.reduce((sum, o) => sum + o.valor_realizado, 0);
    const total_restante = total_planejado - total_realizado;
    const percentual_usado = total_planejado > 0 ? (total_realizado / total_planejado) * 100 : 0;

    const orcamentos_ok = orcamentos.filter(o => o.status === 'ok').length;
    const orcamentos_atencao = orcamentos.filter(o => o.status === 'atencao').length;
    const orcamentos_excedidos = orcamentos.filter(o => o.status === 'excedido').length;

    return {
      total_planejado,
      total_realizado,
      total_restante,
      percentual_usado,
      orcamentos_ok,
      orcamentos_atencao,
      orcamentos_excedidos,
    };
  }

  /**
   * Copia orçamentos de um mês para outro
   * Útil para replicar planejamento mensal
   */
  async copiarOrcamentosParaMes(
    mesOrigem: string,
    mesDestino: string
  ): Promise<number> {
    const orcamentosOrigem = await this.listOrcamentos({ mesReferencia: mesOrigem });

    let count = 0;
    for (const orcamento of orcamentosOrigem) {
      try {
        await this.createOrcamento({
          nome: orcamento.nome,
          tipo: orcamento.tipo,
          categoria_id: orcamento.categoria_id,
          centro_custo_id: orcamento.centro_custo_id,
          mes_referencia: mesDestino,
          valor_planejado: orcamento.valor_planejado,
          alerta_80: orcamento.alerta_80,
          alerta_100: orcamento.alerta_100,
        });
        count++;
      } catch (error) {
        console.error(`Erro ao copiar orçamento ${orcamento.id}:`, error);
      }
    }

    return count;
  }

  /**
   * Recalcula orçamentos afetados por transações
   * Usado após updates em massa (importação, edições em lote, etc.)
   *
   * @param transacaoDatas - Array de datas das transações afetadas
   * @returns Número de orçamentos recalculados
   *
   * @example
   * // Após importar 50 transações em Janeiro/2025
   * const datasAfetadas = transacoes.map(t => t.data);
   * await orcamentoService.recalcularAfetados(datasAfetadas);
   */
  async recalcularAfetados(transacaoDatas: Date[]): Promise<number> {
    if (transacaoDatas.length === 0) return 0;

    // Identifica meses únicos afetados
    const mesesAfetados = new Set<string>();

    transacaoDatas.forEach(data => {
      const dataObj = data instanceof Date ? data : new Date(data);
      const ano = dataObj.getFullYear();
      const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
      const mesRef = `${ano}-${mes}`;
      mesesAfetados.add(mesRef);
    });

    // Recalcula todos os orçamentos dos meses afetados
    let totalRecalculado = 0;

    for (const mesRef of mesesAfetados) {
      try {
        const count = await this.recalcularTodosDoMes(mesRef);
        totalRecalculado += count;
        console.log(`✅ Recalculados ${count} orçamentos de ${mesRef}`);
      } catch (error) {
        console.error(`Erro ao recalcular orçamentos de ${mesRef}:`, error);
      }
    }

    return totalRecalculado;
  }

  /**
   * Recalcula orçamentos de uma categoria específica
   * Útil quando categoria é alterada em transações
   *
   * @param categoriaId - ID da categoria
   * @param mesReferencia - Mês opcional (recalcula apenas este mês)
   * @returns Número de orçamentos recalculados
   */
  async recalcularPorCategoria(
    categoriaId: string,
    mesReferencia?: string
  ): Promise<number> {
    const filtros: Parameters<typeof this.listOrcamentos>[0] = {
      tipo: 'categoria',
      categoriaId,
    };

    if (mesReferencia) {
      filtros.mesReferencia = mesReferencia;
    }

    const orcamentos = await this.listOrcamentos(filtros);

    let count = 0;
    for (const orcamento of orcamentos) {
      try {
        await this.recalcularValorRealizado(orcamento.id);
        count++;
      } catch (error) {
        console.error(`Erro ao recalcular orçamento ${orcamento.id}:`, error);
      }
    }

    return count;
  }
}

// Exportar instância singleton
export const orcamentoService = new OrcamentoService();
