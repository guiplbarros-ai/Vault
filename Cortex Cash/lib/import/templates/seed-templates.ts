/**
 * Seed para templates de importação
 * Agent IMPORT: Template Seeding
 */

import { getDB } from '@/lib/db/client';
import { ALL_BANK_TEMPLATES } from './bank-templates';
import type { TemplateImportacao } from '@/lib/types';

/**
 * Faz seed dos templates pré-configurados no banco de dados
 * Pode ser executado múltiplas vezes (idempotente)
 *
 * @returns Número de templates inseridos
 */
export async function seedBankTemplates(): Promise<number> {
  const db = getDB();
  const now = new Date();

  let insertedCount = 0;

  for (const template of ALL_BANK_TEMPLATES) {
    // Verificar se já existe
    const existing = await db.templates_importacao
      .where('nome')
      .equals(template.nome)
      .first();

    if (!existing) {
      // Criar novo template
      const newTemplate: TemplateImportacao = {
        id: crypto.randomUUID(),
        ...template,
        created_at: now,
        updated_at: now,
      };

      await db.templates_importacao.add(newTemplate);
      insertedCount++;
    } else {
      // Atualizar template existente (preservando contador_uso e ultima_utilizacao)
      await db.templates_importacao.update(existing.id, {
        ...template,
        contador_uso: existing.contador_uso, // Preservar contador
        ultima_utilizacao: existing.ultima_utilizacao, // Preservar última utilização
        updated_at: now,
      });
    }
  }

  return insertedCount;
}

/**
 * Remove todos os templates pré-configurados
 * Útil para reset ou testes
 */
export async function clearBankTemplates(): Promise<number> {
  const db = getDB();
  const templateNames = ALL_BANK_TEMPLATES.map(t => t.nome);

  let deletedCount = 0;

  for (const nome of templateNames) {
    const template = await db.templates_importacao
      .where('nome')
      .equals(nome)
      .first();

    if (template) {
      await db.templates_importacao.delete(template.id);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Verifica se os templates já foram inseridos
 */
export async function areTemplatesSeeded(): Promise<boolean> {
  const db = getDB();
  const count = await db.templates_importacao.count();
  return count >= ALL_BANK_TEMPLATES.length;
}

/**
 * Re-seed dos templates (limpa e insere novamente)
 */
export async function reseedBankTemplates(): Promise<number> {
  await clearBankTemplates();
  return await seedBankTemplates();
}
