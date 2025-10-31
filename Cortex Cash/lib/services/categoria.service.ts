/**
 * Serviço de Categorias
 * Agent CORE: Implementador
 *
 * Fornece operações CRUD para categorias
 */

import { getDB } from '../db/client';
import type { Categoria, CreateCategoriaDTO } from '../types';
import type { ICategoriaService } from './interfaces';
import { validateDTO, createCategoriaSchema } from '../validations/dtos';
import { NotFoundError, ValidationError, DatabaseError } from '../errors';

export class CategoriaService implements ICategoriaService {
  async listCategorias(options?: {
    tipo?: string;
    ativas?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'ordem' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Categoria[]> {
    const db = getDB();

    let categorias = await db.categorias.toArray();

    // Aplicar filtros
    if (options?.tipo) {
      categorias = categorias.filter((c) => c.tipo === options.tipo);
    }

    if (options?.ativas !== undefined) {
      categorias = categorias.filter((c) => c.ativa === options.ativas);
    }

    // Ordenar
    const sortBy = options?.sortBy || 'ordem';
    const sortOrder = options?.sortOrder || 'asc';

    categorias.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      if (sortBy === 'nome') {
        compareA = a.nome.toLowerCase();
        compareB = b.nome.toLowerCase();
      } else if (sortBy === 'ordem') {
        compareA = a.ordem || 0;
        compareB = b.ordem || 0;
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
      categorias = categorias.slice(offset, offset + limit);
    } else if (offset > 0) {
      categorias = categorias.slice(offset);
    }

    return categorias;
  }

  async getCategoriaById(id: string): Promise<Categoria | null> {
    const db = getDB();
    const categoria = await db.categorias.get(id);
    return categoria || null;
  }

  async createCategoria(data: CreateCategoriaDTO): Promise<Categoria> {
    try {
      // Validate input
      const validatedData = validateDTO(createCategoriaSchema, data);

      const db = getDB();

    const id = crypto.randomUUID();
    const now = new Date();

    const categoria: Categoria = {
      id,
      nome: validatedData.nome,
      tipo: validatedData.tipo,
      grupo: validatedData.grupo,
      icone: validatedData.icone,
      cor: validatedData.cor,
      ordem: validatedData.ordem || 0,
      ativa: true,
      created_at: now,
      updated_at: now,
    };

      await db.categorias.add(categoria);

      return categoria;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao criar categoria', error as Error);
    }
  }

  async updateCategoria(id: string, data: Partial<CreateCategoriaDTO>): Promise<Categoria> {
    try {
      const db = getDB();

      const existing = await db.categorias.get(id);
      if (!existing) {
        throw new NotFoundError('Categoria', id);
      }

      await db.categorias.update(id, {
        ...data,
        updated_at: new Date(),
      });

      const result = await db.categorias.get(id);
      if (!result) {
        throw new DatabaseError(`Erro ao recuperar categoria atualizada ${id}`);
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar categoria', error as Error);
    }
  }

  async deleteCategoria(id: string): Promise<void> {
    const db = getDB();

    // Soft delete - apenas desativa
    await db.categorias.update(id, {
      ativa: false,
      updated_at: new Date(),
    });
  }

  async getCategoriasByGrupo(grupo: string): Promise<Categoria[]> {
    const db = getDB();

    const categorias = await db.categorias
      .where('grupo')
      .equals(grupo)
      .toArray();

    // Ordenar por ordem
    categorias.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return categorias;
  }

  /**
   * Lista categorias principais (sem grupo)
   */
  async getCategoriasPrincipais(tipo?: string): Promise<Categoria[]> {
    const db = getDB();

    let categorias = await db.categorias.toArray();

    // Filtrar apenas principais (sem grupo)
    categorias = categorias.filter((c) => !c.grupo && c.ativa);

    if (tipo) {
      categorias = categorias.filter((c) => c.tipo === tipo);
    }

    // Ordenar por ordem
    categorias.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return categorias;
  }

  /**
   * Busca categorias por nome (útil para autocomplete)
   */
  async searchCategorias(termo: string, tipo?: string): Promise<Categoria[]> {
    const db = getDB();

    let categorias = await db.categorias.toArray();
    categorias = categorias.filter(c => c.ativa === true);

    const termoLower = termo.toLowerCase();
    categorias = categorias.filter((c) =>
      c.nome.toLowerCase().includes(termoLower)
    );

    if (tipo) {
      categorias = categorias.filter((c) => c.tipo === tipo);
    }

    // Ordenar por ordem
    categorias.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return categorias;
  }

  // ==================== MÉTODOS HIERÁRQUICOS v0.2 ====================

  /**
   * Lista categorias raiz (sem pai)
   */
  async getCategoriasRaiz(tipo?: string): Promise<Categoria[]> {
    const db = getDB();

    // Buscar todas as categorias e filtrar as que não têm pai
    let categorias = await db.categorias.toArray();

    // Filtrar apenas categorias sem pai (pai_id é undefined ou null)
    categorias = categorias.filter((c) => !c.pai_id);

    // Filtrar por tipo se especificado
    if (tipo) {
      categorias = categorias.filter((c) => c.tipo === tipo);
    }

    // Filtrar apenas ativas
    categorias = categorias.filter((c) => c.ativa);

    // Ordenar por ordem
    categorias.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return categorias;
  }

  /**
   * Lista subcategorias de uma categoria pai
   */
  async getSubcategorias(paiId: string): Promise<Categoria[]> {
    const db = getDB();

    const categorias = await db.categorias
      .where('pai_id')
      .equals(paiId)
      .toArray();

    // Filtrar apenas ativas
    const ativas = categorias.filter((c) => c.ativa);

    // Ordenar por ordem
    ativas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return ativas;
  }

  /**
   * Retorna a árvore hierárquica completa de categorias
   */
  async getArvoreHierarquica(tipo?: string): Promise<CategoriaComSubcategorias[]> {
    const categoriasRaiz = await this.getCategoriasRaiz(tipo);

    const arvore: CategoriaComSubcategorias[] = [];

    for (const raiz of categoriasRaiz) {
      const subcategorias = await this.getSubcategorias(raiz.id);
      arvore.push({
        ...raiz,
        subcategorias,
      });
    }

    return arvore;
  }

  /**
   * Valida se pode criar subcategoria (máximo 2 níveis)
   */
  async validarNivelHierarquia(paiId: string): Promise<{ valido: boolean; mensagem?: string }> {
    const db = getDB();
    const pai = await db.categorias.get(paiId);

    if (!pai) {
      return { valido: false, mensagem: 'Categoria pai não encontrada' };
    }

    // Se o pai já tem pai, não pode criar subcategoria (máximo 2 níveis)
    if (pai.pai_id) {
      return { valido: false, mensagem: 'Máximo de 2 níveis de hierarquia permitido' };
    }

    return { valido: true };
  }

  /**
   * Reordena categorias (drag-and-drop)
   */
  async reordenarCategorias(reordenacao: { id: string; novaOrdem: number }[]): Promise<void> {
    try {
      const db = getDB();
      const now = new Date();

      await db.transaction('rw', db.categorias, async () => {
        for (const item of reordenacao) {
          await db.categorias.update(item.id, {
            ordem: item.novaOrdem,
            updated_at: now,
          });
        }
      });
    } catch (error) {
      throw new DatabaseError('Erro ao reordenar categorias', error as Error);
    }
  }

  /**
   * Mescla duas categorias (move transações de origem para destino e desativa origem)
   */
  async mesclarCategorias(origemId: string, destinoId: string): Promise<void> {
    try {
      const db = getDB();

      const origem = await db.categorias.get(origemId);
      const destino = await db.categorias.get(destinoId);

      if (!origem || !destino) {
        throw new NotFoundError('Categoria', !origem ? origemId : destinoId);
      }

      // Verificar se são do mesmo tipo
      if (origem.tipo !== destino.tipo) {
        throw new ValidationError('Categorias devem ser do mesmo tipo para mesclar');
      }

      const now = new Date();

      await db.transaction('rw', [db.transacoes, db.orcamentos, db.regras_classificacao, db.categorias], async () => {
        // Atualizar transações
        const transacoes = await db.transacoes.where('categoria_id').equals(origemId).toArray();
        for (const tx of transacoes) {
          await db.transacoes.update(tx.id, { categoria_id: destinoId, updated_at: now });
        }

        // Atualizar orçamentos
        const orcamentos = await db.orcamentos.where('categoria_id').equals(origemId).toArray();
        for (const orc of orcamentos) {
          await db.orcamentos.update(orc.id, { categoria_id: destinoId, updated_at: now });
        }

        // Atualizar regras de classificação
        const regras = await db.regras_classificacao.where('categoria_id').equals(origemId).toArray();
        for (const regra of regras) {
          await db.regras_classificacao.update(regra.id, { categoria_id: destinoId, updated_at: now });
        }

        // Desativar categoria origem
        await db.categorias.update(origemId, { ativa: false, updated_at: now });
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Erro ao mesclar categorias', error as Error);
    }
  }

  /**
   * Conta quantas transações estão vinculadas a uma categoria
   */
  async contarTransacoesPorCategoria(categoriaId: string): Promise<number> {
    const db = getDB();
    return await db.transacoes.where('categoria_id').equals(categoriaId).count();
  }

  /**
   * Exporta plano de contas como CSV
   */
  async exportarPlanoDeContas(): Promise<string> {
    const categorias = await this.listCategorias({ sortBy: 'ordem', sortOrder: 'asc' });

    const headers = ['ID', 'Nome', 'Tipo', 'Grupo', 'Pai ID', 'Ícone', 'Cor', 'Ordem', 'Ativa'];
    const rows = categorias.map(c => [
      c.id,
      c.nome,
      c.tipo,
      c.grupo || '',
      c.pai_id || '',
      c.icone || '',
      c.cor || '',
      c.ordem.toString(),
      c.ativa ? 'Sim' : 'Não',
    ]);

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    return csv;
  }
}

// Tipo auxiliar para árvore hierárquica
export interface CategoriaComSubcategorias extends Categoria {
  subcategorias: Categoria[];
}

// Singleton instance
export const categoriaService = new CategoriaService();
