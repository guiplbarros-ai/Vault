/**
 * Serviço de Investimentos
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD e consultas para investimentos
 */

import { getDB } from '../db/client';
import type {
  Investimento,
  CreateInvestimentoDTO,
  HistoricoInvestimento,
  CreateHistoricoInvestimentoDTO,
  InvestimentoComRelacoes,
  TipoInvestimento,
} from '../types';
import { NotFoundError, DatabaseError, ValidationError } from '../errors';
import { validateDTO, createInvestimentoSchema, createHistoricoInvestimentoSchema } from '../validations/dtos';
import { contaService } from './conta.service';
import { transacaoService } from './transacao.service';
import { getCurrentUserId } from '../db/seed-usuarios';

export class InvestimentoService {
  /**
   * Lista todos os investimentos
   */
  async listInvestimentos(options?: {
    status?: string;
    tipo?: TipoInvestimento;
    instituicao_id?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'valor_atual' | 'data_aplicacao' | 'rentabilidade';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Investimento[]> {
    const db = getDB();

    let investimentos = await db.investimentos.toArray();

    // Aplicar filtros
    if (options?.status) {
      investimentos = investimentos.filter((i) => i.status === options.status);
    }

    if (options?.tipo) {
      investimentos = investimentos.filter((i) => i.tipo === options.tipo);
    }

    if (options?.instituicao_id) {
      investimentos = investimentos.filter((i) => i.instituicao_id === options.instituicao_id);
    }

    // Ordenar
    const sortBy = options?.sortBy || 'data_aplicacao';
    const sortOrder = options?.sortOrder || 'desc';

    investimentos.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'nome') {
        compareA = a.nome.toLowerCase();
        compareB = b.nome.toLowerCase();
      } else if (sortBy === 'valor_atual') {
        compareA = a.valor_atual;
        compareB = b.valor_atual;
      } else if (sortBy === 'data_aplicacao') {
        compareA = a.data_aplicacao instanceof Date ? a.data_aplicacao : new Date(a.data_aplicacao);
        compareB = b.data_aplicacao instanceof Date ? b.data_aplicacao : new Date(b.data_aplicacao);
        compareA = compareA.getTime();
        compareB = compareB.getTime();
      } else if (sortBy === 'rentabilidade') {
        compareA = ((a.valor_atual - a.valor_aplicado) / a.valor_aplicado) * 100;
        compareB = ((b.valor_atual - b.valor_aplicado) / b.valor_aplicado) * 100;
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
      investimentos = investimentos.slice(offset, offset + limit);
    } else if (offset > 0) {
      investimentos = investimentos.slice(offset);
    }

    return investimentos;
  }

  /**
   * Busca um investimento por ID
   */
  async getInvestimentoById(id: string): Promise<Investimento | null> {
    const db = getDB();
    const investimento = await db.investimentos.get(id);
    return investimento || null;
  }

  /**
   * Busca um investimento por ID com relações (instituição, conta origem, histórico)
   */
  async getInvestimentoComRelacoes(id: string): Promise<InvestimentoComRelacoes | null> {
    const db = getDB();

    const investimento = await db.investimentos.get(id);
    if (!investimento) {
      return null;
    }

    const instituicao = await db.instituicoes.get(investimento.instituicao_id);
    if (!instituicao) {
      throw new NotFoundError('Instituição', investimento.instituicao_id);
    }

    let conta_origem;
    if (investimento.conta_origem_id) {
      conta_origem = await db.contas.get(investimento.conta_origem_id);
    }

    const historico = await db.historico_investimentos
      .where('investimento_id')
      .equals(id)
      .toArray();

    return {
      ...investimento,
      instituicao,
      conta_origem,
      historico,
    };
  }

  /**
   * Cria um novo investimento
   */
  async createInvestimento(data: CreateInvestimentoDTO): Promise<Investimento> {
    try {
      // Validate input
      const validatedData = validateDTO(createInvestimentoSchema, data);

      const db = getDB();

      const id = crypto.randomUUID();
      const now = new Date();
      const currentUserId = getCurrentUserId();

      const investimento: Investimento = {
        id,
        instituicao_id: validatedData.instituicao_id,
        nome: validatedData.nome,
        tipo: validatedData.tipo,
        ticker: validatedData.ticker,
        valor_aplicado: validatedData.valor_aplicado,
        valor_atual: validatedData.valor_atual,
        quantidade: validatedData.quantidade,
        data_aplicacao: typeof validatedData.data_aplicacao === 'string' ? new Date(validatedData.data_aplicacao) : validatedData.data_aplicacao,
        data_vencimento: validatedData.data_vencimento
          ? typeof validatedData.data_vencimento === 'string'
            ? new Date(validatedData.data_vencimento)
            : validatedData.data_vencimento
          : undefined,
        taxa_juros: validatedData.taxa_juros,
        rentabilidade_contratada: validatedData.rentabilidade_contratada,
        indexador: validatedData.indexador,
        status: 'ativo',
        conta_origem_id: validatedData.conta_origem_id,
        observacoes: validatedData.observacoes,
        cor: validatedData.cor,
        usuario_id: currentUserId,
        created_at: now,
        updated_at: now,
      };

      await db.investimentos.add(investimento);

      // Criar histórico inicial
      await this.createHistoricoInvestimento({
        investimento_id: id,
        data: investimento.data_aplicacao,
        valor: investimento.valor_aplicado,
        quantidade: investimento.quantidade,
        tipo_movimentacao: 'aporte',
        observacoes: 'Aplicação inicial',
      });

      // Registrar movimentação financeira como transferência entre contas (se tivermos conta de origem)
      if (investimento.conta_origem_id) {
        const db = getDB();
        const instituicao = await db.instituicoes.get(investimento.instituicao_id);

        // Encontrar (ou criar) conta de investimento da mesma instituição
        const contas = await contaService.listContas({ incluirInativas: false });
        let contaInvestimento = contas.find(
          (c) => c.tipo === 'investimento' && c.instituicao_id === investimento.instituicao_id,
        );

        if (!contaInvestimento) {
          const currentUserId = getCurrentUserId();
          contaInvestimento = await contaService.createConta({
            instituicao_id: investimento.instituicao_id,
            nome: `${instituicao?.nome ?? 'Investimentos'} - Carteira`,
            tipo: 'investimento',
            saldo_referencia: 0,
            data_referencia: new Date(),
            saldo_atual: 0,
            ativa: true,
            cor: undefined,
            icone: undefined,
            observacoes: undefined,
            usuario_id: currentUserId,
          });
        }

        // Cria transferência: sai da conta origem e entra na conta de investimento
        await transacaoService.createTransfer(
          investimento.conta_origem_id,
          contaInvestimento.id,
          investimento.valor_aplicado,
          `Aporte em ${investimento.nome}`,
          investimento.data_aplicacao,
        );
      }

      return investimento;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao criar investimento', error as Error);
    }
  }

  /**
   * Atualiza um investimento
   */
  async updateInvestimento(id: string, data: Partial<CreateInvestimentoDTO>): Promise<Investimento> {
    try {
      const db = getDB();

      const existing = await db.investimentos.get(id);
      if (!existing) {
        throw new NotFoundError('Investimento', id);
      }

      const updateData = {
        ...data,
        // Convert string dates to Date objects
        data_aplicacao: data.data_aplicacao
          ? (typeof data.data_aplicacao === 'string' ? new Date(data.data_aplicacao) : data.data_aplicacao)
          : undefined,
        data_vencimento: data.data_vencimento
          ? (typeof data.data_vencimento === 'string' ? new Date(data.data_vencimento) : data.data_vencimento)
          : undefined,
        updated_at: new Date(),
      } as Partial<Investimento>;

      await db.investimentos.update(id, updateData);

      const result = await db.investimentos.get(id);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar investimento atualizado ${id}`);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar investimento', error as Error);
    }
  }

  /**
   * Deleta um investimento (soft delete - marca como resgatado)
   */
  async deleteInvestimento(id: string): Promise<void> {
    try {
      const db = getDB();

      const existing = await db.investimentos.get(id);
      if (!existing) {
        throw new NotFoundError('Investimento', id);
      }

      await db.investimentos.update(id, {
        status: 'resgatado',
        updated_at: new Date(),
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Erro ao deletar investimento', error as Error);
    }
  }

  /**
   * Deleta permanentemente um investimento
   */
  async hardDeleteInvestimento(id: string): Promise<void> {
    try {
      const db = getDB();

      const existing = await db.investimentos.get(id);
      if (!existing) {
        throw new NotFoundError('Investimento', id);
      }

      // Deletar histórico relacionado
      const historico = await db.historico_investimentos
        .where('investimento_id')
        .equals(id)
        .toArray();

      await db.transaction('rw', [db.investimentos, db.historico_investimentos], async () => {
        // Deletar histórico
        for (const h of historico) {
          await db.historico_investimentos.delete(h.id);
        }

        // Deletar investimento
        await db.investimentos.delete(id);
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Erro ao deletar investimento permanentemente', error as Error);
    }
  }

  /**
   * Cria um registro de histórico de investimento
   */
  async createHistoricoInvestimento(data: CreateHistoricoInvestimentoDTO): Promise<HistoricoInvestimento> {
    try {
      // Validate input
      const validatedData = validateDTO(createHistoricoInvestimentoSchema, data);

      const db = getDB();

      const id = crypto.randomUUID();
      const now = new Date();

      const historico: HistoricoInvestimento = {
        id,
        investimento_id: validatedData.investimento_id,
        data: typeof validatedData.data === 'string' ? new Date(validatedData.data) : validatedData.data,
        valor: validatedData.valor,
        quantidade: validatedData.quantidade,
        tipo_movimentacao: validatedData.tipo_movimentacao,
        observacoes: validatedData.observacoes,
        created_at: now,
      };

      await db.historico_investimentos.add(historico);

      return historico;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao criar histórico de investimento', error as Error);
    }
  }

  /**
   * Lista histórico de um investimento
   */
  async getHistoricoInvestimento(investimento_id: string): Promise<HistoricoInvestimento[]> {
    const db = getDB();

    const historico = await db.historico_investimentos
      .where('investimento_id')
      .equals(investimento_id)
      .toArray();

    // Ordenar por data descendente
    historico.sort((a, b) => {
      const dateA = a.data instanceof Date ? a.data : new Date(a.data);
      const dateB = b.data instanceof Date ? b.data : new Date(b.data);
      return dateB.getTime() - dateA.getTime();
    });

    return historico;
  }

  /**
   * Calcula rentabilidade de um investimento
   */
  async calcularRentabilidade(id: string): Promise<{
    rentabilidade: number;
    rentabilidade_percentual: number;
  }> {
    const investimento = await this.getInvestimentoById(id);
    if (!investimento) {
      throw new NotFoundError('Investimento', id);
    }

    const rentabilidade = investimento.valor_atual - investimento.valor_aplicado;
    const rentabilidade_percentual = (rentabilidade / investimento.valor_aplicado) * 100;

    return {
      rentabilidade,
      rentabilidade_percentual,
    };
  }

  /**
   * Busca investimentos por tipo
   */
  async getInvestimentosPorTipo(tipo: TipoInvestimento): Promise<Investimento[]> {
    const db = getDB();

    const investimentos = await db.investimentos
      .where('tipo')
      .equals(tipo)
      .toArray();

    return investimentos;
  }

  /**
   * Busca investimentos ativos
   */
  async getInvestimentosAtivos(): Promise<Investimento[]> {
    const db = getDB();

    let investimentos = await db.investimentos.toArray();
    investimentos = investimentos.filter((i) => i.status === 'ativo');

    return investimentos;
  }

  /**
   * Calcula valor total investido (apenas ativos)
   */
  async getValorTotalInvestido(): Promise<number> {
    const investimentos = await this.getInvestimentosAtivos();
    return investimentos.reduce((total, inv) => total + inv.valor_aplicado, 0);
  }

  /**
   * Calcula valor total atual dos investimentos (apenas ativos)
   */
  async getValorTotalAtual(): Promise<number> {
    const investimentos = await this.getInvestimentosAtivos();
    return investimentos.reduce((total, inv) => total + inv.valor_atual, 0);
  }
}

// Singleton instance
export const investimentoService = new InvestimentoService();
