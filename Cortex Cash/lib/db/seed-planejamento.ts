/**
 * Seed para Cenários de Planejamento
 * Agent PLANEJAMENTO: Owner
 *
 * Cria o cenário base automaticamente quando não existir
 */

import { getDB } from './client'
import type { Cenario } from '../types'

export async function seedCenarioBase() {
  const db = getDB()

  try {
    // Verificar se já existe um cenário base
    const cenarioBaseExistente = await db.cenarios
      .where('tipo')
      .equals('base')
      .first()

    if (cenarioBaseExistente) {
      console.log('✓ Cenário base já existe')
      return
    }

    // Criar cenário base
    const cenarioBase: Cenario = {
      id: `cenario_${Date.now()}`,
      nome: 'Cenário Base',
      descricao: 'Projeção baseada no seu comportamento financeiro atual',
      tipo: 'base',
      horizonte_anos: 5,
      data_inicio: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    }

    await db.cenarios.add(cenarioBase)
    console.log('✓ Cenário base criado com sucesso')

  } catch (error) {
    console.error('Erro ao criar cenário base:', error)
    throw error
  }
}
