/**
 * Seed de Contas Mock
 * Agent BACKEND: Owner
 *
 * Popula contas bancarias realistas para modo demo
 */

import type { Conta, TipoConta } from '../types'
import { getSupabaseBrowserClient } from './supabase'

export interface ContaMockData {
  nome: string
  tipo: TipoConta
  saldo_inicial: number
  instituicao_codigo: string // Codigo da instituicao (para buscar ID depois)
  agencia?: string
  numero?: string
  cor?: string
  icone?: string
}

export const CONTAS_MOCK: ContaMockData[] = [
  {
    nome: 'Conta Corrente Principal',
    tipo: 'corrente',
    saldo_inicial: 4250.0,
    instituicao_codigo: '260', // Nubank
    agencia: '0001',
    numero: '123456-7',
    cor: '#820AD1',
  },
  {
    nome: 'Conta Poupanca',
    tipo: 'poupanca',
    saldo_inicial: 15000.0,
    instituicao_codigo: '341', // Itau
    agencia: '4321',
    numero: '98765-4',
    cor: '#EC7000',
  },
  {
    nome: 'Investimentos CDB',
    tipo: 'investimento',
    saldo_inicial: 50000.0,
    instituicao_codigo: '077', // Inter
    cor: '#FF7A00',
  },
  {
    nome: 'Cartao Nubank',
    tipo: 'carteira',
    saldo_inicial: 0,
    instituicao_codigo: '260', // Nubank
    cor: '#820AD1',
  },
  {
    nome: 'Conta Digital',
    tipo: 'corrente',
    saldo_inicial: 1850.0,
    instituicao_codigo: '077', // Inter
    agencia: '0001',
    numero: '654321-0',
    cor: '#FF7A00',
  },
]

/**
 * Verifica se ja existem contas no banco
 */
export async function hasContas(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const { count } = await supabase.from('contas').select('*', { count: 'exact', head: true })
  return (count ?? 0) > 0
}

/**
 * Popula o banco com contas mock
 * IMPORTANTE: Requer que as instituicoes ja estejam criadas
 */
export async function seedContas(): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const alreadyHas = await hasContas()

  if (alreadyHas) {
    console.log('Contas ja existem, pulando seed...')
    return
  }

  // Buscar todas as instituicoes para mapear codigo -> ID
  const { data: instituicoes } = await supabase.from('instituicoes').select('id, codigo')
  const instituicaoMap = new Map<string, string>((instituicoes || []).map((inst: any) => [inst.codigo as string, inst.id as string]))

  const now = new Date()
  const contas: Conta[] = []

  for (let i = 0; i < CONTAS_MOCK.length; i++) {
    const contaMock = CONTAS_MOCK[i]!
    const instituicaoId = instituicaoMap.get(contaMock.instituicao_codigo)

    if (!instituicaoId) {
      console.warn(
        `Instituicao com codigo ${contaMock.instituicao_codigo} nao encontrada, pulando conta "${contaMock.nome}"`
      )
      continue
    }

    const conta: Conta = {
      id: `conta_${Date.now()}_${i}`,
      instituicao_id: instituicaoId,
      nome: contaMock.nome,
      tipo: contaMock.tipo,
      agencia: contaMock.agencia,
      numero: contaMock.numero,
      saldo_referencia: contaMock.saldo_inicial,
      data_referencia: now,
      saldo_atual: contaMock.saldo_inicial,
      ativa: true,
      cor: contaMock.cor,
      icone: contaMock.icone,
      usuario_id: 'usuario-producao',
      created_at: now,
      updated_at: now,
    }

    contas.push(conta)
  }

  if (contas.length > 0) {
    const { error } = await supabase.from('contas').insert(contas)
    if (error) {
      if (error.code !== '23505') {
        throw error
      }
      console.log('Algumas contas ja existem, pulando duplicatas...')
      return
    }
    console.log(`${contas.length} contas criadas com sucesso!`)
  } else {
    console.log('Nenhuma conta foi criada (instituicoes nao encontradas)')
  }
}

/**
 * Remove todas as contas mock (util para limpar dados demo)
 */
export async function clearContas(): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  const { count } = await supabase.from('contas').select('*', { count: 'exact', head: true })
  await supabase.from('contas').delete().neq('id', '')
  console.log(`${count ?? 0} contas removidas`)
}
