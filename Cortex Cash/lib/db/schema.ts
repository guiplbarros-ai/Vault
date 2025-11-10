import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Instituições Financeiras
 * Armazena informações sobre bancos e instituições financeiras
 */
export const instituicoes = sqliteTable('instituicoes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  codigo: text('codigo'), // Código do banco (001 - Banco do Brasil, etc)
  logo_url: text('logo_url'),
  cor: text('cor'), // Cor tema da instituição
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Contas Bancárias
 * Armazena contas correntes, poupanças, investimentos, etc
 *
 * Filosofia de saldo: User é soberano!
 * - saldo_referencia: Saldo conhecido em uma data específica (verificado pelo usuário)
 * - data_referencia: Data em que o saldo foi verificado
 * - saldo_atual: Saldo calculado (cache) a partir do saldo_referencia + transações
 */
export const contas = sqliteTable('contas', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  instituicao_id: text('instituicao_id').notNull().references(() => instituicoes.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(), // 'corrente', 'poupanca', 'investimento', 'carteira'
  agencia: text('agencia'),
  numero: text('numero'),
  saldo_referencia: real('saldo_referencia').notNull().default(0), // Saldo verificado pelo user
  data_referencia: integer('data_referencia', { mode: 'timestamp' }).$defaultFn(() => new Date()), // Quando foi verificado
  saldo_atual: real('saldo_atual').notNull().default(0), // Cache calculado
  ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true),
  cor: text('cor'),
  icone: text('icone'),
  observacoes: text('observacoes'),
  conta_pai_id: text('conta_pai_id'), // FK para conta pai (para contas vinculadas)
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Categorias
 * Sistema hierárquico de categorias para classificação de transações
 */
export const categorias = sqliteTable('categorias', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(), // 'receita', 'despesa', 'transferencia'
  grupo: text('grupo'), // Categoria pai (ex: 'Alimentação' para 'Restaurantes')
  icone: text('icone'),
  cor: text('cor'),
  ordem: integer('ordem').notNull().default(0),
  ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Transações
 * Registro de todas as movimentações financeiras
 */
export const transacoes = sqliteTable('transacoes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conta_id: text('conta_id').notNull().references(() => contas.id, { onDelete: 'cascade' }),
  categoria_id: text('categoria_id').references(() => categorias.id, { onDelete: 'set null' }),

  // Dados básicos da transação
  data: integer('data', { mode: 'timestamp' }).notNull(),
  descricao: text('descricao').notNull(),
  valor: real('valor').notNull(),
  tipo: text('tipo').notNull(), // 'receita', 'despesa', 'transferencia'

  // Dados adicionais
  observacoes: text('observacoes'),
  tags: text('tags'), // JSON array de tags

  // Controle de transferências
  transferencia_id: text('transferencia_id'), // ID da transação relacionada (quando é transferência)
  conta_destino_id: text('conta_destino_id').references(() => contas.id, { onDelete: 'set null' }),

  // Parcelamento
  parcelado: integer('parcelado', { mode: 'boolean' }).notNull().default(false),
  parcela_numero: integer('parcela_numero'),
  parcela_total: integer('parcela_total'),
  grupo_parcelamento_id: text('grupo_parcelamento_id'), // Agrupa todas as parcelas

  // Controle de classificação
  classificacao_confirmada: integer('classificacao_confirmada', { mode: 'boolean' }).notNull().default(false),
  classificacao_origem: text('classificacao_origem'), // 'manual', 'regra', 'ia'
  classificacao_confianca: real('classificacao_confianca'), // 0-1 para classificações automáticas

  // Importação
  hash: text('hash').unique(), // SHA256 para dedupe
  origem_arquivo: text('origem_arquivo'),
  origem_linha: integer('origem_linha'),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Templates de Importação
 * Configurações reutilizáveis para importação de arquivos
 */
export const templates_importacao = sqliteTable('templates_importacao', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  instituicao_id: text('instituicao_id').references(() => instituicoes.id, { onDelete: 'cascade' }),

  nome: text('nome').notNull(),
  tipo_arquivo: text('tipo_arquivo').notNull(), // 'csv', 'ofx', 'excel'

  // Configurações CSV
  separador: text('separador'),
  encoding: text('encoding').default('utf-8'),
  pular_linhas: integer('pular_linhas').default(0),

  // Mapeamento de colunas (JSON)
  mapeamento_colunas: text('mapeamento_colunas').notNull(), // { data: 0, descricao: 1, valor: 2, ... }

  // Transformações
  formato_data: text('formato_data').default('DD/MM/YYYY'),
  separador_decimal: text('separador_decimal').default(','),

  // Uso
  ultima_utilizacao: integer('ultima_utilizacao', { mode: 'timestamp' }),
  contador_uso: integer('contador_uso').notNull().default(0),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Regras de Classificação
 * Regras automáticas para classificar transações
 */
export const regras_classificacao = sqliteTable('regras_classificacao', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  categoria_id: text('categoria_id').notNull().references(() => categorias.id, { onDelete: 'cascade' }),

  nome: text('nome').notNull(),
  tipo_regra: text('tipo_regra').notNull(), // 'contains', 'starts_with', 'ends_with', 'regex'
  padrao: text('padrao').notNull(), // O padrão a ser buscado

  prioridade: integer('prioridade').notNull().default(0), // Maior = mais prioritária
  ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true),

  // Estatísticas
  total_aplicacoes: integer('total_aplicacoes').notNull().default(0),
  ultima_aplicacao: integer('ultima_aplicacao', { mode: 'timestamp' }),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Logs de Classificação IA
 * Registro de uso da API OpenAI para classificação
 */
export const logs_ia = sqliteTable('logs_ia', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  transacao_id: text('transacao_id').references(() => transacoes.id, { onDelete: 'cascade' }),

  prompt: text('prompt').notNull(),
  resposta: text('resposta').notNull(),

  modelo: text('modelo').notNull(),
  tokens_prompt: integer('tokens_prompt').notNull(),
  tokens_resposta: integer('tokens_resposta').notNull(),
  tokens_total: integer('tokens_total').notNull(),
  custo_usd: real('custo_usd').notNull(),

  categoria_sugerida_id: text('categoria_sugerida_id').references(() => categorias.id, { onDelete: 'set null' }),
  confianca: real('confianca'),
  confirmada: integer('confirmada', { mode: 'boolean' }).notNull().default(false),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Configuração de Cartões
 * Configurações de cartões de crédito
 */
export const cartoes_config = sqliteTable('cartoes_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  instituicao_id: text('instituicao_id').notNull().references(() => instituicoes.id, { onDelete: 'cascade' }),
  conta_pagamento_id: text('conta_pagamento_id').references(() => contas.id, { onDelete: 'set null' }),

  nome: text('nome').notNull(),
  ultimos_digitos: text('ultimos_digitos'),
  bandeira: text('bandeira'), // 'visa', 'mastercard', 'elo', 'amex'

  limite_total: real('limite_total').notNull(),

  // Ciclo da fatura
  dia_fechamento: integer('dia_fechamento').notNull(), // 1-31
  dia_vencimento: integer('dia_vencimento').notNull(), // 1-31

  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  cor: text('cor'),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Faturas de Cartão
 * Faturas mensais de cartões de crédito
 */
export const faturas = sqliteTable('faturas', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cartao_id: text('cartao_id').notNull().references(() => cartoes_config.id, { onDelete: 'cascade' }),

  // Período da fatura
  mes_referencia: text('mes_referencia').notNull(), // 'YYYY-MM'
  data_fechamento: integer('data_fechamento', { mode: 'timestamp' }).notNull(),
  data_vencimento: integer('data_vencimento', { mode: 'timestamp' }).notNull(),

  // Valores
  valor_total: real('valor_total').notNull().default(0),
  valor_minimo: real('valor_minimo').notNull().default(0),
  valor_pago: real('valor_pago').notNull().default(0),

  // Status
  status: text('status').notNull().default('aberta'), // 'aberta', 'fechada', 'paga', 'atrasada'
  fechada_automaticamente: integer('fechada_automaticamente', { mode: 'boolean' }).notNull().default(false),

  // Pagamento
  data_pagamento: integer('data_pagamento', { mode: 'timestamp' }),
  transacao_pagamento_id: text('transacao_pagamento_id').references(() => transacoes.id, { onDelete: 'set null' }),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Lançamentos de Fatura
 * Transações vinculadas a faturas de cartão
 */
export const faturas_lancamentos = sqliteTable('faturas_lancamentos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fatura_id: text('fatura_id').notNull().references(() => faturas.id, { onDelete: 'cascade' }),
  transacao_id: text('transacao_id').references(() => transacoes.id, { onDelete: 'cascade' }),

  // Dados da compra
  data_compra: integer('data_compra', { mode: 'timestamp' }).notNull(),
  descricao: text('descricao').notNull(),
  valor_brl: real('valor_brl').notNull(),

  // Parcelamento
  parcela_numero: integer('parcela_numero'),
  parcela_total: integer('parcela_total'),

  // Câmbio (para compras internacionais)
  moeda_original: text('moeda_original'),
  valor_original: real('valor_original'),
  taxa_cambio: real('taxa_cambio'),

  categoria_id: text('categoria_id').references(() => categorias.id, { onDelete: 'set null' }),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Centros de Custo
 * Agrupamentos customizados de despesas/receitas
 */
export const centros_custo = sqliteTable('centros_custo', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  nome: text('nome').notNull(),
  descricao: text('descricao'),
  cor: text('cor'),
  icone: text('icone'),

  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Orçamentos
 * Planejamento de gastos por categoria ou centro de custo
 */
export const orcamentos = sqliteTable('orcamentos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(), // 'categoria', 'centro_custo'

  categoria_id: text('categoria_id').references(() => categorias.id, { onDelete: 'cascade' }),
  centro_custo_id: text('centro_custo_id').references(() => centros_custo.id, { onDelete: 'cascade' }),

  // Período
  mes_referencia: text('mes_referencia').notNull(), // 'YYYY-MM'

  // Valores
  valor_planejado: real('valor_planejado').notNull(),
  valor_realizado: real('valor_realizado').notNull().default(0),

  // Alertas
  alerta_80: integer('alerta_80', { mode: 'boolean' }).notNull().default(true),
  alerta_100: integer('alerta_100', { mode: 'boolean' }).notNull().default(true),
  alerta_80_enviado: integer('alerta_80_enviado', { mode: 'boolean' }).notNull().default(false),
  alerta_100_enviado: integer('alerta_100_enviado', { mode: 'boolean' }).notNull().default(false),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

/**
 * Usuários
 * Gerenciamento de usuários e permissões
 */
export const usuarios = sqliteTable('usuarios', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),

  // Role-based access control
  role: text('role').notNull().default('user'), // 'admin', 'user'

  // Preferências do usuário
  avatar_url: text('avatar_url'),
  tema_preferido: text('tema_preferido').default('auto'), // 'light', 'dark', 'auto'

  // Controle de acesso
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  ultimo_acesso: integer('ultimo_acesso', { mode: 'timestamp' }),

  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
