/**
 * Serviço de Importação
 * Agent IMPORT: Owner
 *
 * Gerencia importação de transações de diferentes formatos (CSV, OFX, Excel)
 */

import { escapeLikePattern } from '../api/sanitize'
import { getSupabase } from '../db/supabase'
import { DatabaseError, ValidationError } from '../errors'
import { generateTransactionHash } from '../import/dedupe'
import { parseOFX as parseOFXStandalone } from '../import/parsers/ofx'
import type {
  DedupeResult,
  FileFormat,
  MapeamentoColunas,
  ParseConfig,
  ParseError,
  ParseResult,
  ParsedTransacao,
  TemplateImportacao,
} from '../types'
import { transacaoService } from './transacao.service'

async function getUserId(): Promise<string> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function rowToTemplate(row: Record<string, unknown>): TemplateImportacao {
  return {
    id: row.id as string,
    nome: row.nome as string,
    instituicao_id: row.instituicao_id as string | undefined,
    tipo_arquivo: (row.formato ?? row.tipo_arquivo) as TemplateImportacao['tipo_arquivo'],
    mapeamento_colunas: (typeof row.mapeamento_colunas === 'string' ? row.mapeamento_colunas : JSON.stringify(row.mapeamento_colunas)) as string,
    contador_uso: row.contador_uso as number,
    ultima_utilizacao: row.ultima_utilizacao ? new Date(row.ultima_utilizacao as string) : undefined,
    is_favorite: row.is_favorite as boolean | undefined,
    usuario_id: row.usuario_id as string | undefined,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  }
}

export class ImportService {
  /**
   * Detecta o formato do arquivo baseado no conteúdo
   */
  async detectFormat(fileContent: string): Promise<FileFormat> {
    const lines = fileContent
      .split('\n')
      .filter((l) => l.trim())
      .slice(0, 10) // Primeiras 10 linhas não-vazias
    const firstLine = lines[0]?.trim() || ''

    // Detectar OFX
    if (firstLine.includes('<?OFX') || firstLine.includes('<OFX>')) {
      return {
        tipo: 'ofx',
        confianca: 0.99,
        detectado: {
          encoding: 'utf-8',
        },
      }
    }

    // Detectar CSV - com validação mais robusta
    const separadores = [';', ',', '\t', '|'] // Prioridade: ; (Brasil)
    let melhorSeparador = ','
    let maxColunas = 0
    const colunasCount = new Map<string, number[]>()

    // Verifica todas as linhas para consistência
    for (const sep of separadores) {
      const counts = lines.map((line) => line.split(sep).length)
      colunasCount.set(sep, counts)

      // Prefere separador com contagem consistente de colunas
      const contagemModa = Math.max(...counts)
      const consistencia = counts.filter((c) => c === contagemModa).length / counts.length

      if (contagemModa >= 3 && consistencia >= 0.7) {
        if (contagemModa > maxColunas || (contagemModa === maxColunas && sep === ';')) {
          maxColunas = contagemModa
          melhorSeparador = sep
        }
      }
    }

    if (maxColunas >= 3) {
      const headers = firstLine.split(melhorSeparador).map((h) => h.trim())

      return {
        tipo: 'csv',
        confianca: 0.9,
        detectado: {
          separador: melhorSeparador,
          encoding: 'utf-8',
          headers,
        },
      }
    }

    // Detectar Excel (por extensão, já que conteúdo binário)
    return {
      tipo: 'excel',
      confianca: 0.5,
      detectado: {
        encoding: 'utf-8',
      },
    }
  }

