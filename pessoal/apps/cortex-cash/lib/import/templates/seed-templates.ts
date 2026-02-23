/**
 * Seed para templates de importação
 * Agent IMPORT: Template Seeding
 */

import { getSupabaseBrowserClient } from '@/lib/db/supabase'
import type { TemplateImportacao } from '@/lib/types'
import { ALL_BANK_TEMPLATES } from './bank-templates'

/**
 * Faz seed dos templates pré-configurados no banco de dados
 * Pode ser executado múltiplas vezes (idempotente)
 *
 * @returns Número de templates inseridos
 */
export async function seedBankTemplates(): Promise<number> {
  const supabase = getSupabaseBrowserClient()
  const now = new Date().toISOString()

  let insertedCount = 0

  for (const template of ALL_BANK_TEMPLATES) {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('templates_importacao')
      .select('id, contador_uso, ultima_utilizacao')
      .eq('nome', template.nome)
      .limit(1)
      .single()

    if (!existing) {
      // Criar novo template
      const newTemplate = {
        id: crypto.randomUUID(),
        ...template,
        created_at: now,
        updated_at: now,
      }

      const { error } = await supabase.from('templates_importacao').insert(newTemplate)
      if (!error) {
        insertedCount++
      }
    } else {
      // Atualizar template existente (preservando contador_uso e ultima_utilizacao)
      await supabase
        .from('templates_importacao')
        .update({
          ...template,
          contador_uso: existing.contador_uso, // Preservar contador
          ultima_utilizacao: existing.ultima_utilizacao, // Preservar última utilização
          updated_at: now,
        })
        .eq('id', existing.id)
    }
  }

  return insertedCount
}

/**
 * Remove todos os templates pré-configurados
 * Útil para reset ou testes
 */
export async function clearBankTemplates(): Promise<number> {
  const supabase = getSupabaseBrowserClient()
  const templateNames = ALL_BANK_TEMPLATES.map((t) => t.nome)

  const { data: toDelete } = await supabase
    .from('templates_importacao')
    .select('id')
    .in('nome', templateNames)

  const count = toDelete?.length ?? 0

  if (count > 0) {
    await supabase.from('templates_importacao').delete().in('nome', templateNames)
  }

  return count
}

/**
 * Verifica se os templates já foram inseridos
 */
export async function areTemplatesSeeded(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const { count } = await supabase
    .from('templates_importacao')
    .select('*', { count: 'exact', head: true })
  return (count ?? 0) >= ALL_BANK_TEMPLATES.length
}

/**
 * Re-seed dos templates (limpa e insere novamente)
 */
export async function reseedBankTemplates(): Promise<number> {
  await clearBankTemplates()
  return await seedBankTemplates()
}
