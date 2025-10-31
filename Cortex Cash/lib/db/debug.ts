/**
 * Debug helpers para o banco de dados
 * Use no console do navegador: window.dbDebug.resetDatabase()
 */

import { resetDatabase } from './initialize';
import { getDB } from './client';
import { seedMockTransactions, clearMockTransactions } from './seed-mock-transactions';

export const dbDebug = {
  /**
   * Força pixel art mode para OFF e salva no localStorage
   */
  async disablePixelArt() {
    try {
      const { settingsService } = await import('../services/settings.service');
      await settingsService.set('appearance.pixelArtMode', false);
      console.log('✅ Pixel Art desativado com sucesso!');
      console.log('🔄 Recarregando página...');
      window.location.reload();
    } catch (error) {
      console.error('❌ Erro ao desativar pixel art:', error);
    }
  },

  /**
   * Limpa TODAS as configurações e reseta para padrões
   */
  async resetAllSettings() {
    const confirm = window.confirm(
      '⚠️ Isso vai resetar TODAS as suas configurações para os valores padrão.\n\nDeseja continuar?'
    );

    if (!confirm) {
      console.log('❌ Operação cancelada');
      return;
    }

    try {
      localStorage.removeItem('cortex_settings');
      console.log('✅ Configurações resetadas!');
      console.log('🔄 Recarregando página...');
      window.location.reload();
    } catch (error) {
      console.error('❌ Erro ao resetar configurações:', error);
    }
  },
  /**
   * Reseta o banco de dados completamente
   * USE COM CUIDADO: Apaga todos os dados!
   */
  async resetDatabase() {
    const confirmReset = confirm(
      '⚠️ ATENÇÃO: Isso vai apagar TODOS os seus dados (transações, contas, categorias, etc.)\n\n' +
      'Deseja continuar?'
    );

    if (!confirmReset) {
      console.log('❌ Reset cancelado pelo usuário');
      return;
    }

    try {
      console.log('🔄 Resetando banco de dados...');
      await resetDatabase();
      console.log('✅ Banco resetado com sucesso!');
      console.log('🔄 Recarregando página...');
      window.location.reload();
    } catch (error) {
      console.error('❌ Erro ao resetar banco:', error);
    }
  },

  /**
   * Lista todas as categorias no console
   */
  async listCategorias() {
    const db = getDB();
    const categorias = await db.categorias.toArray();
    console.table(categorias);
    return categorias;
  },

  /**
   * Lista todas as tags no console
   */
  async listTags() {
    const db = getDB();
    const tags = await db.tags.toArray();
    console.table(tags);
    return tags;
  },

  /**
   * Mostra estrutura hierárquica de categorias
   */
  async showHierarchy() {
    const db = getDB();
    const categorias = await db.categorias.toArray();

    const principais = categorias.filter((c) => !c.pai_id);

    console.log('\n📊 ESTRUTURA DE CATEGORIAS:');
    console.log('===========================\n');

    for (const principal of principais) {
      const filhas = categorias.filter((c) => c.pai_id === principal.id);
      console.log(`${principal.icone} ${principal.nome} (${principal.tipo})`);

      for (const filha of filhas) {
        console.log(`  ↳ ${filha.icone} ${filha.nome}`);
      }
      console.log('');
    }
  },

  /**
   * Cria transações mock para demonstração
   * 26 transações realistas com categorias e tags
   */
  async createMockData() {
    try {
      console.log('🔄 Criando mock data...');
      await seedMockTransactions();
      console.log('✅ Mock data criado! Recarregue a página para ver os dados.');
      console.log('💡 Dica: Vá para Transações ou Dashboard para visualizar');
    } catch (error) {
      console.error('❌ Erro ao criar mock data:', error);
    }
  },

  /**
   * Remove todas as transações mock
   */
  async clearTransactions() {
    const confirmClear = confirm(
      '⚠️ Isso vai remover TODAS as transações.\n\nDeseja continuar?'
    );

    if (!confirmClear) {
      console.log('❌ Operação cancelada');
      return;
    }

    try {
      await clearMockTransactions();
      console.log('✅ Transações removidas! Recarregue a página.');
      window.location.reload();
    } catch (error) {
      console.error('❌ Erro ao limpar transações:', error);
    }
  }
};

// Expõe no window para uso no console
if (typeof window !== 'undefined') {
  (window as any).dbDebug = dbDebug;
}
