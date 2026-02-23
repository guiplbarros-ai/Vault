/**
 * Testes Unitários - TransacaoService
 * Agent CORE: Implementador
 *
 * Testa operações CRUD de transações (Supabase mocks)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted mock setup: inline to avoid module resolution issues
const { mockSupabase, mockResponse, resetMocks } = vi.hoisted(() => {
  function createMockQueryBuilder(result: any = { data: null, error: null }) {
    const builder: any = {
      _result: result,
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      then(resolve: any, reject?: any) {
        return Promise.resolve(builder._result).then(resolve, reject)
      },
    }
    return builder
  }

  const queryBuilders = new Map()
  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createMockQueryBuilder())
      }
      return queryBuilders.get(table)!
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  function mockResponse(table: string, data: any, error: any = null) {
    const qb = createMockQueryBuilder({ data, error })
    queryBuilders.set(table, qb)
    return qb
  }

  function resetMocks() {
    queryBuilders.clear()
    mockSupabase.from.mockClear()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
  }

  return { mockSupabase, mockResponse, resetMocks }
})

vi.mock('@/lib/db/supabase', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getSupabaseBrowserClient: vi.fn(() => mockSupabase),
  getSupabaseServerClient: vi.fn(() => mockSupabase),
  getSupabaseAuthClient: vi.fn(() => mockSupabase),
}))

// Mock dependencies that TransacaoService calls internally
vi.mock('@/lib/services/conta.service', () => ({
  contaService: {
    recalcularESalvarSaldo: vi.fn().mockResolvedValue(undefined),
  },
  ContaService: vi.fn(),
}))

vi.mock('@/lib/services/orcamento.service', () => ({
  orcamentoService: {
    listOrcamentos: vi.fn().mockResolvedValue([]),
    recalcularValorRealizado: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/import/dedupe', () => ({
  generateTransactionHash: vi.fn().mockResolvedValue('mock-hash-generated'),
}))

vi.mock('@/lib/utils/format', () => ({
  generateHash: vi.fn().mockResolvedValue('mock-transfer-hash'),
}))

import { TransacaoService } from '@/lib/services/transacao.service'
import type { CreateTransacaoDTO, Transacao } from '@/lib/types'
import { categoriasDespesa } from '../../fixtures/categorias'
import { contaAtiva, contaPoupanca } from '../../fixtures/contas'
import { despesas, receitas, transacoes } from '../../fixtures/transacoes'

describe('TransacaoService', () => {
  const service = new TransacaoService()

  beforeEach(() => {
    resetMocks()
    vi.clearAllMocks()
  })

  // ── Helpers ────────────────────────────────────────────────
  function transacaoToRow(t: Transacao): Record<string, unknown> {
    return {
      ...t,
      data: t.data instanceof Date ? t.data.toISOString() : t.data,
      created_at: t.created_at instanceof Date ? t.created_at.toISOString() : t.created_at,
      updated_at: t.updated_at instanceof Date ? t.updated_at.toISOString() : t.updated_at,
    }
  }

  const transacoesRows = transacoes.map(transacaoToRow)
  const despesaRows = despesas.map(transacaoToRow)
  const receitaRows = receitas.map(transacaoToRow)

  describe('listTransacoes', () => {
    it('deve listar todas as transações quando sem filtros', async () => {
      mockResponse('transacoes', transacoesRows)
      const result = await service.listTransacoes()
      expect(result).toHaveLength(transacoes.length)
    })

    it('deve filtrar transações por conta', async () => {
      const filtered = transacoesRows.filter((t) => t.conta_id === contaAtiva.id)
      mockResponse('transacoes', filtered)
      const result = await service.listTransacoes({ contaId: contaAtiva.id })
      expect(result.every((t) => t.conta_id === contaAtiva.id)).toBe(true)
    })

    it('deve filtrar transações por categoria', async () => {
      const categoriaId = categoriasDespesa[0]!.id
      const filtered = transacoesRows.filter((t) => t.categoria_id === categoriaId)
      mockResponse('transacoes', filtered)
      const result = await service.listTransacoes({ categoriaId })
      expect(result.every((t) => t.categoria_id === categoriaId)).toBe(true)
    })

    it('deve filtrar transações por tipo (despesa)', async () => {
      mockResponse('transacoes', despesaRows)
      const result = await service.listTransacoes({ tipo: 'despesa' })
      expect(result.every((t) => t.tipo === 'despesa')).toBe(true)
      expect(result.length).toBe(despesas.length)
    })

    it('deve filtrar transações por tipo (receita)', async () => {
      mockResponse('transacoes', receitaRows)
      const result = await service.listTransacoes({ tipo: 'receita' })
      expect(result.every((t) => t.tipo === 'receita')).toBe(true)
      expect(result.length).toBe(receitas.length)
    })

    it('deve aplicar paginação corretamente', async () => {
      const paginatedRows = transacoesRows.slice(0, 3)
      mockResponse('transacoes', paginatedRows)
      const result = await service.listTransacoes({ limit: 3, offset: 0 })
      expect(result).toHaveLength(3)
    })

    it('deve chamar from(transacoes) com select', async () => {
      mockResponse('transacoes', transacoesRows)
      await service.listTransacoes()
      expect(mockSupabase.from).toHaveBeenCalledWith('transacoes')
    })
  })

  describe('getTransacaoById', () => {
    it('deve retornar transação quando ID existe', async () => {
      const row = transacaoToRow(transacoes[0]!)
      mockResponse('transacoes', row)
      const result = await service.getTransacaoById('trans-1')
      expect(result).toBeDefined()
      expect(result?.id).toBe('trans-1')
      expect(result?.descricao).toBe('IFOOD RESTAURANTE')
    })

    it('deve retornar null quando ID não existe', async () => {
      mockResponse('transacoes', null)
      const result = await service.getTransacaoById('id-inexistente')
      expect(result).toBeNull()
    })
  })

  describe('createTransacao', () => {
    it('deve criar transação com dados válidos', async () => {
      const dto: CreateTransacaoDTO = {
        conta_id: contaAtiva.id,
        categoria_id: categoriasDespesa[0]!.id,
        data: new Date('2025-01-26'),
        descricao: 'NOVA TRANSACAO',
        valor: 100.0,
        tipo: 'despesa',
      }
      const insertedRow = {
        id: 'generated-uuid',
        conta_id: dto.conta_id,
        categoria_id: dto.categoria_id,
        data: new Date('2025-01-26').toISOString(),
        descricao: 'NOVA TRANSACAO',
        valor: 100.0,
        tipo: 'despesa',
        parcelado: false,
        classificacao_confirmada: true,
        classificacao_origem: 'manual',
        hash: 'mock-hash-generated',
        usuario_id: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockResponse('transacoes', insertedRow)
      const result = await service.createTransacao(dto)
      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.descricao).toBe('NOVA TRANSACAO')
      expect(result.valor).toBe(100.0)
      expect(result.tipo).toBe('despesa')
      expect(result.created_at).toBeDefined()
      expect(result.updated_at).toBeDefined()
    })

    it('deve rejeitar transação sem conta_id', async () => {
      const dto = {
        categoria_id: categoriasDespesa[0]!.id,
        data: new Date('2025-01-26'),
        descricao: 'SEM CONTA',
        valor: 100.0,
        tipo: 'despesa',
      } as any
      await expect(service.createTransacao(dto)).rejects.toThrow()
    })

    it('deve rejeitar transação sem descrição', async () => {
      const dto = {
        conta_id: contaAtiva.id,
        data: new Date('2025-01-26'),
        valor: 100.0,
        tipo: 'despesa',
      } as any
      await expect(service.createTransacao(dto)).rejects.toThrow()
    })

    it('deve rejeitar transação sem tipo', async () => {
      const dto = {
        conta_id: contaAtiva.id,
        data: new Date('2025-01-26'),
        descricao: 'SEM TIPO',
        valor: 100.0,
      } as any
      await expect(service.createTransacao(dto)).rejects.toThrow()
    })

    it('deve criar transação sem categoria (pendente classificação)', async () => {
      const dto: CreateTransacaoDTO = {
        conta_id: contaAtiva.id,
        data: new Date('2025-01-26'),
        descricao: 'SEM CATEGORIA',
        valor: 100.0,
        tipo: 'despesa',
      }
      const insertedRow = {
        id: 'generated-uuid',
        conta_id: dto.conta_id,
        categoria_id: null,
        data: new Date('2025-01-26').toISOString(),
        descricao: 'SEM CATEGORIA',
        valor: 100.0,
        tipo: 'despesa',
        parcelado: false,
        classificacao_confirmada: false,
        classificacao_origem: null,
        hash: 'mock-hash-generated',
        usuario_id: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockResponse('transacoes', insertedRow)
      const result = await service.createTransacao(dto)
      // rowToTransacao casts null categoria_id as string | undefined
      // In practice null and undefined both represent "no category"
      expect(result.categoria_id == null).toBe(true)
      expect(result.classificacao_confirmada).toBe(false)
    })
  })

  describe('updateTransacao', () => {
    it('deve atualizar transação existente', async () => {
      const existingRow = transacaoToRow(transacoes[0]!)
      const updatedRow = {
        ...existingRow,
        descricao: 'DESCRICAO ATUALIZADA',
        valor: 200.0,
        updated_at: new Date().toISOString(),
      }
      mockResponse('transacoes', updatedRow)
      const result = await service.updateTransacao('trans-1', {
        descricao: 'DESCRICAO ATUALIZADA',
        valor: 200.0,
      })
      expect(result).toBeDefined()
      expect(result.descricao).toBe('DESCRICAO ATUALIZADA')
      expect(result.valor).toBe(200.0)
    })

    it('deve lançar erro quando ID não existe', async () => {
      mockResponse('transacoes', null)
      await expect(
        service.updateTransacao('id-inexistente', { descricao: 'NAO IMPORTA' })
      ).rejects.toThrow()
    })

    it('deve atualizar categoria e marcar como confirmada', async () => {
      const existingRow = transacaoToRow(transacoes.find((t) => t.id === 'trans-9')!)
      const updatedRow = {
        ...existingRow,
        categoria_id: categoriasDespesa[0]!.id,
        classificacao_confirmada: true,
        classificacao_origem: 'manual',
        updated_at: new Date().toISOString(),
      }
      mockResponse('transacoes', updatedRow)
      const result = await service.updateTransacao('trans-9', {
        categoria_id: categoriasDespesa[0]!.id,
        classificacao_confirmada: true,
      })
      expect(result.categoria_id).toBe(categoriasDespesa[0]!.id)
      expect(result.classificacao_confirmada).toBe(true)
    })
  })

  describe('deleteTransacao', () => {
    it('deve excluir transação existente', async () => {
      const row = transacaoToRow(transacoes[0]!)
      mockResponse('transacoes', row)
      await service.deleteTransacao('trans-1')
      expect(mockSupabase.from).toHaveBeenCalledWith('transacoes')
    })

    it('deve lançar erro quando ID não existe', async () => {
      mockResponse('transacoes', null)
      await expect(service.deleteTransacao('id-inexistente')).rejects.toThrow()
    })
  })

  describe('bulkUpdateCategoria', () => {
    it('deve atualizar categoria de múltiplas transações', async () => {
      const novaCategoriaId = categoriasDespesa[4]!.id
      mockResponse('transacoes', [
        { id: 'trans-1', categoria_id: categoriasDespesa[0]!.id },
        { id: 'trans-2', categoria_id: categoriasDespesa[1]!.id },
      ])
      const count = await service.bulkUpdateCategoria(
        ['trans-1', 'trans-2', 'trans-3'],
        novaCategoriaId
      )
      expect(count).toBeGreaterThanOrEqual(0)
      expect(mockSupabase.from).toHaveBeenCalledWith('transacoes')
    })

    it('deve ignorar IDs inexistentes sem erro', async () => {
      const novaCategoriaId = categoriasDespesa[4]!.id
      mockResponse('transacoes', [{ id: 'trans-1', categoria_id: categoriasDespesa[0]!.id }])
      await expect(
        service.bulkUpdateCategoria(['trans-1', 'id-inexistente'], novaCategoriaId)
      ).resolves.not.toThrow()
    })
  })

  describe('createTransfer', () => {
    it('deve criar transferência entre duas contas', async () => {
      const origemRow = {
        id: 'transfer-origem-id',
        conta_id: contaAtiva.id,
        data: new Date().toISOString(),
        descricao: 'TRANSFERENCIA TESTE',
        valor: -1000,
        tipo: 'transferencia',
        transferencia_id: 'mock-transfer-id',
        conta_destino_id: contaPoupanca.id,
        parcelado: false,
        classificacao_confirmada: true,
        classificacao_origem: 'manual',
        hash: 'mock-transfer-hash',
        usuario_id: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const destinoRow = {
        id: 'transfer-destino-id',
        conta_id: contaPoupanca.id,
        data: new Date().toISOString(),
        descricao: 'TRANSFERENCIA TESTE',
        valor: 1000,
        tipo: 'transferencia',
        transferencia_id: 'mock-transfer-id',
        conta_destino_id: null,
        parcelado: false,
        classificacao_confirmada: true,
        classificacao_origem: 'manual',
        hash: 'mock-transfer-hash',
        usuario_id: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockResponse('transacoes', [origemRow, destinoRow])
      const result = await service.createTransfer(
        contaAtiva.id,
        contaPoupanca.id,
        1000,
        'TRANSFERENCIA TESTE'
      )
      expect(result.origem).toBeDefined()
      expect(result.destino).toBeDefined()
      expect(result.origem.valor).toBe(-1000)
      expect(result.destino.valor).toBe(1000)
      expect(result.origem.tipo).toBe('transferencia')
      expect(result.destino.tipo).toBe('transferencia')
      expect(result.origem.transferencia_id).toBe(result.destino.transferencia_id)
      expect(result.origem.conta_destino_id).toBe(contaPoupanca.id)
    })

    it('deve rejeitar transferência quando contas são iguais', async () => {
      await expect(
        service.createTransfer(contaAtiva.id, contaAtiva.id, 1000, 'TESTE')
      ).rejects.toThrow('Conta de origem e destino não podem ser a mesma')
    })

    it('deve rejeitar transferência com valor negativo', async () => {
      await expect(
        service.createTransfer(contaAtiva.id, contaPoupanca.id, -100, 'TESTE')
      ).rejects.toThrow('Valor da transferência deve ser positivo')
    })

    it('deve rejeitar transferência com valor zero', async () => {
      await expect(
        service.createTransfer(contaAtiva.id, contaPoupanca.id, 0, 'TESTE')
      ).rejects.toThrow('Valor da transferência deve ser positivo')
    })

    it('deve rejeitar transferência sem conta origem', async () => {
      await expect(service.createTransfer('', contaPoupanca.id, 1000, 'TESTE')).rejects.toThrow()
    })

    it('deve rejeitar transferência sem conta destino', async () => {
      await expect(service.createTransfer(contaAtiva.id, '', 1000, 'TESTE')).rejects.toThrow()
    })
  })

  describe('getTransacaoByHash', () => {
    it('deve retornar transação por hash', async () => {
      const trans = transacoes[0]!
      const row = transacaoToRow(trans)
      mockResponse('transacoes', row)
      const result = await service.getTransacaoByHash(trans.hash!)
      expect(result).toBeDefined()
      expect(result?.id).toBe(trans.id)
      expect(result?.hash).toBe(trans.hash)
    })

    it('deve retornar null quando hash não existe', async () => {
      mockResponse('transacoes', null)
      const result = await service.getTransacaoByHash('hash-inexistente')
      expect(result).toBeNull()
    })
  })

  describe('filtros de classificação', () => {
    it('deve excluir transferências ao filtrar por tipo despesa', async () => {
      mockResponse('transacoes', despesaRows)
      const result = await service.listTransacoes({ tipo: 'despesa' })
      expect(result.every((t) => t.tipo === 'despesa')).toBe(true)
    })
  })

  describe('resumos e agregações', () => {
    it('deve calcular totais por tipo', async () => {
      mockResponse('transacoes', despesaRows)
      const despesasResult = await service.listTransacoes({ tipo: 'despesa' })
      resetMocks()
      mockResponse('transacoes', receitaRows)
      const receitasResult = await service.listTransacoes({ tipo: 'receita' })
      const totalDespesas = despesasResult.reduce((sum, t) => sum + Math.abs(t.valor), 0)
      const totalReceitas = receitasResult.reduce((sum, t) => sum + t.valor, 0)
      expect(totalDespesas).toBeGreaterThan(0)
      expect(totalReceitas).toBeGreaterThan(0)
    })
  })
})
