/**
 * Seed para Cenários de Planejamento
 * Agent PLANEJAMENTO: Owner
 *
 * Cria o cenário base automaticamente quando não existir
 */

import type { Cenario } from '../types'
import { getSupabaseBrowserClient } from './supabase'

export async function seedCenarioBase() {
  const supabase = getSupabaseBrowserClient()

  try {
    // Verificar se já existe um cenário base
    const { data: cenarios } = await supabase
      .from('cenarios')
      .select('id')
      .eq('tipo', 'base')
      .limit(1)

    if (cenarios && cenarios.length > 0) {
      console.log('Cenario base ja existe')
      return
    }

    // Criar cenário base
    const now = new Date().toISOString()
    const cenarioBase = {
      id: `cenario_${Date.now()}`,
      nome: 'Cenario Base',
      descricao: 'Projecao baseada no seu comportamento financeiro atual',
      tipo: 'base',
      horizonte_anos: 5,
      data_inicio: now,
      created_at: now,
      updated_at: now,
    }

    const { error } = await supabase.from('cenarios').insert(cenarioBase)
    if (error) {
      if (error.code !== '23505') {
        throw error
      }
      console.log('Cenario base ja existe, pulando...')
      return
    }
    console.log('Cenario base criado com sucesso')
  } catch (error) {
    console.error('Erro ao criar cenario base:', error)
    throw error
  }
}
