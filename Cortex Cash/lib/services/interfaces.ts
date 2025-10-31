/**
 * Interfaces de Serviços para Coordenação entre Agentes
 * Agent CORE: Owner deste arquivo
 *
 * Este arquivo define os contratos que cada agente deve seguir.
 * Outros agentes implementam estas interfaces.
 */

import type {
  Transacao,
  Conta,
  Categoria,
  Instituicao,
  TemplateImportacao,
  RegraClassificacao,
  CartaoConfig,
  Fatura,
  Orcamento,
  ParseConfig,
  ParseResult,
  FileFormat,
  DedupeResult,
  ClassificationResult,
  BudgetStatus,
  CicloFatura,
  ProjecaoFatura,
  CreateTransacaoDTO,
  CreateContaDTO,
  CreateInstituicaoDTO,
  CreateCategoriaDTO,
  Investimento,
  HistoricoInvestimento,
  CreateInvestimentoDTO,
  CreateHistoricoInvestimentoDTO,
  InvestimentoComRelacoes,
  TipoInvestimento,
  PatrimonioTotal,
  PatrimonioPorTipo,
  PatrimonioPorInstituicao,
  RentabilidadeHistorico,
} from '../types';

// ============================================================================
// Agent IMPORT - Serviços de Importação
// ============================================================================

/**
 * Serviço de Importação de Arquivos
 * Agent IMPORT: Implementador
 */
export interface IImportService {
  /**
   * Parse de arquivo CSV
   */
  parseCSV(file: File, config?: ParseConfig): Promise<ParseResult>;

  /**
   * Parse de arquivo OFX
   */
  parseOFX(file: File): Promise<ParseResult>;

  /**
   * Parse de arquivo Excel
   */
  parseExcel(file: File, config?: ParseConfig): Promise<ParseResult>;

  /**
   * Detecção automática de formato
   */
  detectFormat(file: File): Promise<FileFormat>;

  /**
   * Salva transações no banco de dados
   */
  saveTransactions(
    transactions: ParseResult['transacoes'],
    contaId: string
  ): Promise<{ saved: number; duplicates: number; errors: string[] }>;

  /**
   * Dedupe de transações
   */
  dedupeTransactions(
    transactions: ParseResult['transacoes'],
    contaId: string
  ): Promise<DedupeResult>;
}

/**
 * Serviço de Gerenciamento de Contas
 * Agent IMPORT: Implementador
 */
