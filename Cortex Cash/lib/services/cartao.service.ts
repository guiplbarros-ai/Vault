/**
 * Serviço de Cartões de Crédito
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para cartões, faturas e lançamentos
 */

import { getDB } from '../db/client';
import type {
  CartaoConfig,
  Fatura,
  FaturaLancamento,
  CreateCartaoDTO,
  CreateFaturaDTO,
  CreateFaturaLancamentoDTO,
  PagarFaturaDTO,
  CartaoComRelacoes,
  FaturaDetalhada,
  CicloFatura,
  ProjecaoFatura,
  Instituicao,
  Conta,
} from '../types';
import { NotFoundError, DatabaseError, ValidationError } from '../errors';
import { cartaoSchema, faturaSchema, faturaLancamentoSchema, pagarFaturaSchema } from '../validations';

export class CartaoService {
  // ============================================================================
  // CARTÕES - CRUD
  // ============================================================================

  /**
   * Lista todos os cartões
   */
  async listCartoes(options?: {
    incluirInativos?: boolean;
    instituicaoId?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'limite_total' | 'dia_vencimento' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<CartaoConfig[]> {
    const db = getDB();
    const incluirInativos = options?.incluirInativos || false;

    let cartoes: CartaoConfig[] = await db.cartoes_config.toArray();

    // Filtrar inativos
    if (!incluirInativos) {
      cartoes = cartoes.filter((c) => c.ativo === true);
    }

    // Filtrar por instituição
    if (options?.instituicaoId) {
      cartoes = cartoes.filter((c) => c.instituicao_id === options.instituicaoId);
    }

    // Ordenar
    const sortBy = options?.sortBy || 'nome';
    const sortOrder = options?.sortOrder || 'asc';

    cartoes.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'nome') {
        compareA = a.nome.toLowerCase();
        compareB = b.nome.toLowerCase();
      } else if (sortBy === 'limite_total') {
        compareA = a.limite_total || 0;
        compareB = b.limite_total || 0;
      } else if (sortBy === 'dia_vencimento') {
        compareA = a.dia_vencimento;
        compareB = b.dia_vencimento;
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
      cartoes = cartoes.slice(offset, offset + limit);
    } else if (offset > 0) {
      cartoes = cartoes.slice(offset);
    }

    return cartoes;
  }

  /**
   * Busca um cartão por ID
   */
  async getCartaoById(id: string): Promise<CartaoConfig | null> {
    const db = getDB();
    const cartao = await db.cartoes_config.get(id);
    return cartao || null;
  }

  /**
   * Busca cartão com todas as relações
   */
  async getCartaoComRelacoes(id: string): Promise<CartaoComRelacoes | null> {
    const db = getDB();
    const cartao = await db.cartoes_config.get(id);
    if (!cartao) return null;

    const instituicao = await db.instituicoes.get(cartao.instituicao_id);
    if (!instituicao) {
      throw new NotFoundError('Instituição', cartao.instituicao_id);
    }

    let conta_pagamento: Conta | undefined;
    if (cartao.conta_pagamento_id) {
      const conta = await db.contas.get(cartao.conta_pagamento_id);
      conta_pagamento = conta || undefined;
    }

    const faturas = await db.faturas.where('cartao_id').equals(id).toArray();

    return {
      ...cartao,
      instituicao,
      conta_pagamento,
      faturas,
    };
  }

  /**
   * Cria um novo cartão
   */
  async createCartao(data: CreateCartaoDTO): Promise<CartaoConfig> {
    // Validar com Zod
    const validationResult = cartaoSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError('Erro de validação ao criar cartão', errors);
    }

    const db = getDB();
    const id = crypto.randomUUID();
    const now = new Date();

    const cartao: CartaoConfig = {
      ...data,
      id,
      ativo: true,
      created_at: now,
      updated_at: now,
    };

    await db.cartoes_config.add(cartao);

    return cartao;
  }

