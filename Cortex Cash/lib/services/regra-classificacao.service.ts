/**
 * Serviço de Regras de Classificação
 * Gerencia regras automáticas para classificação de transações
 */

import { getDB } from '../db/client';
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

class RegraClassificacaoService {
  /**
   * Lista todas as regras de classificação
   */
  async listRegras(options?: {
    ativa?: boolean;
    categoria_id?: string;
    sortBy?: 'prioridade' | 'nome' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<RegraClassificacao[]> {
    const db = getDB();
    let query = db.regras_classificacao.toCollection();

    // Filtros
    if (options?.ativa !== undefined) {
      query = query.filter(regra => regra.ativa === options.ativa);
    }

    if (options?.categoria_id) {
      query = query.filter(regra => regra.categoria_id === options.categoria_id);
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
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return regras;
  }

  /**
   * Busca uma regra por ID
   */
  async getRegraById(id: string): Promise<RegraClassificacao | undefined> {
    const db = getDB();
    return db.regras_classificacao.get(id);
  }

  /**
   * Cria uma nova regra de classificação
   */
  async createRegra(data: CreateRegraClassificacaoDTO): Promise<RegraClassificacao> {
    const db = getDB();

    const regra: RegraClassificacao = {
      id: crypto.randomUUID(),
      categoria_id: data.categoria_id,
      nome: data.nome,
      tipo_regra: data.tipo_regra,
      padrao: data.padrao,
      prioridade: data.prioridade ?? 0,
      ativa: data.ativa ?? true,
      total_aplicacoes: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.regras_classificacao.add(regra);
    return regra;
  }

  /**
   * Atualiza uma regra existente
   */
  async updateRegra(
    id: string,
    data: UpdateRegraClassificacaoDTO
  ): Promise<RegraClassificacao> {
    const db = getDB();

    const regra = await this.getRegraById(id);
    if (!regra) {
      throw new Error('Regra não encontrada');
    }

    const updated: RegraClassificacao = {
      ...regra,
      ...data,
      updated_at: new Date(),
    };

    await db.regras_classificacao.update(id, updated);
    return updated;
  }

  /**
   * Deleta uma regra
   */
  async deleteRegra(id: string): Promise<void> {
    const db = getDB();
    await db.regras_classificacao.delete(id);
  }

  /**
   * Ativa ou desativa uma regra
   */
  async toggleRegra(id: string): Promise<RegraClassificacao> {
    const regra = await this.getRegraById(id);
    if (!regra) {
      throw new Error('Regra não encontrada');
    }

    return this.updateRegra(id, { ativa: !regra.ativa });
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
    const desc = descricao.toLowerCase();
    const padrao = regra.padrao.toLowerCase();

    switch (regra.tipo_regra) {
      case 'contains':
        return desc.includes(padrao);

      case 'starts_with':
        return desc.startsWith(padrao);

      case 'ends_with':
        return desc.endsWith(padrao);

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
}

export const regraClassificacaoService = new RegraClassificacaoService();
