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
export type TipoInvestimento =
  | 'renda_fixa'          // CDB, LCI, LCA, Tesouro Direto
  | 'renda_variavel'      // Ações, FIIs
  | 'fundo_investimento'  // Fundos diversos
  | 'previdencia'         // PGBL, VGBL
  | 'criptomoeda'         // Bitcoin, Ethereum, etc
  | 'outro';
export type StatusInvestimento = 'ativo' | 'resgatado' | 'vencido';

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
  pai_id?: string; // FK para categoria pai (para subcategorias)
  icone?: string;
  cor?: string;
  ordem: number;
  ativa: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Tag {
  id: string;
  nome: string;
  cor?: string;
  tipo: 'sistema' | 'customizada';
  created_at: Date;
}

export interface Transacao {
  id: string;
  conta_id: string;
  categoria_id?: string;
  centro_custo_id?: string; // Relacionamento com orçamentos
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

  // Métricas de acurácia (Agent FINANCE v0.5)
  total_confirmacoes: number;  // Vezes que usuário manteve a classificação
  total_rejeicoes: number;     // Vezes que usuário mudou a classificação

  created_at: Date;
  updated_at: Date;
}

export interface LogIA {
  id: string;
  transacao_id?: string;
  prompt: string;
  resposta: string;
  modelo: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo'; // Modelos válidos para cálculo de custo
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

export interface Investimento {
  id: string;
  instituicao_id: string;
  nome: string;
  tipo: TipoInvestimento;
  ticker?: string; // Código (PETR4, ITSA4, etc)
  valor_aplicado: number;
  valor_atual: number;
  quantidade?: number; // Para ações, cotas, etc
  data_aplicacao: Date;
  data_vencimento?: Date;
  taxa_juros?: number; // % ao ano
  rentabilidade_contratada?: number; // % (para CDI 100%, por exemplo)
  indexador?: string; // CDI, IPCA, etc
  status: StatusInvestimento;
  conta_origem_id?: string; // Conta que originou o investimento
  observacoes?: string;
  cor?: string;
  created_at: Date;
  updated_at: Date;
}

export interface HistoricoInvestimento {
  id: string;
  investimento_id: string;
  data: Date;
  valor: number; // Valor do investimento naquela data
  quantidade?: number; // Quantidade de cotas/ações naquela data
  tipo_movimentacao: 'aporte' | 'resgate' | 'rendimento' | 'ajuste';
  observacoes?: string;
  created_at: Date;
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

export interface CreateInvestimentoDTO {
  instituicao_id: string;
  nome: string;
  tipo: TipoInvestimento;
  ticker?: string;
  valor_aplicado: number;
  valor_atual: number;
  quantidade?: number;
  data_aplicacao: Date | string;
  data_vencimento?: Date | string;
  taxa_juros?: number;
  rentabilidade_contratada?: number;
  indexador?: string;
  conta_origem_id?: string;
  observacoes?: string;
  cor?: string;
}

export interface CreateHistoricoInvestimentoDTO {
  investimento_id: string;
  data: Date | string;
  valor: number;
  quantidade?: number;
  tipo_movimentacao: 'aporte' | 'resgate' | 'rendimento' | 'ajuste';
  observacoes?: string;
}

export interface CreateCartaoDTO {
  instituicao_id: string;
  conta_pagamento_id?: string;
  nome: string;
  ultimos_digitos?: string;
  bandeira?: Bandeira;
  limite_total: number;
  dia_fechamento: number;
  dia_vencimento: number;
  cor?: string;
}

export interface CreateFaturaDTO {
  cartao_id: string;
  mes_referencia: string;
  data_fechamento: Date | string;
  data_vencimento: Date | string;
  valor_total?: number;
  valor_minimo?: number;
  valor_pago?: number;
  status?: StatusFatura;
  fechada_automaticamente?: boolean;
  data_pagamento?: Date | string;
  transacao_pagamento_id?: string;
}

export interface CreateFaturaLancamentoDTO {
  fatura_id: string;
  transacao_id?: string;
  data_compra: Date | string;
  descricao: string;
  valor_brl: number;
  parcela_numero?: number;
  parcela_total?: number;
  moeda_original?: string;
  valor_original?: number;
  taxa_cambio?: number;
  categoria_id?: string;
}

export interface PagarFaturaDTO {
  fatura_id: string;
  conta_pagamento_id: string;
  valor_pago: number;
  data_pagamento: Date | string;
  observacoes?: string;
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

// ============================================================================
// Tipos para Agent PATRIMÔNIO
// ============================================================================

export interface PatrimonioTotal {
  saldo_contas: number;        // Soma de todas as contas ativas
  saldo_investimentos: number;  // Soma de todos os investimentos ativos
  patrimonio_total: number;     // saldo_contas + saldo_investimentos
  variacao_mes: number;         // Diferença para o mês anterior
  variacao_mes_percentual: number;
  rentabilidade_investimentos: number; // (valor_atual - valor_aplicado) / valor_aplicado * 100
  ultima_atualizacao: Date;
}

export interface PatrimonioPorTipo {
  tipo: TipoInvestimento;
  valor_aplicado: number;
  valor_atual: number;
  rentabilidade: number;
  rentabilidade_percentual: number;
  quantidade_ativos: number;
  investimentos: Investimento[];
}

export interface PatrimonioPorInstituicao {
  instituicao: Instituicao;
  valor_contas: number;
  valor_investimentos: number;
  valor_total: number;
  percentual_patrimonio: number;
  contas: Conta[];
  investimentos: Investimento[];
}

export interface RentabilidadeHistorico {
  data: Date;
  valor_aplicado: number;
  valor_atual: number;
  rentabilidade: number;
  rentabilidade_percentual: number;
}

export interface InvestimentoComRelacoes extends Investimento {
  instituicao: Instituicao;
  conta_origem?: Conta;
  historico?: HistoricoInvestimento[];
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

export interface CartaoComRelacoes extends CartaoConfig {
  instituicao: Instituicao;
  conta_pagamento?: Conta;
  faturas?: Fatura[];
}

export interface FaturaDetalhada extends Fatura {
  cartao: CartaoConfig;
  lancamentos: FaturaLancamento[];
  total_lancamentos: number;
}

// ============================================================================
// Tipos para Agent IMPOSTO DE RENDA
// ============================================================================

export type AnoFiscal = string; // Formato: "2024", "2025"

export interface DeclaracaoIR {
  id: string;
  ano_calendario: AnoFiscal; // Ano dos rendimentos (2024 para declaração 2025)
  ano_exercicio: AnoFiscal;  // Ano da declaração (2025)
  tipo: 'completa' | 'simplificada';
  status: 'rascunho' | 'finalizada' | 'enviada' | 'processada';
  data_envio?: Date;
  recibo?: string;
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RendimentoTributavel {
  id: string;
  declaracao_id: string;
  tipo: 'salario' | 'prolabore' | 'aposentadoria' | 'aluguel' | 'outro';
  fonte_pagadora_nome: string;
  fonte_pagadora_cnpj?: string;
  valor_bruto: number;
  imposto_retido: number;
  inss_retido: number;
  contribuicao_previdenciaria: number;
  pensao_alimenticia_paga: number;
  mes_inicio: number; // 1-12
  mes_fim: number; // 1-12
  observacoes?: string;
  created_at: Date;
}

export interface RendimentoIsentoNaoTributavel {
  id: string;
  declaracao_id: string;
  tipo: 'poupanca' | 'indenizacao' | 'doacao' | 'heranca' | 'seguro_vida' | 'outro';
  descricao: string;
  valor: number;
  observacoes?: string;
  created_at: Date;
}

export interface DespesaDedutivel {
  id: string;
  declaracao_id: string;
  tipo: 'saude' | 'educacao' | 'previdencia_privada' | 'pensao_alimenticia';
  beneficiario_nome: string;
  beneficiario_cpf?: string;
  prestador_nome: string;
  prestador_cnpj?: string;
  valor: number;
  data_pagamento: Date;
  observacoes?: string;
  created_at: Date;
}

export interface BemDireito {
  id: string;
  declaracao_id: string;
  codigo_receita: string; // Código da tabela da Receita Federal
  tipo: 'imovel' | 'veiculo' | 'investimento' | 'outros';
  descricao: string;
  valor_inicial: number;  // Valor em 31/12 do ano anterior
  valor_final: number;    // Valor em 31/12 do ano atual
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DividaOnus {
  id: string;
  declaracao_id: string;
  tipo: 'financiamento' | 'emprestimo' | 'cartao_credito' | 'outros';
  credor_nome: string;
  credor_cnpj?: string;
  valor_inicial: number;  // Saldo em 31/12 do ano anterior
  valor_final: number;    // Saldo em 31/12 do ano atual
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RelatorioIR {
  declaracao: DeclaracaoIR;
  resumo: {
    total_rendimentos_tributaveis: number;
    total_rendimentos_isentos: number;
    total_deducoes: number;
    base_calculo: number;
    imposto_devido: number;
    imposto_retido: number;
    imposto_pagar: number;      // Se positivo
    imposto_restituir: number;  // Se negativo
  };
  rendimentos_tributaveis: RendimentoTributavel[];
  rendimentos_isentos: RendimentoIsentoNaoTributavel[];
  despesas_dedutiveis: DespesaDedutivel[];
  bens_direitos: BemDireito[];
  dividas_onus: DividaOnus[];
}

export interface SugestaoIR {
  tipo: 'rendimento' | 'despesa' | 'bem' | 'divida';
  origem: 'transacao' | 'investimento' | 'conta';
  origem_id: string;
  descricao: string;
  valor: number;
  data: Date;
  categoria_ir: string;
  confianca: number;
  ja_declarado: boolean;
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
