/**
 * Serviço de Transações
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para transações
 */

import { getDB } from '../db/client';
import type { Transacao, CreateTransacaoDTO } from '../types';
import type { ITransacaoService } from './interfaces';
import { generateHash } from '../utils/format';
import { validateDTO, createTransacaoSchema } from '../validations/dtos';
import { NotFoundError, ValidationError, DatabaseError } from '../errors';
import { contaService } from './conta.service';
import { orcamentoService } from './orcamento.service';
import { format } from 'date-fns';

export class TransacaoService implements ITransacaoService {
  /**
   * Helper: Recalcula orçamentos relacionados a uma transação
   * Atualiza orçamentos se a transação tiver categoria_id ou centro_custo_id
   */
  private async recalcularOrcamentosRelacionados(transacao: Transacao): Promise<void> {
    try {
      // Só recalcula para despesas (orçamentos não se aplicam a receitas/transferências)
      if (transacao.tipo !== 'despesa') return;

      const dataTransacao = transacao.data instanceof Date ? transacao.data : new Date(transacao.data);
      const mesReferencia = format(dataTransacao, 'yyyy-MM');

      // Buscar orçamentos do mês
      const orcamentos = await orcamentoService.listOrcamentos({ mesReferencia });

      // Recalcular orçamentos relacionados
      for (const orcamento of orcamentos) {
        // Verifica se o orçamento está relacionado à transação
        const isRelacionado =
          (orcamento.tipo === 'categoria' && orcamento.categoria_id === transacao.categoria_id) ||
          (orcamento.tipo === 'centro_custo' && orcamento.centro_custo_id === transacao.centro_custo_id);

        if (isRelacionado) {
          await orcamentoService.recalcularValorRealizado(orcamento.id);
        }
      }
    } catch (error) {
      console.error('Erro ao recalcular orçamentos:', error);
      // Não propaga o erro para não bloquear a transação
    }
  }

