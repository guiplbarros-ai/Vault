// Database types based on Drizzle schema

export interface Conta {
  id: string
  userId: string
  instituicaoId?: string
  apelido?: string
  tipo?: string
  moeda: string
  ativa: boolean
}

export interface Transacao {
  id: string
  userId: string
  contaId: string
  data: string
  descricao: string
  valor: string
  tipo: string
  idExterno?: string
  saldoApos?: string
  hashDedupe: string
  parcelaN?: number
  parcelasTotal?: number
  linkOriginalId?: string
  valorOriginal?: string
  moedaOriginal?: string
}

export interface Categoria {
  id: string
  userId: string
  grupo?: string
  nome: string
  ativa: boolean
}

export interface Orcamento {
  id: string
  userId: string
  mes?: string
  categoriaId?: string
  valorAlvo?: string
}

export interface Instituicao {
  id: string
  userId: string
  nome: string
  tipo?: string
  createdAt: string
}

// Dashboard types

export interface SaldoConta {
  contaId: string
  apelido: string
  tipo: string
  saldo: number
  moeda: string
}

export interface DFCData {
  mes: string
  entradas: number
  saidas: number
  saldo: number
}

export interface OrcadoRealizadoData {
  categoria: string
  orcado: number
  realizado: number
}

export interface TopDespesa {
  descricao: string
  valor: number
  categoria?: string
  data: string
}

export interface EvolucaoMensal {
  mes: string
  valor: number
}