export interface IContaService {
  /**
   * Lista todas as contas
   */
  listContas(options?: {
    incluirInativas?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'saldo_inicial' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Conta[]>;

  /**
   * Busca conta por ID
   */
  getContaById(id: string): Promise<Conta | null>;

  /**
   * Cria nova conta
   */
  createConta(data: CreateContaDTO): Promise<Conta>;

  /**
   * Atualiza conta
   */
  updateConta(id: string, data: Partial<CreateContaDTO>): Promise<Conta>;

  /**
   * Deleta conta (soft delete)
   */
  deleteConta(id: string): Promise<void>;

  /**
   * Atualiza saldo da conta
   */
  updateSaldo(id: string, saldo: number): Promise<void>;

  /**
   * Recalcula saldo baseado nas transações
   */
  recalcularSaldo(id: string): Promise<number>;
}

/**
 * Serviço de Gerenciamento de Instituições
 * Agent IMPORT: Implementador
 */
export interface IInstituicaoService {
  /**
   * Lista todas as instituições
   */
  listInstituicoes(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'codigo' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Instituicao[]>;

  /**
   * Busca instituição por ID
   */
  getInstituicaoById(id: string): Promise<Instituicao | null>;

  /**
   * Busca instituição por código
   */
  getInstituicaoByCodigo(codigo: string): Promise<Instituicao | null>;

  /**
   * Cria nova instituição
   */
  createInstituicao(data: CreateInstituicaoDTO): Promise<Instituicao>;

  /**
   * Atualiza instituição
   */
  updateInstituicao(id: string, data: Partial<CreateInstituicaoDTO>): Promise<Instituicao>;

  /**
   * Deleta instituição
   */
  deleteInstituicao(id: string): Promise<void>;

  /**
   * Busca instituições por termo de busca (nome ou código)
   */
  searchInstituicoes(termo: string): Promise<Instituicao[]>;

  /**
   * Retorna uma instituição com suas contas associadas
   */
  getInstituicaoComContas(id: string): Promise<{ instituicao: Instituicao; contas: Conta[] }>;

  /**
   * Conta quantas contas uma instituição possui
   */
  countContas(id: string): Promise<number>;

  /**
   * Verifica se uma instituição possui contas ativas
   */
  hasContasAtivas(id: string): Promise<boolean>;
}

/**
 * Serviço de Templates de Importação
 * Agent IMPORT: Implementador
 */
export interface ITemplateService {
  /**
   * Lista templates
   */
  listTemplates(instituicaoId?: string): Promise<TemplateImportacao[]>;

  /**
   * Busca template por ID
   */
  getTemplateById(id: string): Promise<TemplateImportacao | null>;

  /**
   * Cria novo template
   */
  createTemplate(data: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'>): Promise<TemplateImportacao>;

  /**
   * Atualiza template
   */
  updateTemplate(
    id: string,
    data: Partial<Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<TemplateImportacao>;

  /**
   * Deleta template
   */
  deleteTemplate(id: string): Promise<void>;

  /**
   * Sugere template baseado no arquivo
   */
  suggestTemplate(file: File): Promise<TemplateImportacao | null>;
}

// ============================================================================
// Agent FINANCE - Serviços Financeiros
// ============================================================================

/**
 * Serviço de Classificação de Transações
 * Agent FINANCE: Implementador
 */
export interface IClassificacaoService {
  /**
   * Classifica transação usando regras
   */
  classifyByRules(transacao: Transacao): Promise<ClassificationResult | null>;

  /**
   * Classifica transação usando IA
   */
  classifyByAI(transacao: Transacao): Promise<ClassificationResult>;

  /**
   * Aplica regras em massa
   */
  applyRulesToTransactions(transacaoIds: string[]): Promise<ClassificationResult[]>;

  /**
   * Confirma sugestão de classificação
   */
  confirmClassification(transacaoId: string, categoriaId: string): Promise<void>;

  /**
   * Lista transações não classificadas
   */
  listUnclassified(): Promise<Transacao[]>;
}

/**
 * Serviço de Regras de Classificação
 * Agent FINANCE: Implementador
 */
export interface IRegraService {
  /**
   * Lista regras
   */
  listRegras(ativas?: boolean): Promise<RegraClassificacao[]>;

  /**
   * Busca regra por ID
   */
  getRegraById(id: string): Promise<RegraClassificacao | null>;

  /**
   * Cria nova regra
   */
  createRegra(
    data: Omit<RegraClassificacao, 'id' | 'created_at' | 'updated_at' | 'total_aplicacoes' | 'ultima_aplicacao'>
  ): Promise<RegraClassificacao>;

  /**
   * Atualiza regra
   */
  updateRegra(
    id: string,
    data: Partial<Omit<RegraClassificacao, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<RegraClassificacao>;

  /**
   * Deleta regra
   */
  deleteRegra(id: string): Promise<void>;

  /**
   * Reordena regras (prioridade)
   */
  reorderRegras(regraIds: string[]): Promise<void>;
}

/**
 * Serviço de Orçamentos
 * Agent FINANCE: Implementador (v1.0+)
 */
export interface IOrcamentoService {
  /**
   * Lista orçamentos
   */
  listOrcamentos(mesReferencia?: string): Promise<Orcamento[]>;

  /**
   * Busca orçamento por ID
   */
  getOrcamentoById(id: string): Promise<Orcamento | null>;

  /**
   * Cria novo orçamento
   */
  createOrcamento(
    data: Omit<Orcamento, 'id' | 'created_at' | 'updated_at' | 'valor_realizado' | 'alerta_80_enviado' | 'alerta_100_enviado'>
  ): Promise<Orcamento>;

  /**
   * Atualiza orçamento
   */
  updateOrcamento(id: string, data: Partial<Omit<Orcamento, 'id' | 'created_at' | 'updated_at'>>): Promise<Orcamento>;

  /**
   * Deleta orçamento
   */
  deleteOrcamento(id: string): Promise<void>;

  /**
   * Calcula status do orçamento
   */
  calculateBudgetStatus(orcamentoId: string): Promise<BudgetStatus>;

  /**
   * Atualiza valores realizados
   */
  updateRealized(mesReferencia: string): Promise<void>;
}

/**
 * Serviço de Cartões e Faturas
 * Agent FINANCE: Implementador (v0.3+)
 */
export interface ICartaoService {
  /**
   * Lista cartões
   */
  listCartoes(ativos?: boolean): Promise<CartaoConfig[]>;

  /**
   * Busca cartão por ID
   */
  getCartaoById(id: string): Promise<CartaoConfig | null>;

  /**
   * Cria novo cartão
   */
  createCartao(data: Omit<CartaoConfig, 'id' | 'created_at' | 'updated_at'>): Promise<CartaoConfig>;

  /**
   * Atualiza cartão
   */
  updateCartao(id: string, data: Partial<Omit<CartaoConfig, 'id' | 'created_at' | 'updated_at'>>): Promise<CartaoConfig>;

  /**
   * Deleta cartão
   */
  deleteCartao(id: string): Promise<void>;

  /**
   * Calcula ciclo da fatura
   */
  calculateCycle(cartaoId: string, mesReferencia: string): Promise<CicloFatura>;

  /**
   * Fecha fatura automaticamente
   */
  closeFatura(faturaId: string): Promise<Fatura>;

  /**
   * Detecta pagamento de fatura
   */
  detectPayment(faturaId: string): Promise<Transacao | null>;

  /**
   * Calcula projeção de fatura
   */
  calculateProjection(faturaId: string): Promise<ProjecaoFatura>;
}

// ============================================================================
// Agent UI - Não possui serviços, consome os serviços acima
// ============================================================================

/**
 * Serviço de Transações (usado por todos os agentes)
 * Agent CORE: Implementador
 */
export interface ITransacaoService {
  /**
   * Lista transações
   */
  listTransacoes(filters?: {
    contaId?: string;
    categoriaId?: string;
    dataInicio?: Date;
    dataFim?: Date;
    tipo?: string;
    busca?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'data' | 'valor' | 'descricao';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Transacao[]>;

  /**
   * Busca transação por ID
   */
  getTransacaoById(id: string): Promise<Transacao | null>;

  /**
   * Cria nova transação
   */
  createTransacao(data: CreateTransacaoDTO): Promise<Transacao>;

  /**
   * Atualiza transação
   */
  updateTransacao(id: string, data: Partial<CreateTransacaoDTO>): Promise<Transacao>;

  /**
   * Deleta transação
   */
  deleteTransacao(id: string): Promise<void>;

  /**
   * Atualiza categoria em massa
   */
  bulkUpdateCategoria(transacaoIds: string[], categoriaId: string): Promise<number>;

  /**
   * Deleta em massa
   */
  bulkDelete(transacaoIds: string[]): Promise<number>;
}

/**
 * Serviço de Categorias (usado por todos os agentes)
 * Agent CORE: Implementador
 */
export interface ICategoriaService {
  /**
   * Lista categorias
   */
  listCategorias(options?: {
    tipo?: string;
    ativas?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'ordem' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Categoria[]>;

  /**
   * Busca categoria por ID
   */
  getCategoriaById(id: string): Promise<Categoria | null>;

  /**
   * Cria nova categoria
   */
  createCategoria(data: CreateCategoriaDTO): Promise<Categoria>;

  /**
   * Atualiza categoria
   */
  updateCategoria(id: string, data: Partial<CreateCategoriaDTO>): Promise<Categoria>;

  /**
   * Deleta categoria
   */
  deleteCategoria(id: string): Promise<void>;

  /**
   * Busca categorias por grupo
   */
  getCategoriasByGrupo(grupo: string): Promise<Categoria[]>;
}

// ============================================================================
// Agent PATRIMONIO - Serviços de Investimentos e Patrimônio
// ============================================================================

/**
 * Serviço de Investimentos
 * Agent CORE: Implementador
 */
export interface IInvestimentoService {
  /**
   * Lista todos os investimentos
   */
  listInvestimentos(options?: {
    status?: string;
    tipo?: TipoInvestimento;
    instituicao_id?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'nome' | 'valor_atual' | 'data_aplicacao' | 'rentabilidade';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Investimento[]>;

  /**
   * Busca investimento por ID
   */
  getInvestimentoById(id: string): Promise<Investimento | null>;

  /**
   * Busca investimento por ID com relações
   */
  getInvestimentoComRelacoes(id: string): Promise<InvestimentoComRelacoes | null>;

  /**
   * Cria novo investimento
   */
  createInvestimento(data: CreateInvestimentoDTO): Promise<Investimento>;

  /**
   * Atualiza investimento
   */
  updateInvestimento(id: string, data: Partial<CreateInvestimentoDTO>): Promise<Investimento>;

  /**
   * Deleta investimento (soft delete - marca como resgatado)
   */
  deleteInvestimento(id: string): Promise<void>;

  /**
   * Deleta permanentemente um investimento
   */
  hardDeleteInvestimento(id: string): Promise<void>;

  /**
   * Cria registro de histórico de investimento
   */
  createHistoricoInvestimento(data: CreateHistoricoInvestimentoDTO): Promise<HistoricoInvestimento>;

  /**
   * Lista histórico de um investimento
   */
  getHistoricoInvestimento(investimento_id: string): Promise<HistoricoInvestimento[]>;

  /**
   * Calcula rentabilidade de um investimento
   */
  calcularRentabilidade(id: string): Promise<{
    rentabilidade: number;
    rentabilidade_percentual: number;
  }>;

  /**
   * Busca investimentos por tipo
   */
  getInvestimentosPorTipo(tipo: TipoInvestimento): Promise<Investimento[]>;

  /**
   * Busca investimentos ativos
   */
  getInvestimentosAtivos(): Promise<Investimento[]>;

  /**
   * Calcula valor total investido (apenas ativos)
   */
  getValorTotalInvestido(): Promise<number>;

  /**
   * Calcula valor total atual dos investimentos (apenas ativos)
   */
  getValorTotalAtual(): Promise<number>;
}

/**
 * Serviço de Patrimônio
 * Agent CORE: Implementador
 */
export interface IPatrimonioService {
  /**
   * Calcula o patrimônio total (contas + investimentos)
   */
  getPatrimonioTotal(): Promise<PatrimonioTotal>;

  /**
   * Agrupa investimentos por tipo
   */
  getPatrimonioPorTipo(): Promise<PatrimonioPorTipo[]>;

  /**
   * Agrupa patrimônio por instituição (contas + investimentos)
   */
  getPatrimonioPorInstituicao(): Promise<PatrimonioPorInstituicao[]>;

  /**
   * Retorna histórico de rentabilidade dos investimentos
   */
  getRentabilidadeHistorico(): Promise<RentabilidadeHistorico[]>;

  /**
   * Calcula diversificação do patrimônio
   */
  getDiversificacao(): Promise<{
    por_tipo_conta: Array<{ tipo: string; valor: number; percentual: number }>;
    por_tipo_investimento: Array<{ tipo: string; valor: number; percentual: number }>;
    contas_vs_investimentos: {
      contas: number;
      investimentos: number;
      percentual_contas: number;
      percentual_investimentos: number;
    };
  }>;

  /**
   * Retorna resumo do patrimônio para dashboard
   */
  getResumoPatrimonio(): Promise<{
    patrimonio_total: number;
    contas: number;
    investimentos: number;
    rentabilidade_total: number;
    rentabilidade_percentual: number;
    maior_investimento: { nome: string; valor: number } | null;
    maior_conta: { nome: string; valor: number } | null;
  }>;
}

// ============================================================================
// Exportação consolidada
// ============================================================================

export interface IServices {
  // Agent IMPORT
  import: IImportService;
  conta: IContaService;
  instituicao: IInstituicaoService;
  template: ITemplateService;

  // Agent FINANCE
  classificacao: IClassificacaoService;
  regra: IRegraService;
  orcamento: IOrcamentoService;
  cartao: ICartaoService;

  // Agent CORE (compartilhado)
  transacao: ITransacaoService;
  categoria: ICategoriaService;
  investimento: IInvestimentoService;
  patrimonio: IPatrimonioService;
}