  /**
   * Cria uma transferência entre contas com duas transações vinculadas pelo mesmo transferencia_id.
   * - Origem: valor negativo e conta_destino_id preenchido
   * - Destino: valor positivo
   */
  async createTransfer(
    contaOrigemId: string,
    contaDestinoId: string,
    valor: number,
    descricao: string,
    data?: Date | string,
  ): Promise<{ origem: Transacao; destino: Transacao }> {
    if (!contaOrigemId || !contaDestinoId) {
      throw new ValidationError('Contas de origem e destino são obrigatórias');
    }
    if (contaOrigemId === contaDestinoId) {
      throw new ValidationError('Conta de origem e destino não podem ser a mesma');
    }
    if (!(valor > 0)) {
      throw new ValidationError('Valor da transferência deve ser positivo');
    }

    const db = getDB();
    const transferenciaId = crypto.randomUUID();
    const now = new Date();
    const dataTransacao = typeof data === 'string' ? new Date(data) : (data || now);

    const origem: Transacao = {
      id: crypto.randomUUID(),
      conta_id: contaOrigemId,
      categoria_id: undefined,
      data: dataTransacao,
      descricao: descricao || 'Transferência para conta destino',
      valor: -Math.abs(valor),
      tipo: 'transferencia',
      observacoes: undefined,
      tags: undefined,
      transferencia_id: transferenciaId,
      conta_destino_id: contaDestinoId,
      parcelado: false,
      classificacao_confirmada: true,
      classificacao_origem: 'manual',
      hash: await generateHash(`${contaOrigemId}-${contaDestinoId}-${dataTransacao.toISOString()}-${descricao}-orig-${valor}`),
      created_at: now,
      updated_at: now,
    };

    const destino: Transacao = {
      id: crypto.randomUUID(),
      conta_id: contaDestinoId,
      categoria_id: undefined,
      data: dataTransacao,
      descricao: descricao || 'Transferência recebida',
      valor: Math.abs(valor),
      tipo: 'transferencia',
      observacoes: undefined,
      tags: undefined,
      transferencia_id: transferenciaId,
      conta_destino_id: undefined,
      parcelado: false,
      classificacao_confirmada: true,
      classificacao_origem: 'manual',
      hash: await generateHash(`${contaOrigemId}-${contaDestinoId}-${dataTransacao.toISOString()}-${descricao}-dest-${valor}`),
      created_at: now,
      updated_at: now,
    };

    await db.transaction('rw', db.transacoes, async () => {
      await db.transacoes.add(origem);
      await db.transacoes.add(destino);
    });

    // Atualiza saldo das duas contas
    await contaService.recalcularESalvarSaldo(contaOrigemId);
    await contaService.recalcularESalvarSaldo(contaDestinoId);

    return { origem, destino };
  }
  async listTransacoes(filters?: {
    contaId?: string;
    categoriaId?: string;
    dataInicio?: Date;
    dataFim?: Date;
    tipo?: string;
    busca?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'data' | 'valor' | 'descricao';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Transacao[]> {
    const db = getDB();

    // Buscar todas as transações
    let transacoes = await db.transacoes.toArray();

    // Aplicar filtros
    if (filters?.contaId) {
      transacoes = transacoes.filter((t) => t.conta_id === filters.contaId);
    }

    if (filters?.categoriaId) {
      transacoes = transacoes.filter((t) => t.categoria_id === filters.categoriaId);
    }

    if (filters?.dataInicio) {
      const dataInicioTime = filters.dataInicio.getTime();
      transacoes = transacoes.filter((t) => {
        const tData = t.data instanceof Date ? t.data : new Date(t.data);
        return tData.getTime() >= dataInicioTime;
      });
    }

    if (filters?.dataFim) {
      const dataFimTime = filters.dataFim.getTime();
      transacoes = transacoes.filter((t) => {
        const tData = t.data instanceof Date ? t.data : new Date(t.data);
        return tData.getTime() <= dataFimTime;
      });
    }

    if (filters?.tipo) {
      transacoes = transacoes.filter((t) => t.tipo === filters.tipo);
    }

    if (filters?.busca) {
      const buscaLower = filters.busca.toLowerCase();
      transacoes = transacoes.filter((t) =>
        t.descricao.toLowerCase().includes(buscaLower)
      );
    }

    // Ordenar
    const sortBy = filters?.sortBy || 'data';
    const sortOrder = filters?.sortOrder || 'desc';

    transacoes.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'data') {
        compareA = a.data instanceof Date ? a.data : new Date(a.data);
        compareB = b.data instanceof Date ? b.data : new Date(b.data);
        compareA = compareA.getTime();
        compareB = compareB.getTime();
      } else if (sortBy === 'valor') {
        compareA = a.valor;
        compareB = b.valor;
      } else if (sortBy === 'descricao') {
        compareA = a.descricao.toLowerCase();
        compareB = b.descricao.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
      } else {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0;
      }
    });

    // Aplicar paginação
    const offset = filters?.offset || 0;
    const limit = filters?.limit;

    if (limit !== undefined) {
      transacoes = transacoes.slice(offset, offset + limit);
    } else if (offset > 0) {
      transacoes = transacoes.slice(offset);
    }

