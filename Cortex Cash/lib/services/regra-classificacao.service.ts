/**
 * Serviço de Regras de Classificação
 * Agent DATA: Owner
 *
 * Gerencia regras automáticas para classificação de transações
 */

import { getDB } from '../db/client';
import { DatabaseError, ValidationError, NotFoundError } from '../errors';
import type { RegraClassificacao, TipoRegra } from '../types';

export interface CreateRegraClassificacaoDTO {
  categoria_id: string;
  nome: string;
  tipo_regra: TipoRegra;
  padrao: string;
  prioridade?: number;
  ativa?: boolean;
}

export interface UpdateRegraClassificacaoDTO {
  categoria_id?: string;
  nome?: string;
  tipo_regra?: TipoRegra;
  padrao?: string;
  prioridade?: number;
  ativa?: boolean;
}

export interface PreviewRegraResult {
  regra: RegraClassificacao;
  matches: {
    descricao: string;
    transacao_id: string;
    data: Date;
    valor: number;
  }[];
  total_matches: number;
}

class RegraClassificacaoService {
  /**
   * Lista todas as regras de classificação
   */
  async listRegras(options?: {
    ativa?: boolean;
    categoria_id?: string;
    tipo_regra?: TipoRegra;
    sortBy?: 'prioridade' | 'nome' | 'created_at' | 'ultima_aplicacao';
    sortOrder?: 'asc' | 'desc';
  }): Promise<RegraClassificacao[]> {
    try {
      const db = getDB();
      let query = db.regras_classificacao.toCollection();

      // Filtros
      if (options?.ativa !== undefined) {
        query = query.filter(regra => regra.ativa === options.ativa);
      }

      if (options?.categoria_id) {
        query = query.filter(regra => regra.categoria_id === options.categoria_id);
      }

      if (options?.tipo_regra) {
        query = query.filter(regra => regra.tipo_regra === options.tipo_regra);
      }

      let regras = await query.toArray();

      // Ordenação
      const sortBy = options?.sortBy || 'prioridade';
      const sortOrder = options?.sortOrder || 'desc';

      regras.sort((a, b) => {
        let comparison = 0;

        if (sortBy === 'prioridade') {
          comparison = a.prioridade - b.prioridade;
        } else if (sortBy === 'nome') {
          comparison = a.nome.localeCompare(b.nome);
        } else if (sortBy === 'created_at') {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (sortBy === 'ultima_aplicacao') {
          const aTime = a.ultima_aplicacao ? new Date(a.ultima_aplicacao).getTime() : 0;
          const bTime = b.ultima_aplicacao ? new Date(b.ultima_aplicacao).getTime() : 0;
          comparison = aTime - bTime;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });

      return regras;
    } catch (error) {
      throw new DatabaseError('Erro ao listar regras', error as Error);
    }
  }

  /**
   * Busca uma regra por ID
   */
  async getRegraById(id: string): Promise<RegraClassificacao> {
    try {
      const db = getDB();
      const regra = await db.regras_classificacao.get(id);

      if (!regra) {
        throw new NotFoundError(`Regra não encontrada: ${id}`);
      }

      return regra;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erro ao buscar regra', error as Error);
    }
  }

  /**
   * Cria uma nova regra de classificação
   */
  async createRegra(data: CreateRegraClassificacaoDTO): Promise<RegraClassificacao> {
    try {
      const db = getDB();

      // Valida categoria existe
      const categoria = await db.categorias.get(data.categoria_id);
      if (!categoria) {
        throw new ValidationError(`Categoria não encontrada: ${data.categoria_id}`);
      }

      // Valida padrão baseado no tipo de regra
      this.validatePadrao(data.tipo_regra, data.padrao);

      // Se prioridade não for especificada, define como próxima disponível
      let prioridade = data.prioridade ?? 0;
      if (data.prioridade === undefined) {
        const regras = await db.regras_classificacao.toArray();
        prioridade = regras.length > 0
          ? Math.max(...regras.map(r => r.prioridade)) + 1
          : 1;
      }

      const regra: RegraClassificacao = {
        id: crypto.randomUUID(),
        categoria_id: data.categoria_id,
        nome: data.nome,
        tipo_regra: data.tipo_regra,
        padrao: data.padrao,
        prioridade,
        ativa: data.ativa ?? true,
        total_aplicacoes: 0,
        ultima_aplicacao: undefined,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db.regras_classificacao.add(regra);
      return regra;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new DatabaseError('Erro ao criar regra de classificação', error as Error);
    }
  }

  /**
   * Atualiza uma regra existente
   */
  async updateRegra(
    id: string,
    data: UpdateRegraClassificacaoDTO
  ): Promise<RegraClassificacao> {
    try {
      const db = getDB();
      const regra = await this.getRegraById(id);

      // Valida categoria se foi alterada
      if (data.categoria_id && data.categoria_id !== regra.categoria_id) {
        const categoria = await db.categorias.get(data.categoria_id);
        if (!categoria) {
          throw new ValidationError(`Categoria não encontrada: ${data.categoria_id}`);
        }
      }

      // Valida padrão se tipo ou padrão foram alterados
      const novoTipo = data.tipo_regra ?? regra.tipo_regra;
      const novoPadrao = data.padrao ?? regra.padrao;
      if (data.tipo_regra || data.padrao) {
        this.validatePadrao(novoTipo, novoPadrao);
      }

      const updates = {
        ...data,
        updated_at: new Date(),
      };

      await db.regras_classificacao.update(id, updates);
      return await this.getRegraById(id);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erro ao atualizar regra', error as Error);
    }
  }

  /**
   * Deleta uma regra
   */
  async deleteRegra(id: string): Promise<void> {
    try {
      const db = getDB();
      await this.getRegraById(id); // Verifica se existe
      await db.regras_classificacao.delete(id);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erro ao deletar regra', error as Error);
    }
  }

  /**
   * Ativa ou desativa uma regra
   */
  async toggleRegra(id: string): Promise<RegraClassificacao> {
    try {
      const regra = await this.getRegraById(id);
      return await this.updateRegra(id, { ativa: !regra.ativa });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erro ao alternar status da regra', error as Error);
    }
  }

  /**
   * Atualiza prioridades de múltiplas regras (para reordenação)
   */
  async updatePrioridades(updates: { id: string; prioridade: number }[]): Promise<void> {
    try {
      const db = getDB();

      await db.transaction('rw', db.regras_classificacao, async () => {
        for (const update of updates) {
          await db.regras_classificacao.update(update.id, {
            prioridade: update.prioridade,
            updated_at: new Date(),
          });
        }
      });
    } catch (error) {
      throw new DatabaseError('Erro ao atualizar prioridades', error as Error);
    }
  }

  /**
   * Obtém estatísticas de uso das regras
   */
  async getRegrasStats(): Promise<{
    total: number;
    ativas: number;
    inativas: number;
    total_aplicacoes: number;
    mais_usada?: RegraClassificacao;
  }> {
    try {
      const db = getDB();
      const regras = await db.regras_classificacao.toArray();

      const ativas = regras.filter(r => r.ativa).length;
      const total_aplicacoes = regras.reduce((sum, r) => sum + r.total_aplicacoes, 0);
      const mais_usada = regras.sort((a, b) => b.total_aplicacoes - a.total_aplicacoes)[0];

      return {
        total: regras.length,
        ativas,
        inativas: regras.length - ativas,
        total_aplicacoes,
        mais_usada,
      };
    } catch (error) {
      throw new DatabaseError('Erro ao obter estatísticas de regras', error as Error);
    }
  }

  /**
   * Preview de uma regra - mostra quantas transações casariam com ela
   */
  async previewRegra(
    tipo_regra: TipoRegra,
    padrao: string,
    limit: number = 50
  ): Promise<PreviewRegraResult> {
    try {
      const db = getDB();

      // Valida padrão antes de testar
      this.validatePadrao(tipo_regra, padrao);

      // Busca todas as transações
      const transacoes = await db.transacoes.toArray();

      // Filtra as que casam com a regra
      const matches = transacoes
        .filter(t => this.testarRegraComPadrao(tipo_regra, padrao, t.descricao))
        .slice(0, limit)
        .map(t => ({
          descricao: t.descricao,
          transacao_id: t.id,
          data: t.data,
          valor: t.valor,
        }));

      // Conta total de matches (sem limit)
      const total_matches = transacoes.filter(t =>
        this.testarRegraComPadrao(tipo_regra, padrao, t.descricao)
      ).length;

      const tempRegra: RegraClassificacao = {
        id: 'preview',
        categoria_id: '',
        nome: 'Preview',
        tipo_regra,
        padrao,
        prioridade: 0,
        ativa: true,
        total_aplicacoes: 0,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      return {
        regra: tempRegra,
        matches,
        total_matches,
      };
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new DatabaseError('Erro ao fazer preview de regra', error as Error);
    }
  }

  /**
   * Valida padrão de acordo com o tipo de regra
   */
  private validatePadrao(tipo: TipoRegra, padrao: string): void {
    if (!padrao || padrao.trim() === '') {
      throw new ValidationError('Padrão não pode ser vazio');
    }

    // Validação específica para regex
    if (tipo === 'regex') {
      try {
        new RegExp(padrao);
      } catch (error) {
        throw new ValidationError(
          `Padrão regex inválido: ${error instanceof Error ? error.message : 'erro desconhecido'}`
        );
      }
    }

    // Validação básica para outros tipos
    if (tipo === 'contains' || tipo === 'starts_with' || tipo === 'ends_with') {
      if (padrao.length < 2) {
        throw new ValidationError('Padrão deve ter pelo menos 2 caracteres');
      }
    }
  }

  /**
   * Aplica regras de classificação a uma descrição
   * Retorna a categoria_id da primeira regra que corresponder
   */
  async aplicarRegras(descricao: string): Promise<string | null> {
    const regras = await this.listRegras({
      ativa: true,
      sortBy: 'prioridade',
      sortOrder: 'desc',
    });

    for (const regra of regras) {
      if (this.testarRegra(regra, descricao)) {
        // Incrementa contador de aplicações
        await this.incrementarAplicacao(regra.id);
        return regra.categoria_id;
      }
    }

    return null;
  }

  /**
   * Testa se uma regra corresponde a uma descrição
   */
  private testarRegra(regra: RegraClassificacao, descricao: string): boolean {
    return this.testarRegraComPadrao(regra.tipo_regra, regra.padrao, descricao);
  }

  /**
   * Testa se um padrão corresponde a uma descrição (helper para preview)
   */
  private testarRegraComPadrao(tipo: TipoRegra, padrao: string, descricao: string): boolean {
    const desc = descricao.toLowerCase();
    const padraoLower = padrao.toLowerCase();

    switch (tipo) {
      case 'contains':
        return desc.includes(padraoLower);

      case 'starts_with':
        return desc.startsWith(padraoLower);

      case 'ends_with':
        return desc.endsWith(padraoLower);

      case 'regex':
        try {
          const regex = new RegExp(padrao, 'i');
          return regex.test(desc);
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Incrementa o contador de aplicações de uma regra
   */
  private async incrementarAplicacao(id: string): Promise<void> {
    const db = getDB();
    const regra = await this.getRegraById(id);

    if (regra) {
      await db.regras_classificacao.update(id, {
        total_aplicacoes: regra.total_aplicacoes + 1,
        ultima_aplicacao: new Date(),
        updated_at: new Date(),
      });
    }
  }

  /**
   * Aplica classificação híbrida (regras + IA)
   * 1. Tenta aplicar regras primeiro
   * 2. Se não encontrar, usa IA (se configurada e habilitada)
   */
  async classificarHibrido(
    descricao: string,
    valor: number,
    tipo: 'receita' | 'despesa',
    useAI: boolean = true
  ): Promise<{
    categoria_id: string | null;
    metodo: 'regra' | 'ia' | 'nenhum';
    confianca?: number;
    regra_aplicada?: string;
  }> {
    // Primeiro tenta aplicar regras
    const categoriaIdRegra = await this.aplicarRegras(descricao);

    if (categoriaIdRegra) {
      const regra = await this.getRegraById(categoriaIdRegra);
      return {
        categoria_id: categoriaIdRegra,
        metodo: 'regra',
        regra_aplicada: regra?.nome,
      };
    }

    // Se não encontrou regra e IA está habilitada, usa IA
    if (useAI) {
      try {
        const response = await fetch('/api/ai/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descricao, valor, tipo }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            categoria_id: data.categoria_sugerida_id,
            metodo: 'ia',
            confianca: data.confianca,
          };
        }
      } catch (error) {
        console.error('Erro ao classificar com IA:', error);
      }
    }

    return {
      categoria_id: null,
      metodo: 'nenhum',
    };
  }

  /**
   * Registra confirmação de uma regra
   * Chamado quando usuário mantém a classificação automática
   *
   * @param regra_id ID da regra que foi confirmada
   */
  async registrarConfirmacao(regra_id: string): Promise<void> {
    try {
      const db = getDB();
      const regra = await this.getRegraById(regra_id);

      await db.regras_classificacao.update(regra_id, {
        total_confirmacoes: regra.total_confirmacoes + 1,
        updated_at: new Date(),
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erro ao registrar confirmação', error as Error);
    }
  }

  /**
   * Registra rejeição de uma regra
   * Chamado quando usuário altera a categoria sugerida pela regra
   *
   * @param regra_id ID da regra que foi rejeitada
   */
  async registrarRejeicao(regra_id: string): Promise<void> {
    try {
      const db = getDB();
      const regra = await this.getRegraById(regra_id);

      await db.regras_classificacao.update(regra_id, {
        total_rejeicoes: regra.total_rejeicoes + 1,
        updated_at: new Date(),
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erro ao registrar rejeição', error as Error);
    }
  }

  /**
   * Calcula taxa de acurácia de uma regra
   * Acurácia = confirmações / (confirmações + rejeições)
   *
   * @param regra_id ID da regra
   * @returns Taxa de acurácia (0-100) ou null se sem dados
   */
  async getAcuracia(regra_id: string): Promise<number | null> {
    try {
      const regra = await this.getRegraById(regra_id);
      const total = regra.total_confirmacoes + regra.total_rejeicoes;

      if (total === 0) {
        return null; // Sem dados suficientes
      }

      return (regra.total_confirmacoes / total) * 100;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erro ao calcular acurácia', error as Error);
    }
  }

  /**
   * Obtém métricas detalhadas de todas as regras
   * Útil para dashboard de performance
   */
  async getMetricasDetalhadas(): Promise<{
    regra_id: string;
    nome: string;
    total_aplicacoes: number;
    total_confirmacoes: number;
    total_rejeicoes: number;
    acuracia: number | null;
    ativa: boolean;
  }[]> {
    try {
      const regras = await this.listRegras();

      return regras.map(regra => {
        const total = regra.total_confirmacoes + regra.total_rejeicoes;
        const acuracia = total > 0
          ? (regra.total_confirmacoes / total) * 100
          : null;

        return {
          regra_id: regra.id,
          nome: regra.nome,
          total_aplicacoes: regra.total_aplicacoes,
          total_confirmacoes: regra.total_confirmacoes,
          total_rejeicoes: regra.total_rejeicoes,
          acuracia,
          ativa: regra.ativa,
        };
      });
    } catch (error) {
      throw new DatabaseError('Erro ao obter métricas detalhadas', error as Error);
    }
  }
}

export const regraClassificacaoService = new RegraClassificacaoService();
