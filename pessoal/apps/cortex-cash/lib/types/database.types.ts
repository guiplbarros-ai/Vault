/**
 * Supabase Database Types — schema vault_one
 *
 * Manually maintained from supabase/migrations/001_initial_schema.sql
 * Covers all 26 tables. Run this to auto-generate when CLI is available:
 *   supabase gen types typescript --project-id prvxkdzmlemyhzarilhr --schema vault_one
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  vault_one: {
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
        Insert: Omit<Database['vault_one']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['profiles']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['instituicoes']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['instituicoes']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['contas']['Row'], 'id' | 'created_at' | 'updated_at' | 'saldo_referencia' | 'saldo_atual' | 'ativa'> & {
          id?: string
          saldo_referencia?: number
          saldo_atual?: number
          ativa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['contas']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['categorias']['Row'], 'id' | 'created_at' | 'updated_at' | 'ordem' | 'ativa' | 'is_sistema'> & {
          id?: string
          ordem?: number
          ativa?: boolean
          is_sistema?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['categorias']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['tags']['Row'], 'id' | 'created_at' | 'tipo' | 'is_sistema'> & {
          id?: string
          tipo?: 'sistema' | 'customizada'
          is_sistema?: boolean
          created_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['tags']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['centros_custo']['Row'], 'id' | 'created_at' | 'updated_at' | 'ativo'> & {
          id?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['centros_custo']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['transacoes']['Row'], 'id' | 'created_at' | 'updated_at' | 'parcelado' | 'classificacao_confirmada'> & {
          id?: string
          parcelado?: boolean
          classificacao_confirmada?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['transacoes']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['templates_importacao']['Row'], 'id' | 'created_at' | 'updated_at' | 'encoding' | 'pular_linhas' | 'formato_data' | 'separador_decimal' | 'contador_uso' | 'is_favorite'> & {
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
        Update: Partial<Database['vault_one']['Tables']['templates_importacao']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['regras_classificacao']['Row'], 'id' | 'created_at' | 'updated_at' | 'prioridade' | 'ativa' | 'total_aplicacoes' | 'total_confirmacoes' | 'total_rejeicoes'> & {
          id?: string
          prioridade?: number
          ativa?: boolean
          total_aplicacoes?: number
          total_confirmacoes?: number
          total_rejeicoes?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['regras_classificacao']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['logs_ia']['Row'], 'id' | 'created_at' | 'confirmada'> & {
          id?: string
          confirmada?: boolean
          created_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['logs_ia']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['orcamentos']['Row'], 'id' | 'created_at' | 'updated_at' | 'valor_realizado' | 'alerta_80' | 'alerta_100' | 'alerta_80_enviado' | 'alerta_100_enviado'> & {
          id?: string
          valor_realizado?: number
          alerta_80?: boolean
          alerta_100?: boolean
          alerta_80_enviado?: boolean
          alerta_100_enviado?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['orcamentos']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['cartoes_config']['Row'], 'id' | 'created_at' | 'updated_at' | 'ativo'> & {
          id?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['cartoes_config']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['faturas']['Row'], 'id' | 'created_at' | 'updated_at' | 'valor_total' | 'valor_minimo' | 'valor_pago' | 'status' | 'fechada_automaticamente'> & {
          id?: string
          valor_total?: number
          valor_minimo?: number
          valor_pago?: number
          status?: 'aberta' | 'fechada' | 'paga' | 'atrasada'
          fechada_automaticamente?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['faturas']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['faturas_lancamentos']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['faturas_lancamentos']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['investimentos']['Row'], 'id' | 'created_at' | 'updated_at' | 'status'> & {
          id?: string
          status?: 'ativo' | 'resgatado' | 'vencido'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['investimentos']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['historico_investimentos']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['historico_investimentos']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['patrimonio_snapshots']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['patrimonio_snapshots']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['declaracoes_ir']['Row'], 'id' | 'created_at' | 'updated_at' | 'status'> & {
          id?: string
          status?: 'rascunho' | 'finalizada' | 'enviada' | 'processada'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['declaracoes_ir']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['cenarios']['Row'], 'id' | 'created_at' | 'updated_at' | 'tipo'> & {
          id?: string
          tipo?: 'base' | 'personalizado'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['cenarios']['Insert']>
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
        Insert: Omit<Database['vault_one']['Tables']['objetivos_financeiros']['Row'], 'id' | 'created_at' | 'updated_at' | 'prioridade'> & {
          id?: string
          prioridade?: 'alta' | 'media' | 'baixa'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['objetivos_financeiros']['Insert']>
      }
      configuracoes_comportamento: {
        Row: {
          id: string
          cenario_id: string
          tipo: 'receita' | 'despesa' | 'investimento' | 'evento_unico'
          categoria_id: string | null
          modo: 'manter_padrao' | 'percentual' | 'valor_fixo' | 'zerar'
          percentual_mudanca: number | null
          valor_fixo: number | null
          data_aplicacao: string | null
          percentual_saving: number | null
          taxa_retorno_mensal: number | null
          evento_descricao: string | null
          evento_valor: number | null
          evento_data: string | null
          evento_tipo: 'receita' | 'despesa' | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['vault_one']['Tables']['configuracoes_comportamento']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['configuracoes_comportamento']['Insert']>
      }
      rendimentos_tributaveis: {
        Row: {
          id: string
          declaracao_id: string
          tipo: 'salario' | 'prolabore' | 'aposentadoria' | 'aluguel' | 'outro'
          fonte_pagadora_nome: string
          fonte_pagadora_cnpj: string | null
          valor_bruto: number
          imposto_retido: number
          inss_retido: number
          contribuicao_previdenciaria: number
          pensao_alimenticia_paga: number
          mes_inicio: number
          mes_fim: number
          observacoes: string | null
          created_at: string
        }
        Insert: Omit<Database['vault_one']['Tables']['rendimentos_tributaveis']['Row'], 'id' | 'created_at' | 'imposto_retido' | 'inss_retido' | 'contribuicao_previdenciaria' | 'pensao_alimenticia_paga'> & {
          id?: string
          imposto_retido?: number
          inss_retido?: number
          contribuicao_previdenciaria?: number
          pensao_alimenticia_paga?: number
          created_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['rendimentos_tributaveis']['Insert']>
      }
      rendimentos_isentos: {
        Row: {
          id: string
          declaracao_id: string
          tipo: 'poupanca' | 'indenizacao' | 'doacao' | 'heranca' | 'seguro_vida' | 'outro'
          descricao: string
          valor: number
          observacoes: string | null
          created_at: string
        }
        Insert: Omit<Database['vault_one']['Tables']['rendimentos_isentos']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['rendimentos_isentos']['Insert']>
      }
      despesas_dedutiveis: {
        Row: {
          id: string
          declaracao_id: string
          tipo: 'saude' | 'educacao' | 'previdencia_privada' | 'pensao_alimenticia'
          beneficiario_nome: string
          beneficiario_cpf: string | null
          prestador_nome: string
          prestador_cnpj: string | null
          valor: number
          data_pagamento: string
          observacoes: string | null
          created_at: string
        }
        Insert: Omit<Database['vault_one']['Tables']['despesas_dedutiveis']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['despesas_dedutiveis']['Insert']>
      }
      bens_direitos: {
        Row: {
          id: string
          declaracao_id: string
          codigo_receita: string
          tipo: 'imovel' | 'veiculo' | 'investimento' | 'outros'
          descricao: string
          valor_inicial: number
          valor_final: number
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['vault_one']['Tables']['bens_direitos']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['bens_direitos']['Insert']>
      }
      dividas_onus: {
        Row: {
          id: string
          declaracao_id: string
          tipo: 'financiamento' | 'emprestimo' | 'cartao_credito' | 'outros'
          credor_nome: string
          credor_cnpj: string | null
          valor_inicial: number
          valor_final: number
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['vault_one']['Tables']['dividas_onus']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['vault_one']['Tables']['dividas_onus']['Insert']>
      }
    }
  }
}

// Convenience type aliases for common row types
export type Profile = Database['vault_one']['Tables']['profiles']['Row']
export type Instituicao = Database['vault_one']['Tables']['instituicoes']['Row']
export type Conta = Database['vault_one']['Tables']['contas']['Row']
export type Categoria = Database['vault_one']['Tables']['categorias']['Row']
export type Tag = Database['vault_one']['Tables']['tags']['Row']
export type CentroCusto = Database['vault_one']['Tables']['centros_custo']['Row']
export type Transacao = Database['vault_one']['Tables']['transacoes']['Row']
export type TemplateImportacao = Database['vault_one']['Tables']['templates_importacao']['Row']
export type RegraClassificacao = Database['vault_one']['Tables']['regras_classificacao']['Row']
export type LogIA = Database['vault_one']['Tables']['logs_ia']['Row']
export type Orcamento = Database['vault_one']['Tables']['orcamentos']['Row']
export type CartaoConfig = Database['vault_one']['Tables']['cartoes_config']['Row']
export type Fatura = Database['vault_one']['Tables']['faturas']['Row']
export type FaturaLancamento = Database['vault_one']['Tables']['faturas_lancamentos']['Row']
export type Investimento = Database['vault_one']['Tables']['investimentos']['Row']
export type HistoricoInvestimento = Database['vault_one']['Tables']['historico_investimentos']['Row']
export type PatrimonioSnapshot = Database['vault_one']['Tables']['patrimonio_snapshots']['Row']
export type DeclaracaoIR = Database['vault_one']['Tables']['declaracoes_ir']['Row']
export type Cenario = Database['vault_one']['Tables']['cenarios']['Row']
export type ObjetivoFinanceiro = Database['vault_one']['Tables']['objetivos_financeiros']['Row']
export type ConfiguracaoComportamento = Database['vault_one']['Tables']['configuracoes_comportamento']['Row']
export type RendimentoTributavel = Database['vault_one']['Tables']['rendimentos_tributaveis']['Row']
export type RendimentoIsento = Database['vault_one']['Tables']['rendimentos_isentos']['Row']
export type DespesaDedutivel = Database['vault_one']['Tables']['despesas_dedutiveis']['Row']
export type BemDireito = Database['vault_one']['Tables']['bens_direitos']['Row']
export type DividaOnus = Database['vault_one']['Tables']['dividas_onus']['Row']
