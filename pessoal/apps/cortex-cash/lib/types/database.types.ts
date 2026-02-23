/**
 * Supabase Database Types — schema cortex_cash
 *
 * Generated manually from supabase/migrations/001_initial_schema.sql
 * TODO: Replace with auto-generated types when Supabase CLI access is configured:
 *   supabase gen types typescript --project-id prvxkdzmlemyhzarilhr --schema cortex_cash
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  cortex_cash: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nome: string
          avatar_url: string | null
          telefone: string | null
          data_nascimento: string | null
          cpf: string | null
          biografia: string | null
          tema_preferido: string
          moeda_preferida: string
          idioma_preferido: string
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['profiles']['Insert']>
      }
      instituicoes: {
        Row: {
          id: string
          nome: string
          codigo: string | null
          logo_url: string | null
          cor: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['instituicoes']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['instituicoes']['Insert']>
      }
      contas: {
        Row: {
          id: string
          usuario_id: string
          instituicao_id: string
          nome: string
          tipo: 'corrente' | 'poupanca' | 'investimento' | 'carteira'
          agencia: string | null
          numero: string | null
          saldo_referencia: number
          data_referencia: string
          saldo_atual: number
          ativa: boolean
          cor: string | null
          icone: string | null
          observacoes: string | null
          conta_pai_id: string | null
          pluggy_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['contas']['Row'], 'id' | 'created_at' | 'updated_at' | 'saldo_referencia' | 'saldo_atual' | 'ativa'> & {
          id?: string
          saldo_referencia?: number
          saldo_atual?: number
          ativa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['contas']['Insert']>
      }
      categorias: {
        Row: {
          id: string
          usuario_id: string | null
          nome: string
          tipo: 'receita' | 'despesa' | 'transferencia'
          grupo: string | null
          pai_id: string | null
          icone: string | null
          cor: string | null
          ordem: number
          ativa: boolean
          is_sistema: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['categorias']['Row'], 'id' | 'created_at' | 'updated_at' | 'ordem' | 'ativa' | 'is_sistema'> & {
          id?: string
          ordem?: number
          ativa?: boolean
          is_sistema?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['categorias']['Insert']>
      }
      tags: {
        Row: {
          id: string
          usuario_id: string | null
          nome: string
          cor: string | null
          tipo: 'sistema' | 'customizada'
          is_sistema: boolean
          created_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['tags']['Row'], 'id' | 'created_at' | 'tipo' | 'is_sistema'> & {
          id?: string
          tipo?: 'sistema' | 'customizada'
          is_sistema?: boolean
          created_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['tags']['Insert']>
      }
      centros_custo: {
        Row: {
          id: string
          usuario_id: string
          nome: string
          descricao: string | null
          cor: string | null
          icone: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['centros_custo']['Row'], 'id' | 'created_at' | 'updated_at' | 'ativo'> & {
          id?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['centros_custo']['Insert']>
      }
      transacoes: {
        Row: {
          id: string
          usuario_id: string
          conta_id: string
          categoria_id: string | null
          centro_custo_id: string | null
          data: string
          descricao: string
          valor: number
          tipo: 'receita' | 'despesa' | 'transferencia'
          observacoes: string | null
          tags: Json | null
          transferencia_id: string | null
          conta_destino_id: string | null
          parcelado: boolean
          parcela_numero: number | null
          parcela_total: number | null
          grupo_parcelamento_id: string | null
          classificacao_confirmada: boolean
          classificacao_origem: 'manual' | 'regra' | 'ia' | null
          classificacao_confianca: number | null
          hash: string | null
          origem_arquivo: string | null
          origem_linha: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['transacoes']['Row'], 'id' | 'created_at' | 'updated_at' | 'parcelado' | 'classificacao_confirmada'> & {
          id?: string
          parcelado?: boolean
          classificacao_confirmada?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['transacoes']['Insert']>
      }
      templates_importacao: {
        Row: {
          id: string
          usuario_id: string | null
          instituicao_id: string | null
          nome: string
          tipo_arquivo: 'csv' | 'ofx' | 'excel'
          separador: string | null
          encoding: string
          pular_linhas: number
          mapeamento_colunas: Json
          formato_data: string
          separador_decimal: string
          ultima_utilizacao: string | null
          contador_uso: number
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['templates_importacao']['Row'], 'id' | 'created_at' | 'updated_at' | 'encoding' | 'pular_linhas' | 'formato_data' | 'separador_decimal' | 'contador_uso' | 'is_favorite'> & {
          id?: string
          encoding?: string
          pular_linhas?: number
          formato_data?: string
          separador_decimal?: string
          contador_uso?: number
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['templates_importacao']['Insert']>
      }
      regras_classificacao: {
        Row: {
          id: string
          usuario_id: string
          categoria_id: string
          nome: string
          tipo_regra: 'contains' | 'starts_with' | 'ends_with' | 'regex'
          padrao: string
          prioridade: number
          ativa: boolean
          total_aplicacoes: number
          ultima_aplicacao: string | null
          total_confirmacoes: number
          total_rejeicoes: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['regras_classificacao']['Row'], 'id' | 'created_at' | 'updated_at' | 'prioridade' | 'ativa' | 'total_aplicacoes' | 'total_confirmacoes' | 'total_rejeicoes'> & {
          id?: string
          prioridade?: number
          ativa?: boolean
          total_aplicacoes?: number
          total_confirmacoes?: number
          total_rejeicoes?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['regras_classificacao']['Insert']>
      }
      logs_ia: {
        Row: {
          id: string
          transacao_id: string | null
          prompt: string
          resposta: string
          modelo: string
          tokens_prompt: number
          tokens_resposta: number
          tokens_total: number
          custo_usd: number
          categoria_sugerida_id: string | null
          confianca: number | null
          confirmada: boolean
          created_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['logs_ia']['Row'], 'id' | 'created_at' | 'confirmada'> & {
          id?: string
          confirmada?: boolean
          created_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['logs_ia']['Insert']>
      }
      orcamentos: {
        Row: {
          id: string
          usuario_id: string
          nome: string
          tipo: 'categoria' | 'centro_custo'
          categoria_id: string | null
          centro_custo_id: string | null
          mes_referencia: string
          valor_planejado: number
          valor_realizado: number
          alerta_80: boolean
          alerta_100: boolean
          alerta_80_enviado: boolean
          alerta_100_enviado: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['orcamentos']['Row'], 'id' | 'created_at' | 'updated_at' | 'valor_realizado' | 'alerta_80' | 'alerta_100' | 'alerta_80_enviado' | 'alerta_100_enviado'> & {
          id?: string
          valor_realizado?: number
          alerta_80?: boolean
          alerta_100?: boolean
          alerta_80_enviado?: boolean
          alerta_100_enviado?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['orcamentos']['Insert']>
      }
      cartoes_config: {
        Row: {
          id: string
          usuario_id: string
          instituicao_id: string
          conta_pagamento_id: string | null
          nome: string
          ultimos_digitos: string | null
          bandeira: 'visa' | 'mastercard' | 'elo' | 'amex' | null
          limite_total: number
          dia_fechamento: number
          dia_vencimento: number
          ativo: boolean
          cor: string | null
          pluggy_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['cartoes_config']['Row'], 'id' | 'created_at' | 'updated_at' | 'ativo'> & {
          id?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['cartoes_config']['Insert']>
      }
      faturas: {
        Row: {
          id: string
          usuario_id: string
          cartao_id: string
          mes_referencia: string
          data_fechamento: string
          data_vencimento: string
          valor_total: number
          valor_minimo: number
          valor_pago: number
          status: 'aberta' | 'fechada' | 'paga' | 'atrasada'
          fechada_automaticamente: boolean
          data_pagamento: string | null
          transacao_pagamento_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['faturas']['Row'], 'id' | 'created_at' | 'updated_at' | 'valor_total' | 'valor_minimo' | 'valor_pago' | 'status' | 'fechada_automaticamente'> & {
          id?: string
          valor_total?: number
          valor_minimo?: number
          valor_pago?: number
          status?: 'aberta' | 'fechada' | 'paga' | 'atrasada'
          fechada_automaticamente?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['faturas']['Insert']>
      }
      faturas_lancamentos: {
        Row: {
          id: string
          fatura_id: string
          transacao_id: string | null
          data_compra: string
          descricao: string
          valor_brl: number
          parcela_numero: number | null
          parcela_total: number | null
          moeda_original: string | null
          valor_original: number | null
          taxa_cambio: number | null
          categoria_id: string | null
          created_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['faturas_lancamentos']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['faturas_lancamentos']['Insert']>
      }
      investimentos: {
        Row: {
          id: string
          usuario_id: string
          instituicao_id: string
          nome: string
          tipo: 'renda_fixa' | 'renda_variavel' | 'fundo_investimento' | 'previdencia' | 'criptomoeda' | 'outro'
          ticker: string | null
          valor_aplicado: number
          valor_atual: number
          quantidade: number | null
          data_aplicacao: string
          data_vencimento: string | null
          taxa_juros: number | null
          rentabilidade_contratada: number | null
          indexador: string | null
          status: 'ativo' | 'resgatado' | 'vencido'
          conta_origem_id: string | null
          observacoes: string | null
          cor: string | null
          pluggy_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['investimentos']['Row'], 'id' | 'created_at' | 'updated_at' | 'status'> & {
          id?: string
          status?: 'ativo' | 'resgatado' | 'vencido'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['investimentos']['Insert']>
      }
      historico_investimentos: {
        Row: {
          id: string
          investimento_id: string
          data: string
          valor: number
          quantidade: number | null
          tipo_movimentacao: 'aporte' | 'resgate' | 'rendimento' | 'ajuste'
          observacoes: string | null
          created_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['historico_investimentos']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['historico_investimentos']['Insert']>
      }
      patrimonio_snapshots: {
        Row: {
          id: string
          usuario_id: string
          mes: string
          saldo_contas: number
          saldo_investimentos: number
          patrimonio_total: number
          created_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['patrimonio_snapshots']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['patrimonio_snapshots']['Insert']>
      }
      declaracoes_ir: {
        Row: {
          id: string
          usuario_id: string
          ano_calendario: string
          ano_exercicio: string
          tipo: 'completa' | 'simplificada'
          status: 'rascunho' | 'finalizada' | 'enviada' | 'processada'
          data_envio: string | null
          recibo: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['declaracoes_ir']['Row'], 'id' | 'created_at' | 'updated_at' | 'status'> & {
          id?: string
          status?: 'rascunho' | 'finalizada' | 'enviada' | 'processada'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['declaracoes_ir']['Insert']>
      }
      cenarios: {
        Row: {
          id: string
          usuario_id: string
          nome: string
          descricao: string | null
          tipo: 'base' | 'personalizado'
          horizonte_anos: number
          data_inicio: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['cenarios']['Row'], 'id' | 'created_at' | 'updated_at' | 'tipo'> & {
          id?: string
          tipo?: 'base' | 'personalizado'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['cenarios']['Insert']>
      }
      objetivos_financeiros: {
        Row: {
          id: string
          cenario_id: string
          nome: string
          valor_alvo: number
          data_alvo: string
          categoria: 'casa' | 'viagem' | 'educacao' | 'aposentadoria' | 'carro' | 'outro'
          prioridade: 'alta' | 'media' | 'baixa'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['cortex_cash']['Tables']['objetivos_financeiros']['Row'], 'id' | 'created_at' | 'updated_at' | 'prioridade'> & {
          id?: string
          prioridade?: 'alta' | 'media' | 'baixa'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['cortex_cash']['Tables']['objetivos_financeiros']['Insert']>
      }
    }
  }
}

// Convenience type aliases for common row types
export type Profile = Database['cortex_cash']['Tables']['profiles']['Row']
export type Instituicao = Database['cortex_cash']['Tables']['instituicoes']['Row']
export type Conta = Database['cortex_cash']['Tables']['contas']['Row']
export type Categoria = Database['cortex_cash']['Tables']['categorias']['Row']
export type Tag = Database['cortex_cash']['Tables']['tags']['Row']
export type CentroCusto = Database['cortex_cash']['Tables']['centros_custo']['Row']
export type Transacao = Database['cortex_cash']['Tables']['transacoes']['Row']
export type TemplateImportacao = Database['cortex_cash']['Tables']['templates_importacao']['Row']
export type RegraClassificacao = Database['cortex_cash']['Tables']['regras_classificacao']['Row']
export type LogIA = Database['cortex_cash']['Tables']['logs_ia']['Row']
export type Orcamento = Database['cortex_cash']['Tables']['orcamentos']['Row']
export type CartaoConfig = Database['cortex_cash']['Tables']['cartoes_config']['Row']
export type Fatura = Database['cortex_cash']['Tables']['faturas']['Row']
export type FaturaLancamento = Database['cortex_cash']['Tables']['faturas_lancamentos']['Row']
export type Investimento = Database['cortex_cash']['Tables']['investimentos']['Row']
export type HistoricoInvestimento = Database['cortex_cash']['Tables']['historico_investimentos']['Row']
export type PatrimonioSnapshot = Database['cortex_cash']['Tables']['patrimonio_snapshots']['Row']
export type DeclaracaoIR = Database['cortex_cash']['Tables']['declaracoes_ir']['Row']
export type Cenario = Database['cortex_cash']['Tables']['cenarios']['Row']
export type ObjetivoFinanceiro = Database['cortex_cash']['Tables']['objetivos_financeiros']['Row']