  /**
   * Atualiza um cartão
   */
  async updateCartao(
    id: string,
    data: Partial<Omit<CreateCartaoDTO, 'instituicao_id'>>
  ): Promise<CartaoConfig> {
    const db = getDB();

    const existing = await db.cartoes_config.get(id);
    if (!existing) {
      throw new NotFoundError('Cartão', id);
    }

    // Validar parcialmente
    const validationResult = cartaoSchema.partial().safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError('Erro de validação ao atualizar cartão', errors);
    }

    await db.cartoes_config.update(id, {
      ...data,
      updated_at: new Date(),
    });

    const result = await db.cartoes_config.get(id);
    if (!result) {
      throw new DatabaseError(`Erro ao recuperar cartão atualizado ${id}`);
    }

    return result;
  }

  /**
   * Ativa/desativa um cartão
   */
  async toggleAtivo(id: string): Promise<CartaoConfig> {
    const db = getDB();

    const cartao = await db.cartoes_config.get(id);
    if (!cartao) {
      throw new NotFoundError('Cartão', id);
    }

    await db.cartoes_config.update(id, {
      ativo: !cartao.ativo,
      updated_at: new Date(),
    });

    const result = await db.cartoes_config.get(id);
    if (!result) {
      throw new DatabaseError(`Erro ao recuperar cartão atualizado ${id}`);
    }

    return result;
  }

  /**
   * Deleta um cartão (soft delete - apenas desativa)
   */
  async deleteCartao(id: string): Promise<void> {
    const db = getDB();
    await db.cartoes_config.update(id, { ativo: false });
  }

  /**
   * Deleta permanentemente um cartão
   */
  async hardDeleteCartao(id: string): Promise<void> {
    const db = getDB();
    await db.cartoes_config.delete(id);
  }

  // ============================================================================
  // FATURAS - CRUD
  // ============================================================================

  /**
   * Lista faturas de um cartão
   */
  async listFaturas(cartaoId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'mes_referencia' | 'data_vencimento' | 'valor_total';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Fatura[]> {
    const db = getDB();
    let faturas = await db.faturas.where('cartao_id').equals(cartaoId).toArray();

    // Filtrar por status
    if (options?.status) {
      faturas = faturas.filter((f) => f.status === options.status);
    }

    // Ordenar
    const sortBy = options?.sortBy || 'mes_referencia';
    const sortOrder = options?.sortOrder || 'desc';

    faturas.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'mes_referencia') {
        compareA = a.mes_referencia;
        compareB = b.mes_referencia;
      } else if (sortBy === 'data_vencimento') {
        compareA = a.data_vencimento instanceof Date ? a.data_vencimento : new Date(a.data_vencimento);
        compareB = b.data_vencimento instanceof Date ? b.data_vencimento : new Date(b.data_vencimento);
        compareA = compareA.getTime();
        compareB = compareB.getTime();
      } else if (sortBy === 'valor_total') {
        compareA = a.valor_total || 0;
        compareB = b.valor_total || 0;
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
      faturas = faturas.slice(offset, offset + limit);
    } else if (offset > 0) {
      faturas = faturas.slice(offset);
    }

    return faturas;
  }

  /**
   * Busca uma fatura por ID
   */
  async getFaturaById(id: string): Promise<Fatura | null> {
    const db = getDB();
    const fatura = await db.faturas.get(id);
    return fatura || null;
  }

  /**
   * Busca fatura com lançamentos
   */
  async getFaturaDetalhada(id: string): Promise<FaturaDetalhada | null> {
    const db = getDB();
    const fatura = await db.faturas.get(id);
    if (!fatura) return null;

    const cartao = await db.cartoes_config.get(fatura.cartao_id);
    if (!cartao) {
      throw new NotFoundError('Cartão', fatura.cartao_id);
    }

    const lancamentos = await db.faturas_lancamentos.where('fatura_id').equals(id).toArray();

    return {
      ...fatura,
      cartao,
      lancamentos,
      total_lancamentos: lancamentos.length,
    };
  }

  /**
   * Cria uma nova fatura
   */
  async createFatura(data: CreateFaturaDTO): Promise<Fatura> {
    // Validar com Zod
    const validationResult = faturaSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError('Erro de validação ao criar fatura', errors);
    }

    const db = getDB();
    const id = crypto.randomUUID();
    const now = new Date();

    const fatura: Fatura = {
      id,
      cartao_id: data.cartao_id,
      mes_referencia: data.mes_referencia,
      data_fechamento: data.data_fechamento instanceof Date ? data.data_fechamento : new Date(data.data_fechamento),
      data_vencimento: data.data_vencimento instanceof Date ? data.data_vencimento : new Date(data.data_vencimento),
      valor_total: data.valor_total || 0,
      valor_minimo: data.valor_minimo || 0,
      valor_pago: data.valor_pago || 0,
      status: data.status || 'aberta',
      fechada_automaticamente: data.fechada_automaticamente || false,
      data_pagamento: data.data_pagamento
        ? data.data_pagamento instanceof Date
          ? data.data_pagamento
          : new Date(data.data_pagamento)
        : undefined,
      transacao_pagamento_id: data.transacao_pagamento_id,
      created_at: now,
      updated_at: now,
    };

    await db.faturas.add(fatura);

    return fatura;
  }

  /**
   * Atualiza uma fatura
   */
  async updateFatura(id: string, data: Partial<Omit<CreateFaturaDTO, 'cartao_id'>>): Promise<Fatura> {
    const db = getDB();

    const existing = await db.faturas.get(id);
    if (!existing) {
      throw new NotFoundError('Fatura', id);
    }

    // Converter datas se necessário
    const updateData: any = { ...data };
    if (updateData.data_fechamento) {
      updateData.data_fechamento =
        updateData.data_fechamento instanceof Date ? updateData.data_fechamento : new Date(updateData.data_fechamento);
    }
    if (updateData.data_vencimento) {
      updateData.data_vencimento =
        updateData.data_vencimento instanceof Date ? updateData.data_vencimento : new Date(updateData.data_vencimento);
    }
    if (updateData.data_pagamento) {
      updateData.data_pagamento =
        updateData.data_pagamento instanceof Date ? updateData.data_pagamento : new Date(updateData.data_pagamento);
    }

    await db.faturas.update(id, {
      ...updateData,
      updated_at: new Date(),
    });

    const result = await db.faturas.get(id);
    if (!result) {
      throw new DatabaseError(`Erro ao recuperar fatura atualizada ${id}`);
    }

    return result;
  }

  /**
   * Deleta uma fatura
   */
  async deleteFatura(id: string): Promise<void> {
    const db = getDB();
    await db.faturas.delete(id);
  }

  // ============================================================================
  // LANÇAMENTOS DE FATURA - CRUD
  // ============================================================================

  /**
   * Lista lançamentos de uma fatura
   */
  async listLancamentos(faturaId: string): Promise<FaturaLancamento[]> {
    const db = getDB();
    const lancamentos = await db.faturas_lancamentos.where('fatura_id').equals(faturaId).toArray();

    // Ordenar por data de compra (desc)
    lancamentos.sort((a, b) => {
      const dateA = a.data_compra instanceof Date ? a.data_compra : new Date(a.data_compra);
      const dateB = b.data_compra instanceof Date ? b.data_compra : new Date(b.data_compra);
      return dateB.getTime() - dateA.getTime();
    });

    return lancamentos;
  }

  /**
   * Busca um lançamento por ID
   */
  async getLancamentoById(id: string): Promise<FaturaLancamento | null> {
    const db = getDB();
    const lancamento = await db.faturas_lancamentos.get(id);
    return lancamento || null;
  }

  /**
   * Cria um novo lançamento
   */
  async createLancamento(data: CreateFaturaLancamentoDTO): Promise<FaturaLancamento> {
    // Validar com Zod
    const validationResult = faturaLancamentoSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError('Erro de validação ao criar lançamento', errors);
    }

    const db = getDB();
    const id = crypto.randomUUID();
    const now = new Date();

    const lancamento: FaturaLancamento = {
      id,
      fatura_id: data.fatura_id,
      transacao_id: data.transacao_id,
      data_compra: data.data_compra instanceof Date ? data.data_compra : new Date(data.data_compra),
      descricao: data.descricao,
      valor_brl: data.valor_brl,
      parcela_numero: data.parcela_numero,
      parcela_total: data.parcela_total,
      moeda_original: data.moeda_original,
      valor_original: data.valor_original,
      taxa_cambio: data.taxa_cambio,
      categoria_id: data.categoria_id,
      created_at: now,
    };

    await db.faturas_lancamentos.add(lancamento);

    // Recalcular valor total da fatura
    await this.recalcularValorFatura(data.fatura_id);

    return lancamento;
  }

  /**
   * Atualiza um lançamento
   */
  async updateLancamento(
    id: string,
    data: Partial<Omit<CreateFaturaLancamentoDTO, 'fatura_id'>>
  ): Promise<FaturaLancamento> {
    const db = getDB();

    const existing = await db.faturas_lancamentos.get(id);
    if (!existing) {
      throw new NotFoundError('Lançamento', id);
    }

    // Converter data se necessário
    const updateData: any = { ...data };
    if (updateData.data_compra) {
      updateData.data_compra =
        updateData.data_compra instanceof Date ? updateData.data_compra : new Date(updateData.data_compra);
    }

    await db.faturas_lancamentos.update(id, updateData);

    const result = await db.faturas_lancamentos.get(id);
    if (!result) {
      throw new DatabaseError(`Erro ao recuperar lançamento atualizado ${id}`);
    }

    // Recalcular valor total da fatura
    await this.recalcularValorFatura(existing.fatura_id);

    return result;
  }

  /**
   * Deleta um lançamento
   */
  async deleteLancamento(id: string): Promise<void> {
    const db = getDB();

    const lancamento = await db.faturas_lancamentos.get(id);
    if (!lancamento) {
      throw new NotFoundError('Lançamento', id);
    }

    await db.faturas_lancamentos.delete(id);

    // Recalcular valor total da fatura
    await this.recalcularValorFatura(lancamento.fatura_id);
  }

  // ============================================================================
  // OPERAÇÕES ESPECIAIS
  // ============================================================================

  /**
   * Recalcula o valor total de uma fatura baseado nos lançamentos
   */
  async recalcularValorFatura(faturaId: string): Promise<void> {
    const db = getDB();

    const lancamentos = await db.faturas_lancamentos.where('fatura_id').equals(faturaId).toArray();

    const valorTotal = lancamentos.reduce((sum, l) => sum + l.valor_brl, 0);

    // Valor mínimo geralmente é 15% do total (pode ser configurável)
    const valorMinimo = valorTotal * 0.15;

    await db.faturas.update(faturaId, {
      valor_total: valorTotal,
      valor_minimo: valorMinimo,
      updated_at: new Date(),
    });
  }

  /**
   * Calcula o ciclo da fatura para um mês específico
   */
  calcularCicloFatura(cartao: CartaoConfig, mesReferencia: string): CicloFatura {
    const [ano, mes] = mesReferencia.split('-').map(Number);

    // Data de fechamento: último dia do período
    const dataFechamento = new Date(ano, mes - 1, cartao.dia_fechamento);

    // Data de vencimento: após o fechamento
    let dataVencimento = new Date(ano, mes - 1, cartao.dia_vencimento);
    if (cartao.dia_vencimento < cartao.dia_fechamento) {
      // Se vencimento é antes do fechamento, está no próximo mês
      dataVencimento = new Date(ano, mes, cartao.dia_vencimento);
    }

    // Data de início: dia após fechamento do mês anterior
    const dataInicio = new Date(ano, mes - 2, cartao.dia_fechamento + 1);

    return {
      data_inicio: dataInicio,
      data_fim: dataFechamento,
      data_vencimento: dataVencimento,
      mes_referencia: mesReferencia,
    };
  }

  /**
   * Paga uma fatura (cria transação e atualiza fatura)
   */
  async pagarFatura(data: PagarFaturaDTO): Promise<void> {
    // Validar com Zod
    const validationResult = pagarFaturaSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError('Erro de validação ao pagar fatura', errors);
    }

    const db = getDB();

    const fatura = await db.faturas.get(data.fatura_id);
    if (!fatura) {
      throw new NotFoundError('Fatura', data.fatura_id);
    }

    const conta = await db.contas.get(data.conta_pagamento_id);
    if (!conta) {
      throw new NotFoundError('Conta', data.conta_pagamento_id);
    }

    // Criar transação de pagamento (despesa na conta)
    const transacaoId = crypto.randomUUID();
    const now = new Date();
    const dataPagamento = data.data_pagamento instanceof Date ? data.data_pagamento : new Date(data.data_pagamento);

    await db.transacoes.add({
      id: transacaoId,
      conta_id: data.conta_pagamento_id,
      categoria_id: undefined, // Poderia ter uma categoria específica para pagamento de cartão
      data: dataPagamento,
      descricao: `Pagamento Fatura - ${fatura.mes_referencia}`,
      valor: data.valor_pago,
      tipo: 'despesa',
      observacoes: data.observacoes,
      tags: undefined,
      transferencia_id: undefined,
      conta_destino_id: undefined,
      parcelado: false,
      parcela_numero: undefined,
      parcela_total: undefined,
      grupo_parcelamento_id: undefined,
      classificacao_confirmada: true,
      classificacao_origem: 'manual',
      classificacao_confianca: 1,
      hash: undefined,
      origem_arquivo: undefined,
      origem_linha: undefined,
      created_at: now,
      updated_at: now,
    });

    // Atualizar fatura
    await db.faturas.update(data.fatura_id, {
      valor_pago: data.valor_pago,
      data_pagamento: dataPagamento,
      transacao_pagamento_id: transacaoId,
      status: data.valor_pago >= fatura.valor_total ? 'paga' : 'fechada',
      updated_at: new Date(),
    });
  }

  /**
   * Obtém projeção de gastos da fatura
   */
  async getProjecaoFatura(faturaId: string): Promise<ProjecaoFatura | null> {
    const db = getDB();

    const fatura = await db.faturas.get(faturaId);
    if (!fatura) return null;

    const cartao = await db.cartoes_config.get(fatura.cartao_id);
    if (!cartao) return null;

    const lancamentos = await db.faturas_lancamentos.where('fatura_id').equals(faturaId).toArray();
    const valorAtual = lancamentos.reduce((sum, l) => sum + l.valor_brl, 0);

    const hoje = new Date();
    const dataFechamento = fatura.data_fechamento instanceof Date ? fatura.data_fechamento : new Date(fatura.data_fechamento);
    const diasRestantes = Math.max(0, Math.ceil((dataFechamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));

    // Calcular dias desde início do ciclo
    const ciclo = this.calcularCicloFatura(cartao, fatura.mes_referencia);
    const diasCiclo = Math.ceil(
      (dataFechamento.getTime() - ciclo.data_inicio.getTime()) / (1000 * 60 * 60 * 24)
    );
    const diasDecorridos = diasCiclo - diasRestantes;

    const mediaDiaria = diasDecorridos > 0 ? valorAtual / diasDecorridos : 0;
    const valorProjetado = mediaDiaria > 0 ? valorAtual + mediaDiaria * diasRestantes : valorAtual;

    const limiteDisponivel = cartao.limite_total - valorAtual;
    const percentualLimite = (valorAtual / cartao.limite_total) * 100;

    return {
      fatura,
      valor_atual: valorAtual,
      valor_projetado: valorProjetado,
      dias_restantes: diasRestantes,
      media_diaria: mediaDiaria,
      limite_disponivel: limiteDisponivel,
      percentual_limite: percentualLimite,
    };
  }

  /**
   * Obtém ou cria fatura atual de um cartão
   */
  async getOrCreateFaturaAtual(cartaoId: string): Promise<Fatura> {
    const db = getDB();

    const cartao = await db.cartoes_config.get(cartaoId);
    if (!cartao) {
      throw new NotFoundError('Cartão', cartaoId);
    }

    // Determinar mês de referência atual
    const hoje = new Date();
    const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    // Buscar fatura do mês
    const faturas = await db.faturas.where('cartao_id').equals(cartaoId).toArray();
    const faturaExistente = faturas.find((f) => f.mes_referencia === mesReferencia);

    if (faturaExistente) {
      return faturaExistente;
    }

    // Criar nova fatura
    const ciclo = this.calcularCicloFatura(cartao, mesReferencia);

    return this.createFatura({
      cartao_id: cartaoId,
      mes_referencia: mesReferencia,
      data_fechamento: ciclo.data_fim,
      data_vencimento: ciclo.data_vencimento,
      valor_total: 0,
      valor_minimo: 0,
      valor_pago: 0,
      status: 'aberta',
      fechada_automaticamente: false,
    });
  }

  /**
   * Fecha uma fatura manualmente
   *
   * @param faturaId ID da fatura a ser fechada
   * @throws NotFoundError se fatura não existe
   * @throws ValidationError se fatura não está aberta
   *
   * @example
   * await cartaoService.fecharFatura('fatura-123');
   */
  async fecharFatura(faturaId: string): Promise<Fatura> {
    const db = getDB();

    const fatura = await db.faturas.get(faturaId);
    if (!fatura) {
      throw new NotFoundError('Fatura', faturaId);
    }

    if (fatura.status !== 'aberta') {
      throw new ValidationError(`Fatura já está ${fatura.status}. Apenas faturas abertas podem ser fechadas.`);
    }

    // Recalcula valor total baseado nos lançamentos
    const lancamentos = await db.faturas_lancamentos
      .where('fatura_id')
      .equals(faturaId)
      .toArray();

    const valorTotal = lancamentos.reduce((sum, l) => sum + l.valor_brl, 0);
    const valorMinimo = valorTotal * 0.15; // 15% do total como valor mínimo

    // Atualiza fatura para fechada
    await db.faturas.update(faturaId, {
      status: 'fechada',
      fechada_automaticamente: false,
      valor_total: valorTotal,
      valor_minimo: valorMinimo,
      updated_at: new Date(),
    });

    const faturaAtualizada = await db.faturas.get(faturaId);
    if (!faturaAtualizada) {
      throw new NotFoundError('Fatura não encontrada após fechamento');
    }

    return faturaAtualizada;
  }

  /**
   * Fecha automaticamente faturas vencidas
   */
  async fecharFaturasVencidas(): Promise<number> {
    const db = getDB();
    const hoje = new Date();

    const faturas = await db.faturas.where('status').equals('aberta').toArray();

    let contadorFechadas = 0;

    for (const fatura of faturas) {
      const dataFechamento =
        fatura.data_fechamento instanceof Date ? fatura.data_fechamento : new Date(fatura.data_fechamento);

      if (dataFechamento < hoje) {
        try {
          await this.fecharFatura(fatura.id);
          contadorFechadas++;
        } catch (error) {
          console.error(`Erro ao fechar fatura ${fatura.id}:`, error);
        }
      }
    }

    return contadorFechadas;
  }

  /**
   * Calcula limite disponível de um cartão
   */
  async getLimiteDisponivel(cartaoId: string): Promise<{
    limite_total: number;
    limite_usado: number;
    limite_disponivel: number;
    percentual_usado: number;
  }> {
    const cartao = await this.getCartaoById(cartaoId);
    if (!cartao) {
      throw new NotFoundError('Cartão', cartaoId);
    }

    try {
      const faturaAtual = await this.getOrCreateFaturaAtual(cartaoId);
      const limiteUsado = faturaAtual.valor_total || 0;
      const limiteDisponivel = cartao.limite_total - limiteUsado;
      const percentualUsado = cartao.limite_total > 0 ? (limiteUsado / cartao.limite_total) * 100 : 0;

      return {
        limite_total: cartao.limite_total,
        limite_usado: limiteUsado,
        limite_disponivel: limiteDisponivel,
        percentual_usado: percentualUsado,
      };
    } catch (error) {
      // Se houver erro ao buscar fatura, retorna limite completo disponível
      console.error('Erro ao obter fatura atual, usando limite completo:', error);
      return {
        limite_total: cartao.limite_total,
        limite_usado: 0,
        limite_disponivel: cartao.limite_total,
        percentual_usado: 0,
      };
    }
  }
}

// Singleton instance
export const cartaoService = new CartaoService();

