/**
 * Utilitários para formatação e manipulação de categorias
 * Agent CORE: v0.2+
 */

import type { Categoria } from '../types';

/**
 * Formata o nome da categoria com hierarquia (Pai > Filho)
 */
export function formatCategoriaHierarquica(
  categoria: Categoria,
  todasCategorias: Categoria[]
): string {
  if (!categoria.pai_id) {
    return categoria.nome;
  }

  const pai = todasCategorias.find((c) => c.id === categoria.pai_id);
  if (pai) {
    return `${pai.nome} > ${categoria.nome}`;
  }

  return categoria.nome;
}

/**
 * Agrupa categorias por hierarquia para exibição em selects
 * Retorna array com categorias principais seguidas de suas subcategorias indentadas
 */
export function agruparCategoriasParaSelect(
  categorias: Categoria[]
): Array<Categoria & { isSubcategoria: boolean; indentLevel: number }> {
  const resultado: Array<Categoria & { isSubcategoria: boolean; indentLevel: number }> = [];

  // Separar categorias principais e subcategorias
  const principais = categorias.filter((c) => !c.pai_id);
  const subcategorias = categorias.filter((c) => c.pai_id);

  // Ordenar principais por ordem
  principais.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  // Para cada categoria principal, adicionar ela e suas subcategorias
  for (const principal of principais) {
    resultado.push({
      ...principal,
      isSubcategoria: false,
      indentLevel: 0,
    });

    // Encontrar subcategorias desta principal
    const subs = subcategorias.filter((s) => s.pai_id === principal.id);
    subs.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    for (const sub of subs) {
      resultado.push({
        ...sub,
        isSubcategoria: true,
        indentLevel: 1,
      });
    }
  }

  return resultado;
}

/**
 * Retorna o path completo da categoria (array de nomes da raiz até a categoria)
 */
export function getCategoriaPath(
  categoria: Categoria,
  todasCategorias: Categoria[]
): string[] {
  const path: string[] = [];

  let atual: Categoria | undefined = categoria;
  while (atual) {
    path.unshift(atual.nome);
    if (atual.pai_id) {
      atual = todasCategorias.find((c) => c.id === atual!.pai_id);
    } else {
      atual = undefined;
    }
  }

  return path;
}

/**
 * Verifica se uma categoria é ancestral de outra
 */
export function isCategoriaAncestral(
  possivelAncestral: Categoria,
  categoria: Categoria,
  todasCategorias: Categoria[]
): boolean {
  let atual: Categoria | undefined = categoria;

  while (atual?.pai_id) {
    if (atual.pai_id === possivelAncestral.id) {
      return true;
    }
    atual = todasCategorias.find((c) => c.id === atual!.pai_id);
  }

  return false;
}

/**
 * Retorna todas as subcategorias (recursivamente) de uma categoria
 */
export function getAllSubcategorias(
  categoriaId: string,
  todasCategorias: Categoria[]
): Categoria[] {
  const resultado: Categoria[] = [];
  const diretas = todasCategorias.filter((c) => c.pai_id === categoriaId);

  for (const direta of diretas) {
    resultado.push(direta);
    // Recursivamente buscar subcategorias das subcategorias
    const indiretas = getAllSubcategorias(direta.id, todasCategorias);
    resultado.push(...indiretas);
  }

  return resultado;
}
