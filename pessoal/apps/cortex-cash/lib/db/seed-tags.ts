'use client'
import { TAGS_PADRAO } from './seed'

/**
 * Função para inserir tags padrão no banco (Supabase)
 * Aceita um cliente Supabase como parâmetro (db: any para compatibilidade de assinatura)
 */
export async function seedTags(db: any): Promise<void> {
  try {
    const now = new Date().toISOString()

    const tags = TAGS_PADRAO.map((tag) => ({
      id: crypto.randomUUID(),
      nome: tag.nome,
      cor: tag.cor,
      tipo: tag.tipo,
      is_sistema: true,
      usuario_id: null,
      created_at: now,
    }))

    const { error } = await db.from('tags').upsert(tags, { onConflict: 'id' })
    if (error && error.code !== '23505') {
      console.warn('Aviso ao inserir tags padrao:', error.message)
    } else {
      console.log(`${TAGS_PADRAO.length} tags padrao inseridas com sucesso!`)
    }
  } catch (error) {
    console.error('Erro ao inserir tags padrao:', error)
    throw error
  }
}

/**
 * Verifica se o banco já possui tags (Supabase)
 */
export async function hasTags(db: any): Promise<boolean> {
  try {
    const { count } = await db.from('tags').select('*', { count: 'exact', head: true })
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

/**
 * Inicializa tags padrão se necessário (Supabase)
 */
export async function initializeTagsData(db: any): Promise<void> {
  const hasData = await hasTags(db)

  if (!hasData) {
    console.log('Banco sem tags detectado. Inserindo tags padrao...')
    await seedTags(db)
  } else {
    console.log('Banco ja possui tags.')
  }
}
