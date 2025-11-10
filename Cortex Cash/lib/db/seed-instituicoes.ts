/**
 * Seed de Instituições Financeiras
 * Agent BACKEND: Owner
 *
 * Popula instituições brasileiras comuns para modo demo
 */

import type { Instituicao } from '../types'
import { getDB } from './client'

export const INSTITUICOES_PADRAO: Omit<Instituicao, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    nome: 'Nubank',
    codigo: '260',
    logo_url: '/logos/banks/nubank.png',
    cor: '#820AD1',
  },
  {
    nome: 'Inter',
    codigo: '077',
    logo_url: '/logos/banks/inter.png',
    cor: '#FF7A00',
  },
  {
    nome: 'Itaú',
    codigo: '341',
    logo_url: '/logos/banks/itau.png',
    cor: '#EC7000',
  },
  {
    nome: 'Bradesco',
    codigo: '237',
    logo_url: '/logos/banks/bradesco.png',
    cor: '#CC092F',
  },
  {
    nome: 'Banco do Brasil',
    codigo: '001',
    logo_url: '/logos/banks/bb.png',
    cor: '#FFF100',
  },
  {
    nome: 'Caixa Econômica',
    codigo: '104',
    logo_url: '/logos/banks/caixa.png',
    cor: '#0066A1',
  },
  {
    nome: 'Santander',
    codigo: '033',
    logo_url: '/logos/banks/santander.png',
    cor: '#EC0000',
  },
  {
    nome: 'C6 Bank',
    codigo: '336',
    logo_url: '/logos/banks/c6.png',
    cor: '#000000',
  },
  {
    nome: 'PagBank',
    codigo: '290',
    logo_url: '/logos/banks/pagbank.png',
    cor: '#00A868',
  },
  {
    nome: 'Mercado Pago',
    codigo: '323',
    logo_url: '/logos/banks/mercadopago.svg',
    cor: '#009EE3',
  },
  {
    nome: 'Neon',
    codigo: '735',
    logo_url: '/logos/banks/neon.svg',
    cor: '#00D9D5',
  },
  {
    nome: 'BTG Pactual',
    codigo: '208',
    logo_url: '/logos/banks/btg.png',
    cor: '#000000',
  },
  {
    nome: 'XP Investimentos',
    codigo: '102',
    logo_url: '/logos/banks/xp.png',
    cor: '#000000',
  },
  {
    nome: 'Modal',
    codigo: '746',
    logo_url: '/logos/banks/modal.svg',
    cor: '#1B4FFF',
  },
  {
    nome: 'Rico',
    codigo: '355',
    logo_url: '/logos/banks/rico.svg',
    cor: '#000080',
  },
]

/**
 * Verifica se já existem instituições no banco
 */
export async function hasInstituicoes(): Promise<boolean> {
  const db = getDB()
  const count = await db.instituicoes.count()
  return count > 0
}

/**
 * Popula o banco com instituições padrão
 */
export async function seedInstituicoes(): Promise<void> {
  const db = getDB()
  const alreadyHas = await hasInstituicoes()

  if (alreadyHas) {
    console.log('✓ Instituições já existem, pulando seed...')
    return
  }

  const now = new Date()

  const instituicoes: Instituicao[] = INSTITUICOES_PADRAO.map((inst, index) => ({
    ...inst,
    id: `inst_${Date.now()}_${index}`,
    created_at: now,
    updated_at: now,
  }))

  try {
    await db.instituicoes.bulkAdd(instituicoes)
    console.log(`✓ ${instituicoes.length} instituições criadas com sucesso!`)
  } catch (error: any) {
    if (error?.name !== 'ConstraintError') {
      throw error;
    }
    console.log('⚠️ Algumas instituições já existem, pulando duplicatas...');
  }
}

/**
 * Cria apenas instituições essenciais (Nubank, Inter, Itaú)
 */
export async function seedInstituicoesEssenciais(): Promise<void> {
  const db = getDB()
  const essenciais = INSTITUICOES_PADRAO.slice(0, 3) // Nubank, Inter, Itaú

  const now = new Date()

  const instituicoes: Instituicao[] = essenciais.map((inst, index) => ({
    ...inst,
    id: `inst_${Date.now()}_${index}`,
    created_at: now,
    updated_at: now,
  }))

  try {
    await db.instituicoes.bulkAdd(instituicoes)
    console.log(`✓ ${instituicoes.length} instituições essenciais criadas!`)
  } catch (error: any) {
    if (error?.name !== 'ConstraintError') {
      throw error;
    }
    console.log('⚠️ Algumas instituições já existem, pulando duplicatas...');
  }
}