  /**
   * Parse CSV para transações
   */
  async parseCSV(
    fileContent: string,
    mapeamento: MapeamentoColunas,
    config: ParseConfig = {}
  ): Promise<ParseResult> {
    const erros: ParseError[] = []
    const transacoes: ParsedTransacao[] = []

    const {
      separador = ',',
      pular_linhas = 1,
      formato_data = 'dd/MM/yyyy',
      separador_decimal = ',',
    } = config

    try {
      const lines = fileContent.split('\n')
      const linhasProcessar = lines.slice(pular_linhas)

      for (let i = 0; i < linhasProcessar.length; i++) {
        const linha = linhasProcessar[i]!.trim()
        const numeroLinha = i + pular_linhas + 1

        if (!linha) continue

        try {
          const colunas = this.parseCSVLine(linha, separador)

          const dataStr = colunas[mapeamento.data]?.trim()
          const descricao = colunas[mapeamento.descricao]?.trim()

          // Suportar tanto mapeamento.valor (coluna única) quanto credito/débito (colunas separadas)
          let valorStr: string | undefined
          if (mapeamento.valor !== undefined) {
            valorStr = colunas[mapeamento.valor]?.trim()
          } else if (mapeamento.credito !== undefined && mapeamento.debito !== undefined) {
            const creditoStr = colunas[mapeamento.credito]?.trim()
            const debitoStr = colunas[mapeamento.debito]?.trim()

            if (creditoStr && creditoStr !== '' && creditoStr !== '0') {
              valorStr = creditoStr
            } else if (debitoStr && debitoStr !== '' && debitoStr !== '0') {
              valorStr = debitoStr.startsWith('-') ? debitoStr : '-' + debitoStr
            }
          }

          if (!dataStr || !descricao || !valorStr) {
            erros.push({
              linha: numeroLinha,
              mensagem: 'Campos obrigatórios faltando (data, descrição ou valor)',
              valor_original: linha,
            })
            continue
          }

          // Parse data
          const data = this.parseDate(dataStr, formato_data)
          if (!data || isNaN(data.getTime())) {
            erros.push({
              linha: numeroLinha,
              campo: 'data',
              mensagem: `Data inválida: ${dataStr}`,
              valor_original: dataStr,
            })
            continue
          }

          // Parse valor
          const valor = this.parseValor(valorStr, separador_decimal)
          if (isNaN(valor)) {
            erros.push({
              linha: numeroLinha,
              campo: 'valor',
              mensagem: `Valor inválido: ${valorStr}`,
              valor_original: valorStr,
            })
            continue
          }

          // Determinar tipo baseado no valor
          const tipo = valor >= 0 ? 'receita' : 'despesa'

          // Observações (se mapeado)
          const observacoes =
            mapeamento.observacoes !== undefined
              ? colunas[mapeamento.observacoes]?.trim()
              : undefined

          const transacao: ParsedTransacao = {
            data,
            descricao,
            valor: Math.abs(valor),
            tipo,
            observacoes,
            linha_original: numeroLinha,
          }

          transacoes.push(transacao)
        } catch (error) {
          erros.push({
            linha: numeroLinha,
            mensagem:
              error instanceof Error ? error.message : 'Erro desconhecido ao processar linha',
            valor_original: linha,
          })
        }
      }

      const linhasValidas = transacoes.length
      const linhasInvalidas = erros.length

      return {
        success: linhasInvalidas === 0,
        transacoes,
        erros,
        resumo: {
          total_linhas: linhasProcessar.length,
          linhas_validas: linhasValidas,
          linhas_invalidas: linhasInvalidas,
          duplicatas: 0,
        },
      }
    } catch (error) {
      throw new ValidationError(
        `Erro ao fazer parse do CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      )
    }
  }

  /**
   * Parse OFX para transações — delegates to standalone parser
   */
  async parseOFX(fileContent: string): Promise<ParseResult> {
    return parseOFXStandalone(fileContent)
  }

  /**
   * Deduplica transações baseado em hash
   */
  async deduplicateTransactions(
    contaId: string,
    transacoesParsed: ParsedTransacao[]
  ): Promise<DedupeResult> {
    const supabase = getSupabase()

    // Buscar transações existentes da conta
    const { data: existentesData } = await supabase
      .from('transacoes')
      .select('hash')
      .eq('conta_id', contaId)
      .not('hash', 'is', null)

    const hashesExistentes = new Set(
      (existentesData || []).map((t: Record<string, unknown>) => t.hash as string)
    )

    const novas: ParsedTransacao[] = []
    const duplicadas: ParsedTransacao[] = []

    for (const transacao of transacoesParsed) {
      // Gerar hash canônico alinhado com createTransacao
      const hash = await generateTransactionHash(
        {
          data: transacao.data,
          descricao: transacao.descricao,
          valor: transacao.valor,
        },
        contaId
      )
      transacao.hash = hash

      // Verificar se já existe
      if (hashesExistentes.has(hash)) {
        duplicadas.push(transacao)
      } else {
        novas.push(transacao)
      }
    }

    return {
      total: transacoesParsed.length,
      duplicatas: duplicadas.length,
      novas: novas.length,
      transacoes_unicas: novas,
      transacoes_duplicadas: duplicadas,
    }
  }

  /**
   * Importa transações para o banco de dados
   */
  async importTransactions(
    contaId: string,
    transacoes: ParsedTransacao[]
  ): Promise<{ importadas: number; erros: ParseError[] }> {
    const erros: ParseError[] = []
    let importadas = 0

    try {
      for (const transacao of transacoes) {
        try {
          await transacaoService.createTransacao({
            conta_id: contaId,
            data: transacao.data,
            descricao: transacao.descricao,
            valor: transacao.tipo === 'despesa' ? -transacao.valor : transacao.valor,
            tipo: transacao.tipo || 'despesa',
            observacoes: transacao.observacoes,
          })
          importadas++
        } catch (error) {
          erros.push({
            linha: transacao.linha_original,
            mensagem: error instanceof Error ? error.message : 'Erro ao importar transação',
            valor_original: transacao.descricao,
          })
        }
      }

      return { importadas, erros }
    } catch (error) {
      throw new DatabaseError(
        `Erro ao importar transações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error as Error
      )
    }
  }

