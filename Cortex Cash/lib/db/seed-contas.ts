/**
 * Seed de Contas Mock
 * Agent BACKEND: Owner
 *
 * Popula contas banc�rias realistas para modo demo
 */

import type { Conta, TipoConta } from '../types'
import { getDB } from './client'

export interface ContaMockData {
  nome: string
  tipo: TipoConta
  saldo_inicial: number
  instituicao_codigo: string // C�digo da institui��o (para buscar ID depois)
  agencia?: string
  numero?: string
  cor?: string
  icone?: string
}

export const CONTAS_MOCK: ContaMockData[] = [
  {
    nome: 'Conta Corrente Principal',
    tipo: 'corrente',
    saldo_inicial: 4250.00,
    instituicao_codigo: '260', // Nubank
    agencia: '0001',
    numero: '123456-7',
    cor: '#820AD1',
    icone: '=�',
  },
  {
    nome: 'Conta Poupan�a',
    tipo: 'poupanca',
    saldo_inicial: 15000.00,
    instituicao_codigo: '341', // Ita�
    agencia: '4321',
    numero: '98765-4',
    cor: '#EC7000',
    icone: '<�',
  },
  {
    nome: 'Investimentos CDB',
    tipo: 'investimento',
    saldo_inicial: 50000.00,
    instituicao_codigo: '077', // Inter
    cor: '#FF7A00',
    icone: '=�',
  },
  {
    nome: 'Cart�o Nubank',
    tipo: 'carteira',
    saldo_inicial: 0,
    instituicao_codigo: '260', // Nubank
    cor: '#820AD1',
    icone: '=�',
  },
  {
    nome: 'Conta Digital',
    tipo: 'corrente',
    saldo_inicial: 1850.00,
    instituicao_codigo: '077', // Inter
    agencia: '0001',
    numero: '654321-0',
    cor: '#FF7A00',
    icone: '=�',
  },
]

/**
 * Verifica se j� existem contas no banco
 */
export async function hasContas(): Promise<boolean> {
  const db = getDB()
  const count = await db.contas.count()
  return count > 0
}

/**
 * Popula o banco com contas mock
 * IMPORTANTE: Requer que as institui��es j� estejam criadas
 */
export async function seedContas(): Promise<void> {
  const db = getDB()
  const alreadyHas = await hasContas()

  if (alreadyHas) {
    console.log(' Contas j� existem, pulando seed...')
    return
  }

  // Buscar todas as institui��es para mapear c�digo -> ID
  const instituicoes = await db.instituicoes.toArray()
  const instituicaoMap = new Map(
    instituicoes.map(inst => [inst.codigo, inst.id])
  )

  const now = new Date()
  const contas: Conta[] = []

  for (let i = 0; i < CONTAS_MOCK.length; i++) {
    const contaMock = CONTAS_MOCK[i]
    const instituicaoId = instituicaoMap.get(contaMock.instituicao_codigo)

    if (!instituicaoId) {
      console.warn(`� Institui��o com c�digo ${contaMock.instituicao_codigo} n�o encontrada, pulando conta "${contaMock.nome}"`)
      continue
    }

    const conta: Conta = {
      id: `conta_${Date.now()}_${i}`,
      instituicao_id: instituicaoId,
      nome: contaMock.nome,
      tipo: contaMock.tipo,
      agencia: contaMock.agencia,
      numero: contaMock.numero,
      saldo_inicial: contaMock.saldo_inicial,
      saldo_atual: contaMock.saldo_inicial, // Inicialmente igual ao saldo inicial
      ativa: true,
      cor: contaMock.cor,
      icone: contaMock.icone,
      created_at: now,
      updated_at: now,
    }

    contas.push(conta)
  }

  if (contas.length > 0) {
    await db.contas.bulkAdd(contas)
    console.log(` ${contas.length} contas criadas com sucesso!`)
  } else {
    console.log('� Nenhuma conta foi criada (institui��es n�o encontradas)')
  }
}

/**
 * Remove todas as contas mock (�til para limpar dados demo)
 */
export async function clearContas(): Promise<void> {
  const db = getDB()
  const count = await db.contas.count()
  await db.contas.clear()
  console.log(`=� ${count} contas removidas`)
}
