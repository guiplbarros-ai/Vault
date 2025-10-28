/**
 * Tipos compartilhados do Cortex Cash
 * Gerados a partir do schema do banco de dados
 *
 * Agent CORE: Owner deste arquivo
 * Outros agents: Podem sugerir mudanças via comentários
 */

// ============================================================================
// Tipos de Domínio
// ============================================================================

export type TipoTransacao = 'receita' | 'despesa' | 'transferencia';
export type TipoConta = 'corrente' | 'poupanca' | 'investimento' | 'carteira';
export type TipoArquivo = 'csv' | 'ofx' | 'excel';
export type TipoRegra = 'contains' | 'starts_with' | 'ends_with' | 'regex';
export type StatusFatura = 'aberta' | 'fechada' | 'paga' | 'atrasada';
export type Bandeira = 'visa' | 'mastercard' | 'elo' | 'amex';
export type OrigemClassificacao = 'manual' | 'regra' | 'ia';

// ============================================================================
// Entidades do Banco de Dados
// ============================================================================

export interface Instituicao {
  id: string;
  nome: string;
  codigo?: string;
  logo_url?: string;
  cor?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Conta {
  id: string;
  instituicao_id: string;
  nome: string;
  tipo: TipoConta;
  agencia?: string;
  numero?: string;
  saldo_inicial: number;
  saldo_atual: number;
  ativa: boolean;
  cor?: string;
  icone?: string;
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoTransacao;
  grupo?: string;
  icone?: string;
  cor?: string;
  ordem: number;
  ativa: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Transacao {
  id: string;
  conta_id: string;
  categoria_id?: string;
  data: Date;
  descricao: string;
  valor: number;
  tipo: TipoTransacao;
  observacoes?: string;
  tags?: string; // JSON array
  transferencia_id?: string;
  conta_destino_id?: string;
  parcelado: boolean;
  parcela_numero?: number;
  parcela_total?: number;
  grupo_parcelamento_id?: string;
  classificacao_confirmada: boolean;
  classificacao_origem?: OrigemClassificacao;
  classificacao_confianca?: number;
  hash?: string;
  origem_arquivo?: string;
  origem_linha?: number;
  created_at: Date;
  updated_at: Date;
}

export interface TemplateImportacao {
  id: string;
  instituicao_id?: string;
  nome: string;
  tipo_arquivo: TipoArquivo;
  separador?: string;
  encoding?: string;
  pular_linhas?: number;
  mapeamento_colunas: string; // JSON object
  formato_data?: string;
  separador_decimal?: string;
  ultima_utilizacao?: Date;
  contador_uso: number;
  created_at: Date;
  updated_at: Date;
}

export interface RegraClassificacao {
  id: string;
  categoria_id: string;
  nome: string;
  tipo_regra: TipoRegra;
  padrao: string;
  prioridade: number;
  ativa: boolean;
  total_aplicacoes: number;
  ultima_aplicacao?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LogIA {
  id: string;
  transacao_id?: string;
  prompt: string;
  resposta: string;
  modelo: string;
  tokens_prompt: number;
  tokens_resposta: number;
  tokens_total: number;
  custo_usd: number;
  categoria_sugerida_id?: string;
  confianca?: number;
  confirmada: boolean;
  created_at: Date;
}

export interface CartaoConfig {
  id: string;
  instituicao_id: string;
  conta_pagamento_id?: string;
  nome: string;
  ultimos_digitos?: string;
  bandeira?: Bandeira;
  limite_total: number;
  dia_fechamento: number;
  dia_vencimento: number;
  ativo: boolean;
  cor?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Fatura {
  id: string;
  cartao_id: string;
  mes_referencia: string;
  data_fechamento: Date;
  data_vencimento: Date;
  valor_total: number;
  valor_minimo: number;
  valor_pago: number;
  status: StatusFatura;
  fechada_automaticamente: boolean;
  data_pagamento?: Date;
  transacao_pagamento_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FaturaLancamento {
  id: string;
  fatura_id: string;
  transacao_id?: string;
  data_compra: Date;
  descricao: string;
  valor_brl: number;
  parcela_numero?: number;
  parcela_total?: number;
  moeda_original?: string;
  valor_original?: number;
  taxa_cambio?: number;
  categoria_id?: string;
  created_at: Date;
}

export interface CentroCusto {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
  icone?: string;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Orcamento {
  id: string;
  nome: string;
  tipo: 'categoria' | 'centro_custo';
  categoria_id?: string;
  centro_custo_id?: string;
  mes_referencia: string;
  valor_planejado: number;
  valor_realizado: number;
  alerta_80: boolean;
  alerta_100: boolean;
  alerta_80_enviado: boolean;
  alerta_100_enviado: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// DTOs (Data Transfer Objects) para APIs e Formulários
// ============================================================================

export interface CreateInstituicaoDTO {
  nome: string;
  codigo?: string;
  logo_url?: string;
  cor?: string;
}

export interface CreateContaDTO {
  instituicao_id: string;
  nome: string;
  tipo: TipoConta;
  agencia?: string;
  numero?: string;
  saldo_inicial: number;
  cor?: string;
  icone?: string;
  observacoes?: string;
}

export interface CreateTransacaoDTO {
  conta_id: string;
  categoria_id?: string;
  data: Date | string;
  descricao: string;
  valor: number;
  tipo: TipoTransacao;
  observacoes?: string;
  tags?: string[];
}

export interface CreateCategoriaDTO {
  nome: string;
  tipo: TipoTransacao;
  grupo?: string;
  icone?: string;
  cor?: string;
  ordem?: number;
}

export interface UpdateTransacaoDTO {
  categoria_id?: string;
  descricao?: string;
  valor?: number;
  data?: Date | string;
  observacoes?: string;
  tags?: string[];
}

// ============================================================================
// Tipos para Agent IMPORT
// ============================================================================

export interface ParseConfig {
  separador?: string;
  encoding?: string;
  pular_linhas?: number;
  formato_data?: string;
  separador_decimal?: string;
}

export interface ParseResult {
  success: boolean;
  transacoes: ParsedTransacao[];
  erros: ParseError[];
  resumo: {
    total_linhas: number;
    linhas_validas: number;
    linhas_invalidas: number;
    duplicatas: number;
  };
}

export interface ParsedTransacao {
  data: Date;
  descricao: string;
  valor: number;
  tipo?: TipoTransacao;
  categoria?: string;
  observacoes?: string;
  linha_original: number;
  hash?: string;
}

export interface ParseError {
  linha: number;
  campo?: string;
  mensagem: string;
  valor_original?: string;
}

export interface MapeamentoColunas {
  data: number;
  descricao: number;
  valor: number;
  tipo?: number;
  categoria?: number;
  observacoes?: number;
}

export interface FileFormat {
  tipo: TipoArquivo;
  confianca: number;
  detectado: {
    separador?: string;
    encoding?: string;
    headers?: string[];
  };
}

export interface DedupeResult {
  total: number;
  duplicatas: number;
  novas: number;
  transacoes_unicas: ParsedTransacao[];
  transacoes_duplicadas: ParsedTransacao[];
}

// ============================================================================
// Tipos para Agent FINANCE
// ============================================================================

export interface ClassificationResult {
  transacao_id: string;
  categoria_sugerida: Categoria;
  origem: OrigemClassificacao;
  confianca: number;
  motivo: string;
}

export interface RuleMatch {
  regra: RegraClassificacao;
  categoria: Categoria;
  confianca: number;
}

export interface BudgetStatus {
  orcamento: Orcamento;
  percentual_utilizado: number;
  valor_disponivel: number;
  status: 'ok' | 'alerta_80' | 'alerta_100' | 'excedido';
  projecao_fim_mes?: number;
}

export interface CicloFatura {
  data_inicio: Date;
  data_fim: Date;
  data_vencimento: Date;
  mes_referencia: string;
}

export interface ProjecaoFatura {
  fatura: Fatura;
  valor_atual: number;
  valor_projetado: number;
  dias_restantes: number;
  media_diaria: number;
  limite_disponivel: number;
  percentual_limite: number;
}

// ============================================================================
// Tipos para Agent UI
// ============================================================================

export interface DashboardStats {
  saldo_total: number;
  receitas_mes: number;
  despesas_mes: number;
  saldo_mes: number;
  transacoes_pendentes: number;
  orcamento_utilizado: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

export interface FilterOptions {
  data_inicio?: Date;
  data_fim?: Date;
  conta_id?: string;
  categoria_id?: string;
  tipo?: TipoTransacao;
  busca?: string;
  apenas_nao_classificadas?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================================
// Tipos de Resposta de APIs
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface TransacaoComRelacoes extends Transacao {
  conta?: Conta;
  categoria?: Categoria;
  conta_destino?: Conta;
}

export interface ContaComRelacoes extends Conta {
  instituicao: Instituicao;
  transacoes?: Transacao[];
}

export interface FaturaComRelacoes extends Fatura {
  cartao: CartaoConfig;
  lancamentos?: FaturaLancamento[];
}

// ============================================================================
// Tipos Utilitários
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================================================
// Constantes
// ============================================================================

export const CORES_PADRAO = {
  receita: '#10b981',
  despesa: '#ef4444',
  transferencia: '#6366f1',
} as const;

export const ICONES_CATEGORIA = {
  alimentacao: 'UtensilsCrossed',
  transporte: 'Car',
  moradia: 'Home',
  saude: 'Heart',
  educacao: 'GraduationCap',
  lazer: 'Gamepad2',
  vestuario: 'Shirt',
  outros: 'MoreHorizontal',
} as const;
