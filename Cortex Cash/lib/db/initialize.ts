/**
 * Inicialização do banco de dados
 * Agent UI: Owner
 *
 * Popula o banco com dados iniciais na primeira execução
 */

import { getDB } from './client';
import { categoriaService } from '../services/categoria.service';
import { CATEGORIAS_PADRAO } from './seed';

const INIT_FLAG_KEY = 'cortex-cash-initialized';

/**
 * Verifica se o banco já foi inicializado
 */
export function isInitialized(): boolean {
  return localStorage.getItem(INIT_FLAG_KEY) === 'true';
}

/**
 * Marca o banco como inicializado
 */
function markAsInitialized(): void {
  localStorage.setItem(INIT_FLAG_KEY, 'true');
}

/**
 * Inicializa o banco de dados com dados padrão
 */
export async function initializeDatabase(): Promise<void> {
  if (isInitialized()) {
    console.log('Banco já inicializado, pulando seed...');
    return;
  }

  console.log('Inicializando banco de dados...');

  try {
    // Seed de categorias padrão
    console.log(`Criando ${CATEGORIAS_PADRAO.length} categorias padrão...`);

    for (const categoriaData of CATEGORIAS_PADRAO) {
      await categoriaService.createCategoria({
        nome: categoriaData.nome,
        tipo: categoriaData.tipo,
        grupo: categoriaData.grupo || undefined,
        icone: categoriaData.icone,
        cor: categoriaData.cor,
        ordem: categoriaData.ordem,
      });
    }

    markAsInitialized();
    console.log('Banco inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar banco:', error);
    throw error;
  }
}

/**
 * Reseta o banco (limpa tudo e reinicializa)
 */
export async function resetDatabase(): Promise<void> {
  console.log('Resetando banco de dados...');

  const db = getDB();

  // Limpa todas as tabelas
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });

  // Remove flag de inicialização
  localStorage.removeItem(INIT_FLAG_KEY);

  // Reinicializa
  await initializeDatabase();

  console.log('Banco resetado com sucesso!');
}