    return transacoes;
  }

  async getTransacaoById(id: string): Promise<Transacao | null> {
    const db = getDB();
    const transacao = await db.transacoes.get(id);
    return transacao || null;
  }

  async createTransacao(data: CreateTransacaoDTO): Promise<Transacao> {
    try {
      // Validate input
      const validatedData = validateDTO(createTransacaoSchema, data);

      const db = getDB();

    const id = crypto.randomUUID();
    const now = new Date();

    // Gera hash para dedupe
    const hashInput = `${validatedData.conta_id}-${validatedData.data}-${validatedData.descricao}-${validatedData.valor}`;
    const hash = await generateHash(hashInput);

    const transacao: Transacao = {
      id,
      conta_id: validatedData.conta_id,
      categoria_id: validatedData.categoria_id,
      data: typeof validatedData.data === 'string' ? new Date(validatedData.data) : validatedData.data,
      descricao: validatedData.descricao,
      valor: validatedData.valor,
      tipo: validatedData.tipo,
      observacoes: validatedData.observacoes,
      tags: validatedData.tags ? JSON.stringify(validatedData.tags) : undefined,
      parcelado: false,
      classificacao_confirmada: !!validatedData.categoria_id,
      classificacao_origem: validatedData.categoria_id ? 'manual' : undefined,
      hash,
      created_at: now,
      updated_at: now,
    };

      await db.transacoes.add(transacao);

      // Atualiza saldo da conta
      await contaService.recalcularESalvarSaldo(validatedData.conta_id);

      // Recalcula orçamentos relacionados
      await this.recalcularOrcamentosRelacionados(transacao);

      return transacao;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao criar transação', error as Error);
    }
  }

  async updateTransacao(id: string, data: Partial<CreateTransacaoDTO>): Promise<Transacao> {
    try {
      const db = getDB();

      const existing = await db.transacoes.get(id);
      if (!existing) {
        throw new NotFoundError('Transação', id);
      }

    // Build update object without undefined fields (Dexie treats undefined as "clear column")
    const updated: Partial<Transacao> = {
      updated_at: new Date(),
    };

    // Only include fields that are actually present in the input DTO
    if (data.conta_id !== undefined) updated.conta_id = data.conta_id;
    if (data.categoria_id !== undefined) {
      updated.categoria_id = data.categoria_id;
      updated.classificacao_confirmada = true;
      updated.classificacao_origem = 'manual';
    }
    if (data.descricao !== undefined) updated.descricao = data.descricao;
    if (data.valor !== undefined) updated.valor = data.valor;
    if (data.tipo !== undefined) updated.tipo = data.tipo;
    if (data.observacoes !== undefined) updated.observacoes = data.observacoes;
    if (data.tags !== undefined) updated.tags = JSON.stringify(data.tags);

    // Convert date string to Date object if present
    if (data.data !== undefined) {
      updated.data = typeof data.data === 'string' ? new Date(data.data) : data.data;
    }

      await db.transacoes.update(id, updated);

      const result = await db.transacoes.get(id);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar transação atualizada ${id}`);
      }

      // Atualiza saldo da conta antiga
      await contaService.recalcularESalvarSaldo(existing.conta_id);

      // Se a transação mudou de conta, atualiza também o saldo da nova conta
      if (data.conta_id && data.conta_id !== existing.conta_id) {
        await contaService.recalcularESalvarSaldo(data.conta_id);
      }

      // Recalcula orçamentos da transação antiga (caso tenha mudado categoria/centro de custo)
      await this.recalcularOrcamentosRelacionados(existing);

      // Recalcula orçamentos da transação atualizada
      await this.recalcularOrcamentosRelacionados(result);

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar transação', error as Error);
    }
  }

  async deleteTransacao(id: string): Promise<void> {
    const db = getDB();
    
    // Busca a transação antes de deletar para saber qual conta atualizar
    const transacao = await db.transacoes.get(id);
    if (!transacao) {
      throw new NotFoundError('Transação', id);
    }

    await db.transacoes.delete(id);

    // Atualiza saldo da conta
    await contaService.recalcularESalvarSaldo(transacao.conta_id);

    // Se for transferência, atualiza também a conta destino
    if (transacao.tipo === 'transferencia' && transacao.conta_destino_id) {
      await contaService.recalcularESalvarSaldo(transacao.conta_destino_id);
    }
  }

  async bulkUpdateCategoria(transacaoIds: string[], categoriaId: string): Promise<number> {
    const db = getDB();

    let count = 0;
    for (const id of transacaoIds) {
      try {
        await db.transacoes.update(id, {
          categoria_id: categoriaId,
          classificacao_confirmada: true,
          classificacao_origem: 'manual',
          updated_at: new Date(),
        });
        count++;
      } catch (error) {
        console.error(`Erro ao atualizar transação ${id}:`, error);
      }
    }

    return count;
  }

  async bulkDelete(transacaoIds: string[]): Promise<number> {
    const db = getDB();

    // Busca todas as transações que serão deletadas para capturar as contas afetadas
    const transacoes = await db.transacoes.bulkGet(transacaoIds);

    // Coleta IDs únicos de todas as contas afetadas
    const contasAfetadas = new Set<string>();
    for (const transacao of transacoes) {
      if (transacao) {
        contasAfetadas.add(transacao.conta_id);

        // Se for transferência, adiciona também a conta destino
        if (transacao.tipo === 'transferencia' && transacao.conta_destino_id) {
          contasAfetadas.add(transacao.conta_destino_id);
        }
      }
    }

    // Executa a deleção em massa
    await db.transacoes.bulkDelete(transacaoIds);

    // Recalcula saldo de todas as contas afetadas
    for (const contaId of contasAfetadas) {
      await contaService.recalcularESalvarSaldo(contaId);
    }

    return transacaoIds.length;
  }

  /**
   * Retorna estatísticas de gastos por categoria em um período
   * Útil para widgets de orçamento e análises
   */
  async getGastosPorCategoria(dataInicio: Date, dataFim: Date): Promise<{
    categoria_id: string;
    categoria_nome: string;
    categoria_icone: string;
    categoria_cor: string;
    total_gasto: number;
    quantidade_transacoes: number;
  }[]> {
    const db = getDB();

    // Busca todas as despesas no período
    const transacoes = await this.listTransacoes({
      tipo: 'despesa',
      dataInicio,
      dataFim,
    });

    // Agrupa por categoria
    const gastosPorCategoria = new Map<string, {
      total: number;
      quantidade: number;
      categoria_id: string;
    }>();

    for (const t of transacoes) {
      if (!t.categoria_id) continue; // Ignora transações sem categoria

      const categoriaId = t.categoria_id;
      const valorAbsoluto = Math.abs(t.valor);

      if (gastosPorCategoria.has(categoriaId)) {
        const dados = gastosPorCategoria.get(categoriaId)!;
        dados.total += valorAbsoluto;
        dados.quantidade += 1;
      } else {
        gastosPorCategoria.set(categoriaId, {
          total: valorAbsoluto,
          quantidade: 1,
          categoria_id: categoriaId,
        });
      }
    }

    // Busca informações das categorias
    const categorias = await db.categorias.toArray();
    const categoriaMap = new Map(categorias.map(c => [c.id, c]));

    // Monta resultado final
    const resultado = Array.from(gastosPorCategoria.values())
      .map(gasto => {
        const categoria = categoriaMap.get(gasto.categoria_id);
        return {
          categoria_id: gasto.categoria_id,
          categoria_nome: categoria?.nome || 'Sem categoria',
          categoria_icone: categoria?.icone || '📦',
          categoria_cor: categoria?.cor || '#6B7280',
          total_gasto: gasto.total,
          quantidade_transacoes: gasto.quantidade,
        };
      })
      .sort((a, b) => b.total_gasto - a.total_gasto); // Ordena por valor decrescente

    return resultado;
  }

  /**
   * Retorna transações sem categoria (não classificadas)
   * Útil para workflows de classificação em massa
   */
  async getTransacoesNaoClassificadas(filters?: {
    contaId?: string;
    dataInicio?: Date;
    dataFim?: Date;
    tipo?: string;
    limit?: number;
    offset?: number;
  }): Promise<Transacao[]> {
    const transacoes = await this.listTransacoes({
      ...filters,
      sortBy: 'data',
      sortOrder: 'desc',
    });

    return transacoes.filter(t => !t.categoria_id);
  }

  /**
   * Atualiza tags de múltiplas transações de uma vez
   * @returns Número de transações atualizadas
   */
  async bulkUpdateTags(transacaoIds: string[], tags: string[]): Promise<number> {
    const db = getDB();

    let count = 0;
    const tagsJson = JSON.stringify(tags);

    for (const id of transacaoIds) {
      try {
        await db.transacoes.update(id, {
          tags: tagsJson,
          updated_at: new Date(),
        });
        count++;
      } catch (error) {
        console.error(`Erro ao atualizar tags da transação ${id}:`, error);
      }
    }

    return count;
  }

  /**
   * Retorna as categorias com maiores variações percentuais comparando dois períodos
   * Útil para análise de mudanças de comportamento de gastos
   */
  async getVariacoesPorCategoria(
    periodoAtualInicio: Date,
    periodoAtualFim: Date,
    periodoAnteriorInicio: Date,
    periodoAnteriorFim: Date
  ): Promise<{
    categoria_id: string;
    categoria_nome: string;
    categoria_icone: string;
    categoria_cor: string;
    total_gasto_atual: number;
    total_gasto_anterior: number;
    variacao_absoluta: number;
    variacao_percentual: number;
    quantidade_transacoes: number;
  }[]> {
    const db = getDB();

    // Busca despesas do período atual
    const transacoesAtuais = await this.listTransacoes({
      tipo: 'despesa',
      dataInicio: periodoAtualInicio,
      dataFim: periodoAtualFim,
    });

    // Busca despesas do período anterior
    const transacoesAnteriores = await this.listTransacoes({
      tipo: 'despesa',
      dataInicio: periodoAnteriorInicio,
      dataFim: periodoAnteriorFim,
    });

    // Agrupa gastos atuais por categoria
    const gastosAtuais = new Map<string, number>();
    for (const t of transacoesAtuais) {
      if (!t.categoria_id) continue;
      const valor = Math.abs(t.valor);
      gastosAtuais.set(t.categoria_id, (gastosAtuais.get(t.categoria_id) || 0) + valor);
    }

    // Agrupa gastos anteriores por categoria
    const gastosAnteriores = new Map<string, number>();
    for (const t of transacoesAnteriores) {
      if (!t.categoria_id) continue;
      const valor = Math.abs(t.valor);
      gastosAnteriores.set(t.categoria_id, (gastosAnteriores.get(t.categoria_id) || 0) + valor);
    }

    // Conta transações atuais por categoria
    const quantidades = new Map<string, number>();
    for (const t of transacoesAtuais) {
      if (!t.categoria_id) continue;
      quantidades.set(t.categoria_id, (quantidades.get(t.categoria_id) || 0) + 1);
    }

    // Busca informações das categorias
    const categorias = await db.categorias.toArray();
    const categoriaMap = new Map(categorias.map(c => [c.id, c]));

    // Calcula variações para todas as categorias que aparecem em qualquer período
    const todasCategoriasIds = new Set([...gastosAtuais.keys(), ...gastosAnteriores.keys()]);

    const resultado = Array.from(todasCategoriasIds)
      .map(categoriaId => {
        const categoria = categoriaMap.get(categoriaId);
        const gastoAtual = gastosAtuais.get(categoriaId) || 0;
        const gastoAnterior = gastosAnteriores.get(categoriaId) || 0;

        // Calcula variação absoluta e percentual
        const variacaoAbsoluta = gastoAtual - gastoAnterior;
        let variacaoPercentual = 0;

        if (gastoAnterior > 0) {
          variacaoPercentual = ((gastoAtual - gastoAnterior) / gastoAnterior) * 100;
        } else if (gastoAtual > 0) {
          variacaoPercentual = 100; // Nova categoria que não existia antes
        }

        return {
          categoria_id: categoriaId,
          categoria_nome: categoria?.nome || 'Sem categoria',
          categoria_icone: categoria?.icone || '📦',
          categoria_cor: categoria?.cor || '#6B7280',
          total_gasto_atual: gastoAtual,
          total_gasto_anterior: gastoAnterior,
          variacao_absoluta: variacaoAbsoluta,
          variacao_percentual: variacaoPercentual,
          quantidade_transacoes: quantidades.get(categoriaId) || 0,
        };
      })
      // Ordena por variação absoluta (maior variação primeiro, seja positiva ou negativa)
      .sort((a, b) => Math.abs(b.variacao_absoluta) - Math.abs(a.variacao_absoluta));

    return resultado;
  }
}

// Singleton instance
export const transacaoService = new TransacaoService();
