/**
 * Seed de Institui��es Financeiras
 * Agent BACKEND: Owner
 *
 * Popula institui��es brasileiras comuns para modo demo
 */

import type { Instituicao } from '../types'
import { getDB } from './client'

export const INSTITUICOES_PADRAO: Omit<Instituicao, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    nome: 'Nubank',
    codigo: '260',
    logo_url: '',
    cor: '#820AD1',
  },
  {
    nome: 'Inter',
    codigo: '077',
    logo_url: '',
    cor: '#FF7A00',
  },
  {
    nome: 'Ita�',
    codigo: '341',
    logo_url: '',
    cor: '#EC7000',
  },
  {
    nome: 'Bradesco',
    codigo: '237',
    logo_url: '',
    cor: '#CC092F',
  },
  {
    nome: 'Banco do Brasil',
    codigo: '001',
    logo_url: '',
    cor: '#FFF100',
  },
  {
    nome: 'Caixa Econ�mica',
    codigo: '104',
    logo_url: '',
    cor: '#0066A1',
  },
  {
    nome: 'Santander',
    codigo: '033',
    logo_url: '',
    cor: '#EC0000',
  },
  {
    nome: 'C6 Bank',
    codigo: '336',
    logo_url: '',
    cor: '#000000',
  },
  {
    nome: 'PagBank',
    codigo: '290',
    logo_url: '',
    cor: '#00A868',
  },
  {
    nome: 'Mercado Pago',
    codigo: '323',
    logo_url: '',
    cor: '#009EE3',
  },
  {
    nome: 'Neon',
    codigo: '735',
    logo_url: '',
    cor: '#00D9D5',
  },
  {
    nome: 'BTG Pactual',
    codigo: '208',
    logo_url: '',
    cor: '#000000',
  },
  {
    nome: 'XP Investimentos',
    codigo: '102',
    logo_url: '',
    cor: '#000000',
  },
  {
    nome: 'Modal',
    codigo: '746',
    logo_url: '',
    cor: '#1B4FFF',
  },
  {
    nome: 'Rico',
    codigo: '355',
    logo_url: '',
    cor: '#000080',
  },
]

/**
 * Verifica se j� existem institui��es no banco
 */
export async function hasInstituicoes(): Promise<boolean> {
  const db = getDB()
  const count = await db.instituicoes.count()
  return count > 0
}

/**
 * Popula o banco com institui��es padr�o
 */
export async function seedInstituicoes(): Promise<void> {
  const db = getDB()
  const alreadyHas = await hasInstituicoes()

  if (alreadyHas) {
    console.log(' Institui��es j� existem, pulando seed...')
    return
  }

  const now = new Date()

  const instituicoes: Instituicao[] = INSTITUICOES_PADRAO.map((inst, index) => ({
    ...inst,
    id: `inst_${Date.now()}_${index}`,
    created_at: now,
    updated_at: now,
  }))

  await db.instituicoes.bulkAdd(instituicoes)
  console.log(` ${instituicoes.length} institui��es criadas com sucesso!`)
}

/**
 * Cria apenas institui��es essenciais (Nubank, Inter, Ita�)
 */
export async function seedInstituicoesEssenciais(): Promise<void> {
  const db = getDB()
  const essenciais = INSTITUICOES_PADRAO.slice(0, 3) // Nubank, Inter, Ita�

  const now = new Date()

  const instituicoes: Instituicao[] = essenciais.map((inst, index) => ({
    ...inst,
    id: `inst_${Date.now()}_${index}`,
    created_at: now,
    updated_at: now,
  }))

  await db.instituicoes.bulkAdd(instituicoes)
  console.log(` ${instituicoes.length} institui��es essenciais criadas!`)
}
