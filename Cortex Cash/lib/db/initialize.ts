/**
 * Inicialização do banco de dados
 * Agent UI: Owner
 *
 * Popula o banco com dados iniciais na primeira execução
 */

import { getDB } from './client';
import { CATEGORIAS_PADRAO, seedCategorias, hasCategories } from './seed';
import { seedTags, hasTags } from './seed-tags';
import { seedCenarioBase } from './seed-planejamento';

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
 * Usa bulkAdd para performance e atomicidade
 */
export async function initializeDatabase(): Promise<void> {
  if (isInitialized()) {
    console.log('✅ Banco já inicializado, pulando seed...');
    return;
  }

  console.log('🔄 Inicializando banco de dados...');

  try {
    const db = getDB();

    // Verifica se já tem categorias (dupla checagem para evitar race conditions)
    const alreadyHasCategories = await hasCategories(db);
    const alreadyHasTags = await hasTags(db);

    if (alreadyHasCategories && alreadyHasTags) {
      console.log('✅ Categorias e Tags já existem, pulando seed...');
      markAsInitialized();
      return;
    }

    // Seed de categorias padrão usando bulkAdd (mais rápido e atômico)
    if (!alreadyHasCategories) {
      console.log(`🔄 Criando ${CATEGORIAS_PADRAO.length} categorias padrão...`);
      await seedCategorias(db);
    }

    // Seed de tags padrão
    if (!alreadyHasTags) {
      console.log(`🔄 Criando tags padrão...`);
      await seedTags(db);
    }

    // Seed de cenário base de planejamento
    console.log(`🔄 Criando cenário base de planejamento...`);
    await seedCenarioBase();

    markAsInitialized();
    console.log('✅ Banco inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
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
