import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Type exports for tables
export type Database = {
  public: {
    Tables: {
      user_profile: {
        Row: {
          id: string
          user_id: string
          nome: string | null
          email: string
          moeda_padrao: string
          fuso_horario: string
          modo_tema: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profile']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profile']['Insert']>
      }
      instituicao: {
        Row: {
          id: string
          user_id: string
          nome: string
          tipo: 'banco' | 'cartao' | 'corretora'
          created_at: string
        }
      }
      conta: {
        Row: {
          id: string
          user_id: string
          instituicao_id: string
          apelido: string
          tipo: 'corrente' | 'poupanca' | 'cartao' | 'corretora' | 'investimento'
          moeda: string
          ativa: boolean
          created_at: string
        }
      }
      transacao: {
        Row: {
          id: string
          user_id: string
          conta_id: string
          data: string
          descricao: string
          valor: number
          tipo: string | null
          categoria_id: string | null
          id_externo: string | null
          saldo_apos: number | null
          hash_dedupe: string
          parcela_n: number | null
          parcelas_total: number | null
          link_original_id: string | null
          valor_original: number | null
          moeda_original: string | null
          created_at: string
        }
      }
      categoria: {
        Row: {
          id: string
          user_id: string
          grupo: string
          nome: string
          ativa: boolean
          ordem: number
          created_at: string
        }
      }
      orcamento: {
        Row: {
          id: string
          user_id: string
          mes: string
          categoria_id: string
          valor_alvo: number
          created_at: string
        }
      }
    }
  }
}
