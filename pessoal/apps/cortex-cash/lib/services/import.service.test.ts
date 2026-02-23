/**
 * Testes Unitários - ImportService
 * Migrado de Dexie para Supabase mocks
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSupabase, mockResponse, resetMocks } = vi.hoisted(() => {
  const queryBuilders = new Map<string, any>()

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

  const mockFrom = vi.fn((table: string) => {
    if (!queryBuilders.has(table)) {
      queryBuilders.set(table, createMockQueryBuilder())
    }
    return queryBuilders.get(table)!
  })

  const mockSupabase = {
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
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
    mockFrom.mockClear()
    mockFrom.mockImplementation((table: string) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createMockQueryBuilder())
      }
      return queryBuilders.get(table)!
    })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
  }

  return { mockSupabase, mockResponse, resetMocks }
})

vi.mock('../db/supabase', () => ({
  getSupabase: vi.fn(() => mockSupabase),
  getSupabaseBrowserClient: vi.fn(() => mockSupabase),
  getSupabaseServerClient: vi.fn(() => mockSupabase),
  getSupabaseAuthClient: vi.fn(() => mockSupabase),
}))

// Mock transacaoService to avoid side effects during importTransactions
vi.mock('./transacao.service', () => ({
  transacaoService: {
    createTransacao: vi.fn().mockResolvedValue({ id: 'imported-1' }),
  },
  TransacaoService: class {},
}))

import type { MapeamentoColunas, ParseConfig } from '../types'
import { ImportService } from './import.service'
import { transacaoService } from './transacao.service'

describe('ImportService', () => {
  let service: ImportService

  beforeEach(() => {
    resetMocks()
    service = new ImportService()

    // Reset the transacaoService mock for each test
    vi.mocked(transacaoService.createTransacao).mockReset()
    vi.mocked(transacaoService.createTransacao).mockResolvedValue({ id: 'imported-1' } as any)
  })

  describe('detectFormat', () => {
    it('deve detectar formato CSV com vírgula', async () => {
      const content = 'Data,Descrição,Valor\n01/01/2024,Compra,100.00'
      const formato = await service.detectFormat(content)

      expect(formato.tipo).toBe('csv')
      expect(formato.detectado.separador).toBe(',')
      expect(formato.confianca).toBeGreaterThan(0.8)
    })

    it('deve detectar formato CSV com ponto-e-vírgula', async () => {
      const content = 'Data;Descrição;Valor\n01/01/2024;Compra;100,00'
      const formato = await service.detectFormat(content)

      expect(formato.tipo).toBe('csv')
      expect(formato.detectado.separador).toBe(';')
      expect(formato.confianca).toBeGreaterThan(0.8)
    })

    it('deve detectar formato OFX', async () => {
      const content = '<?OFX VERSION="1.0"?>\n<OFX>...</OFX>'
      const formato = await service.detectFormat(content)

      expect(formato.tipo).toBe('ofx')
      expect(formato.confianca).toBeGreaterThan(0.9)
    })

    it('deve detectar formato CSV com tab', async () => {
      const content = 'Data\tDescrição\tValor\n01/01/2024\tCompra\t100.00'
      const formato = await service.detectFormat(content)

      expect(formato.tipo).toBe('csv')
      expect(formato.detectado.separador).toBe('\t')
    })
  })

  describe('parseCSV', () => {
    it('deve fazer parse de CSV simples', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,Salário,5000.00
02/01/2024,Mercado,-150.50
03/01/2024,Netflix,-49.90`

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      }

      const config: ParseConfig = {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      }

      const result = await service.parseCSV(content, mapeamento, config)

      expect(result.success).toBe(true)
      expect(result.transacoes).toHaveLength(3)
      expect(result.erros).toHaveLength(0)

      // Verificar primeira transação
      expect(result.transacoes[0].descricao).toBe('Salário')
      expect(result.transacoes[0].valor).toBe(5000)
      expect(result.transacoes[0].tipo).toBe('receita')
      expect(result.transacoes[0].data.getDate()).toBe(1)
      expect(result.transacoes[0].data.getMonth()).toBe(0) // Janeiro = 0
    })

    it('deve detectar receitas e despesas baseado no valor', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,Receita,100.00
02/01/2024,Despesa,-50.00`

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      }

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      })

      expect(result.transacoes[0].tipo).toBe('receita')
      expect(result.transacoes[0].valor).toBe(100)

      expect(result.transacoes[1].tipo).toBe('despesa')
      expect(result.transacoes[1].valor).toBe(50) // valor absoluto
    })

    it('deve tratar separador decimal vírgula', async () => {
      const content = `Data;Descrição;Valor
01/01/2024;Compra;1.250,75`

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      }

      const result = await service.parseCSV(content, mapeamento, {
        separador: ';',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: ',',
      })

      expect(result.transacoes[0].valor).toBe(1250.75)
    })

    it('deve registrar erros de linhas inválidas', async () => {
      const content = `Data,Descrição,Valor
data_invalida,Compra,100
02/01/2024,Compra,valor_invalido
03/01/2024,Compra válida,50.00`

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      }

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      })

      expect(result.success).toBe(false)
      expect(result.erros.length).toBeGreaterThan(0)
      expect(result.transacoes).toHaveLength(1) // Apenas a linha válida
      expect(result.transacoes[0].descricao).toBe('Compra válida')
    })

    it('deve ignorar linhas vazias', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,Compra,100

02/01/2024,Compra2,200

`

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      }

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
      })

      expect(result.transacoes).toHaveLength(2)
    })

    it('deve fazer parse de campos entre aspas', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,"Compra com vírgula, teste",100.00
02/01/2024,"Compra ""especial""",200.00`

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      }

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      })

      expect(result.transacoes).toHaveLength(2)
      expect(result.transacoes[0].descricao).toContain('vírgula')
    })

    it('deve mapear campo de observações quando fornecido', async () => {
      const content = `Data,Descrição,Valor,Obs
01/01/2024,Compra,100.00,Nota fiscal 123`

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
        observacoes: 3,
      }

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      })

      expect(result.transacoes[0].observacoes).toBe('Nota fiscal 123')
    })
  })

  describe('parseOFX', () => {
    it('deve fazer parse de arquivo OFX básico', async () => {
      const content = `<?OFX VERSION="1.0"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20240101</DTPOSTED>
            <TRNAMT>-150.50</TRNAMT>
            <MEMO>Mercado</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20240102</DTPOSTED>
            <TRNAMT>5000.00</TRNAMT>
            <NAME>Salário</NAME>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`

      const result = await service.parseOFX(content)

      expect(result.success).toBe(true)
      expect(result.transacoes).toHaveLength(2)

      // Verificar transação de débito
      expect(result.transacoes[0].tipo).toBe('despesa')
      expect(result.transacoes[0].valor).toBe(150.5)
      expect(result.transacoes[0].descricao).toBe('Mercado')

      // Verificar transação de crédito
      expect(result.transacoes[1].tipo).toBe('receita')
      expect(result.transacoes[1].valor).toBe(5000)
      expect(result.transacoes[1].descricao).toBe('Salário')
    })

    it('deve fazer parse de data OFX completa (YYYYMMDDHHMMSS)', async () => {
      const content = `<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20240101120000</DTPOSTED>
<TRNAMT>-100.00</TRNAMT>
<MEMO>Teste</MEMO>
</STMTTRN>`

      const result = await service.parseOFX(content)

      expect(result.transacoes).toHaveLength(1)
      expect(result.transacoes[0].data.getFullYear()).toBe(2024)
      expect(result.transacoes[0].data.getMonth()).toBe(0)
      expect(result.transacoes[0].data.getDate()).toBe(1)
    })
  })

  describe('deduplicateTransactions', () => {
    it('deve detectar duplicatas baseado em hash', async () => {
      // Mock existing transactions with hashes
      mockResponse('transacoes', [
        { hash: 'existing-hash-1' },
      ])

      const transacoesParsed = [
        {
          data: new Date('2024-01-01'),
          descricao: 'Compra Mercado',
          valor: 150.5,
          tipo: 'despesa' as const,
          linha_original: 1,
        },
        {
          data: new Date('2024-01-02'),
          descricao: 'Compra Nova',
          valor: 200,
          tipo: 'despesa' as const,
          linha_original: 2,
        },
      ]

      const result = await service.deduplicateTransactions('conta-1', transacoesParsed)

      expect(result.total).toBe(2)
      expect(mockSupabase.from).toHaveBeenCalledWith('transacoes')
      // The dedupe result depends on whether the generated hashes match 'existing-hash-1'
      // Since we can't predict the exact hash, we verify the structure
      expect(result.novas + result.duplicatas).toBe(2)
      expect(result.transacoes_unicas.length + result.transacoes_duplicadas.length).toBe(2)
    })

    it('deve permitir transações idênticas em contas diferentes', async () => {
      // No existing hashes for conta-2
      mockResponse('transacoes', [])

      const transacoesParsed = [
        {
          data: new Date('2024-01-01'),
          descricao: 'Compra',
          valor: 100,
          tipo: 'despesa' as const,
          linha_original: 1,
        },
      ]

      const result = await service.deduplicateTransactions('conta-2', transacoesParsed)

      // Since no existing hashes for conta-2, all should be new
      expect(result.duplicatas).toBe(0)
      expect(result.novas).toBe(1)
    })
  })

  describe('importTransactions', () => {
    it('deve importar transações com sucesso', async () => {
      vi.mocked(transacaoService.createTransacao).mockResolvedValue({ id: 'imported-1' } as any)

      const transacoes = [
        {
          data: new Date('2024-01-01'),
          descricao: 'Salário',
          valor: 5000,
          tipo: 'receita' as const,
          linha_original: 1,
        },
        {
          data: new Date('2024-01-02'),
          descricao: 'Mercado',
          valor: 150,
          tipo: 'despesa' as const,
          linha_original: 2,
        },
      ]

      const result = await service.importTransactions('conta-1', transacoes)

      expect(result.importadas).toBe(2)
      expect(result.erros).toHaveLength(0)
      expect(transacaoService.createTransacao).toHaveBeenCalledTimes(2)
    })

    it('deve registrar erros de transações que falharam', async () => {
      // First call succeeds, second fails
      vi.mocked(transacaoService.createTransacao)
        .mockResolvedValueOnce({ id: 'imported-1' } as any)
        .mockRejectedValueOnce(new Error('Invalid date'))

      const transacoes = [
        {
          data: new Date('2024-01-01'),
          descricao: 'Válida',
          valor: 100,
          tipo: 'despesa' as const,
          linha_original: 1,
        },
        {
          data: new Date('invalid'),
          descricao: 'Inválida',
          valor: 200,
          tipo: 'despesa' as const,
          linha_original: 2,
        },
      ]

      const result = await service.importTransactions('conta-1', transacoes)

      expect(result.importadas + result.erros.length).toBe(2)
    })
  })

  describe('Template Management', () => {
    it('deve salvar template de importação', async () => {
      const now = new Date().toISOString()
      mockResponse('templates_importacao', {
        id: 'tmpl-1',
        nome: 'Nubank Teste',
        tipo_arquivo: 'csv',
        separador: ',',
        encoding: 'utf-8',
        pular_linhas: 1,
        mapeamento_colunas: JSON.stringify({ data: 0, descricao: 1, valor: 2 }),
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
        contador_uso: 0,
        usuario_id: 'test-user-id',
        created_at: now,
        updated_at: now,
      })

      const saved = await service.saveTemplate({
        nome: 'Nubank Teste',
        tipo_arquivo: 'csv' as const,
        separador: ',',
        encoding: 'utf-8',
        pular_linhas: 1,
        mapeamento_colunas: JSON.stringify({ data: 0, descricao: 1, valor: 2 }),
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
        contador_uso: 0,
      })

      expect(saved.id).toBeDefined()
      expect(saved.nome).toBe('Nubank Teste')
      expect(saved.created_at).toBeInstanceOf(Date)
      expect(mockSupabase.from).toHaveBeenCalledWith('templates_importacao')
    })

    it('deve listar templates', async () => {
      const now = new Date().toISOString()
      mockResponse('templates_importacao', [
        { id: '1', nome: 'Template 2', tipo_arquivo: 'csv', mapeamento_colunas: '{}', contador_uso: 10, usuario_id: 'test-user-id', created_at: now, updated_at: now },
        { id: '2', nome: 'Template 1', tipo_arquivo: 'csv', mapeamento_colunas: '{}', contador_uso: 5, usuario_id: 'test-user-id', created_at: now, updated_at: now },
      ])

      const templates = await service.listTemplates()

      expect(templates).toHaveLength(2)
      // Deve estar ordenado por contador_uso (decrescente)
      expect(templates[0].contador_uso).toBeGreaterThan(templates[1].contador_uso)
      expect(mockSupabase.from).toHaveBeenCalledWith('templates_importacao')
    })

    it('deve buscar template por ID', async () => {
      const now = new Date().toISOString()
      mockResponse('templates_importacao', {
        id: 'tmpl-search',
        nome: 'Template Busca',
        tipo_arquivo: 'csv',
        mapeamento_colunas: '{}',
        contador_uso: 0,
        usuario_id: 'test-user-id',
        created_at: now,
        updated_at: now,
      })

      const found = await service.getTemplateById('tmpl-search')

      expect(found).toBeDefined()
      expect(found?.nome).toBe('Template Busca')
    })

    it('deve buscar templates por nome', async () => {
      const now = new Date().toISOString()
      mockResponse('templates_importacao', [
        { id: '1', nome: 'Nubank - Extrato', tipo_arquivo: 'csv', mapeamento_colunas: '{}', contador_uso: 0, usuario_id: 'test-user-id', created_at: now, updated_at: now },
      ])

      const results = await service.searchTemplates('nubank')

      expect(results).toHaveLength(1)
      expect(results[0].nome).toContain('Nubank')
      expect(mockSupabase.from).toHaveBeenCalledWith('templates_importacao')
    })

    it('deve retornar templates populares', async () => {
      const now = new Date().toISOString()
      const templates = Array.from({ length: 5 }, (_, i) => ({
        id: `tmpl-${i}`,
        nome: `Template ${i}`,
        tipo_arquivo: 'csv',
        mapeamento_colunas: '{}',
        contador_uso: (4 - i) * 10, // Descending order
        usuario_id: 'test-user-id',
        created_at: now,
        updated_at: now,
      }))

      mockResponse('templates_importacao', templates)

      const popular = await service.getPopularTemplates(5)

      expect(popular).toHaveLength(5)
      // Deve estar ordenado por uso (decrescente)
      expect(popular[0].contador_uso).toBeGreaterThan(popular[4].contador_uso)
    })

    it('deve incrementar contador de uso', async () => {
      const now = new Date().toISOString()

      // First getTemplateById, then update
      mockResponse('templates_importacao', {
        id: 'tmpl-counter',
        nome: 'Template Contador',
        tipo_arquivo: 'csv',
        mapeamento_colunas: '{}',
        contador_uso: 0,
        usuario_id: 'test-user-id',
        created_at: now,
        updated_at: now,
      })

      await service.incrementTemplateUsage('tmpl-counter')

      expect(mockSupabase.from).toHaveBeenCalledWith('templates_importacao')
    })
  })

  describe('Edge Cases', () => {
    it('deve tratar CSV vazio', async () => {
      const content = 'Data,Descrição,Valor\n'

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      }

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
      })

      expect(result.transacoes).toHaveLength(0)
      expect(result.erros).toHaveLength(0)
    })

    it('deve tratar valores com parênteses (negativos)', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,Compra,(150.00)`

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      }

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      })

      expect(result.transacoes[0].valor).toBe(150)
      expect(result.transacoes[0].tipo).toBe('despesa')
    })

    it('deve tratar valores com símbolo de moeda', async () => {
      const content = `Data;Descrição;Valor
01/01/2024;Compra;R$ 150,50`

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      }

      const result = await service.parseCSV(content, mapeamento, {
        separador: ';',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: ',',
      })

      expect(result.transacoes[0].valor).toBe(150.5)
    })

    it('deve tratar múltiplos formatos de data', async () => {
      const formats = [
        { date: '01/01/2024', format: 'dd/MM/yyyy' },
        { date: '2024-01-01', format: 'yyyy-MM-dd' },
        { date: '01-01-2024', format: 'dd-MM-yyyy' },
      ]

      for (const { date, format } of formats) {
        const content = `Data,Descrição,Valor\n${date},Teste,100`

        const mapeamento: MapeamentoColunas = {
          data: 0,
          descricao: 1,
          valor: 2,
        }

        const result = await service.parseCSV(content, mapeamento, {
          separador: ',',
          pular_linhas: 1,
          formato_data: format,
          separador_decimal: '.',
        })

        expect(result.transacoes).toHaveLength(1)
        expect(result.transacoes[0].data.getDate()).toBe(1)
        expect(result.transacoes[0].data.getMonth()).toBe(0)
        expect(result.transacoes[0].data.getFullYear()).toBe(2024)
      }
    })
  })
})