  /**
   * Salva template de importação
   */
  async saveTemplate(
    template: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TemplateImportacao> {
    const supabase = getSupabase()
    const userId = await getUserId()
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const { data: inserted, error } = await supabase
      .from('templates_importacao')
      .insert({
        id,
        ...template,
        usuario_id: userId,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw new DatabaseError('Erro ao salvar template', error as unknown as Error)

    return rowToTemplate(inserted)
  }

  /**
   * Lista templates de importação
   * Ordenados por contador de uso (mais usados primeiro)
   */
  async listTemplates(instituicaoId?: string): Promise<TemplateImportacao[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    let query = supabase
      .from('templates_importacao')
      .select('*')
      .eq('usuario_id', userId)
      .order('contador_uso', { ascending: false })

    if (instituicaoId) {
      query = query.eq('instituicao_id', instituicaoId)
    }

    const { data, error } = await query

    if (error) throw new DatabaseError('Erro ao listar templates', error as unknown as Error)

    return (data || []).map(rowToTemplate)
  }

  /**
   * Busca template por ID
   */
  async getTemplateById(templateId: string): Promise<TemplateImportacao | undefined> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('templates_importacao')
      .select('*')
      .eq('id', templateId)
      .maybeSingle()

    if (error) throw new DatabaseError('Erro ao buscar template', error as unknown as Error)

    return data ? rowToTemplate(data) : undefined
  }

  /**
   * Busca templates por nome (busca parcial)
   */
  async searchTemplates(query: string): Promise<TemplateImportacao[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('templates_importacao')
      .select('*')
      .eq('usuario_id', userId)
      .ilike('nome', `%${escapeLikePattern(query)}%`)
      .order('contador_uso', { ascending: false })

    if (error) throw new DatabaseError('Erro ao buscar templates', error as unknown as Error)

    return (data || []).map(rowToTemplate)
  }

  /**
   * Busca templates populares (top N mais usados)
   */
  async getPopularTemplates(limit = 5): Promise<TemplateImportacao[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('templates_importacao')
      .select('*')
      .eq('usuario_id', userId)
      .order('contador_uso', { ascending: false })
      .limit(limit)

    if (error) throw new DatabaseError('Erro ao buscar templates populares', error as unknown as Error)

    return (data || []).map(rowToTemplate)
  }

  /**
   * Atualiza contador de uso de template
   */
  async incrementTemplateUsage(templateId: string): Promise<void> {
    const supabase = getSupabase()

    const template = await this.getTemplateById(templateId)
    if (template) {
      await supabase
        .from('templates_importacao')
        .update({
          contador_uso: template.contador_uso + 1,
          ultima_utilizacao: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
    }
  }

  /**
   * Favorita/desfavorita um template
   */
  async toggleTemplateFavorite(templateId: string): Promise<boolean> {
    const supabase = getSupabase()

    const template = await this.getTemplateById(templateId)
    if (!template) throw new ValidationError('Template não encontrado')

    const newFavoriteState = !template.is_favorite

    await supabase
      .from('templates_importacao')
      .update({
        is_favorite: newFavoriteState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)

    return newFavoriteState
  }

  /**
   * Busca templates favoritos
   */
  async getFavoriteTemplates(): Promise<TemplateImportacao[]> {
    const supabase = getSupabase()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('templates_importacao')
      .select('*')
      .eq('usuario_id', userId)
      .eq('is_favorite', true)
      .order('nome', { ascending: true })

    if (error) throw new DatabaseError('Erro ao buscar templates favoritos', error as unknown as Error)

    return (data || []).map(rowToTemplate)
  }

  // ============================================================================
  // Métodos Auxiliares Privados
  // ============================================================================

  /**
   * Parse de linha CSV respeitando aspas
   */
  private parseCSVLine(line: string, separator: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === separator && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }

    result.push(current)
    return result.map((s) => s.trim().replace(/^"|"$/g, ''))
  }

  /**
   * Parse de data com múltiplos formatos
   */
  private parseDate(dateStr: string, formato: string): Date | null {
    try {
      // Formatos comuns brasileiros
      const formats = [
        /^(\d{2})\/(\d{2})\/(\d{4})$/, // dd/MM/yyyy
        /^(\d{4})-(\d{2})-(\d{2})$/, // yyyy-MM-dd
        /^(\d{2})-(\d{2})-(\d{4})$/, // dd-MM-yyyy
      ]

      for (const regex of formats) {
        const match = dateStr.match(regex)
        if (match) {
          if (formato === 'dd/MM/yyyy' || formato === 'dd-MM-yyyy') {
            const [, day, month, year] = match as [string, string, string, string]
            return new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
          } else {
            const [, year, month, day] = match as [string, string, string, string]
            return new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
          }
        }
      }

      // Fallback: tentar parse direto
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date
    } catch {
      return null
    }
  }

  /**
   * Parse de valor com diferentes separadores decimais
   */
  private parseValor(valorStr: string, separadorDecimal: string): number {
    let cleanStr = valorStr.replace(/\s/g, '').replace(/[R$]/g, '').replace(/[()]/g, '')

    const isNegative = valorStr.includes('(') && valorStr.includes(')')

    if (separadorDecimal === ',') {
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.')
    } else {
      cleanStr = cleanStr.replace(/,/g, '')
    }

    const valor = Number.parseFloat(cleanStr)
    return isNegative ? -Math.abs(valor) : valor
  }
}

// Singleton instance
export const importService = new ImportService()
