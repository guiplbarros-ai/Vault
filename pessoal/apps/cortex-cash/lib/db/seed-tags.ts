'use client'
import { TAGS_PADRAO } from './seed'

/**
 * Função para inserir tags padrão no banco (Dexie)
 */
export async function seedTags(db: any): Promise<void> {
  try {
    const now = new Date()

    const tags = TAGS_PADRAO.map((tag) => ({
      id: crypto.randomUUID(),
      nome: tag.nome,
      cor: tag.cor,
      tipo: tag.tipo,
      is_sistema: true, // Tags padrão são do sistema
      usuario_id: undefined, // Tags do sistema não pertencem a nenhum usuário
      created_at: now,
    }))

    try {
      await db.tags.bulkAdd(tags)
      console.log(`✅ ${TAGS_PADRAO.length} tags padrão inseridas com sucesso!`)
    } catch (error: any) {
      if (error?.name !== 'ConstraintError') {
        throw error
      }
      console.log('⚠️ Algumas tags já existem, pulando duplicatas...')
    }
  } catch (error) {
    console.error('❌ Erro ao inserir tags padrão:', error)
    throw error
  }
}

/**
 * Verifica se o banco já possui tags (Dexie)
 */
export async function hasTags(db: any): Promise<boolean> {
  try {
    const count = await db.tags.count()
    return count > 0
  } catch {
    return false
  }
}

/**
 * Inicializa tags padrão se necessário (Dexie)
 */
export async function initializeTagsData(db: any): Promise<void> {
  const hasData = await hasTags(db)

  if (!hasData) {
    console.log('📦 Banco sem tags detectado. Inserindo tags padrão...')
    await seedTags(db)
  } else {
    console.log('✅ Banco já possui tags.')
  }
}
