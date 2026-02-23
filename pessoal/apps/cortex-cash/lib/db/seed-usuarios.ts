import type { Usuario } from '../types'
import { getSupabaseBrowserClient } from './supabase'

// Hash de senha padrao: "123456" (apenas para migracao/compatibilidade)
const DEFAULT_PASSWORD_HASH = '$2a$10$YQ3p5kZ8qZ7p5kZ8qZ7p5.YQ3p5kZ8qZ7p5kZ8qZ7p5kZ8qZ7p5kZ' // bcrypt('123456')

export const USUARIOS_PADRAO: Omit<Usuario, 'created_at' | 'updated_at'>[] = [
  {
    id: 'usuario-producao',
    nome: 'Producao',
    email: 'producao@cortexcash.local',
    senha_hash: DEFAULT_PASSWORD_HASH,
    role: 'admin',
    ativo: false,
  },
  {
    id: 'usuario-teste',
    nome: 'Teste',
    email: 'teste@cortexcash.local',
    senha_hash: DEFAULT_PASSWORD_HASH,
    role: 'user',
    ativo: false,
  },
]

/**
 * Verifica se ja existem usuarios no banco
 */
export async function hasUsuarios(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const { count } = await supabase.from('usuarios').select('*', { count: 'exact', head: true })
  return (count ?? 0) > 0
}

/**
 * Popula o banco com usuarios padrao
 */
export async function seedUsuarios(): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const alreadyHas = await hasUsuarios()

  if (alreadyHas) {
    console.log('Usuarios ja existem, pulando seed...')
    return
  }

  const now = new Date().toISOString()

  const usuarios = USUARIOS_PADRAO.map((user) => ({
    ...user,
    created_at: now,
    updated_at: now,
  }))

  const { error } = await supabase.from('usuarios').insert(usuarios)
  if (error) {
    if (error.code !== '23505') {
      throw error
    }
    console.log('Alguns usuarios ja existem, pulando duplicatas...')
    return
  }

  console.log(`${usuarios.length} usuarios padrao criados com sucesso!`)

  // Define o usuario Producao como ativo por padrao
  if (typeof window !== 'undefined') {
    const currentUserId = localStorage.getItem('cortex-cash-current-user-id')
    if (!currentUserId) {
      localStorage.setItem('cortex-cash-current-user-id', 'usuario-producao')
      console.log('Usuario ativo definido como Producao')
    }
  }
}

/**
 * Retorna o ID do usuario atualmente ativo
 * IMPORTANTE: Agora usa authService.getCurrentUserId() para suportar autenticacao real
 * Fallback para Producao se nao houver nenhum definido
 */
export function getCurrentUserId(): string {
  if (typeof window === 'undefined') {
    return 'usuario-producao' // Default no SSR
  }

  // Tenta pegar do authService primeiro (novo sistema com autenticacao)
  try {
    const { authService } = require('../services/auth.service')
    const userId = authService.getCurrentUserId()
    if (userId) {
      return userId
    }
  } catch (error) {
    // authService pode nao estar disponivel ainda (durante inicializacao)
    // Continua para fallback
  }

  // Fallback: old system (compatibilidade com usuarios sem login)
  const userId = localStorage.getItem('cortex-cash-current-user-id')
  return userId || 'usuario-producao'
}

/**
 * Define o usuario ativo
 */
export function setCurrentUserId(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cortex-cash-current-user-id', userId)
    console.log(`Usuario ativo alterado para: ${userId}`)
  }
}

/**
 * Verifica se esta no modo teste
 */
export function isTestMode(): boolean {
  return getCurrentUserId() === 'usuario-teste'
}
