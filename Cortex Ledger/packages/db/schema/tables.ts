import {
	pgTable,
	uuid,
	text,
	boolean,
	date,
	numeric,
	jsonb,
	timestamp,
	integer,
	index,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Tables

export const instituicao = pgTable("instituicao", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	nome: text("nome").notNull(),
	tipo: text("tipo"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const conta = pgTable("conta", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	instituicaoId: uuid("instituicao_id").references(() => instituicao.id, {
		onDelete: "cascade",
	}),
	apelido: text("apelido"),
	tipo: text("tipo"),
	moeda: text("moeda").notNull().default("BRL"),
	ativa: boolean("ativa").notNull().default(true),
});

export const categoria = pgTable("categoria", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	grupo: text("grupo"),
	nome: text("nome").notNull(),
	ativa: boolean("ativa").notNull().default(true),
});

export const transacao = pgTable(
	"transacao",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id").notNull(),
		contaId: uuid("conta_id")
			.notNull()
			.references(() => conta.id, { onDelete: "cascade" }),
		data: date("data").notNull(),
		descricao: text("descricao").notNull(),
		valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
		tipo: text("tipo").notNull(),
		idExterno: text("id_externo"),
		saldoApos: numeric("saldo_apos", { precision: 14, scale: 2 }),
		hashDedupe: text("hash_dedupe").notNull(),
		parcelaN: integer("parcela_n"),
		parcelasTotal: integer("parcelas_total"),
		linkOriginalId: uuid("link_original_id"),
		valorOriginal: numeric("valor_original", { precision: 14, scale: 2 }),
		moedaOriginal: text("moeda_original"),
		// Campos de cartão de crédito
		faturaId: uuid("fatura_id"),
		isParcelada: boolean("is_parcelada").default(false),
		parcelaAtual: integer("parcela_atual"),
		valorTotalParcelado: numeric("valor_total_parcelado", {
			precision: 12,
			scale: 2,
		}),
		compraOriginalId: uuid("compra_original_id"),
		compraInternacional: boolean("compra_internacional").default(false),
		taxaConversao: numeric("taxa_conversao", { precision: 10, scale: 6 }),
		iof: numeric("iof", { precision: 10, scale: 2 }),
	},
	(table) => [
		uniqueIndex("idx_tx_user_hash").on(table.userId, table.hashDedupe),
		index("idx_tx_user_conta_data").on(table.userId, table.contaId, table.data),
		index("idx_transacao_fatura").on(table.faturaId),
		index("idx_transacao_compra_original").on(table.compraOriginalId),
	],
);

export const regraClassificacao = pgTable(
	"regra_classificacao",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id").notNull(),
		ordem: integer("ordem").notNull(),
		expressao: text("expressao").notNull(),
		tipoRegra: text("tipo_regra").notNull(),
		categoriaId: uuid("categoria_id").references(() => categoria.id),
		tags: text("tags").array(),
		confiancaMin: numeric("confianca_min", { precision: 3, scale: 2 }),
	},
	(table) => [index("idx_regra_user_ordem").on(table.userId, table.ordem)],
);

export const templateImportacao = pgTable(
	"template_importacao",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id").notNull(),
		instituicaoId: uuid("instituicao_id").references(() => instituicao.id),
		mapeamentoJson: jsonb("mapeamento_json").notNull(),
		headerIdx: integer("header_idx"),
		sep: text("sep"),
		exemplos: jsonb("exemplos"),
	},
	(table) => [
		index("idx_template_user_inst").on(table.userId, table.instituicaoId),
	],
);

export const recorrencia = pgTable("recorrencia", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	descricao: text("descricao"),
	periodicidade: text("periodicidade"),
	proximoLanc: date("proximo_lanc"),
	valorEst: numeric("valor_est", { precision: 14, scale: 2 }),
});

export const orcamento = pgTable("orcamento", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	mes: date("mes"),
	categoriaId: uuid("categoria_id").references(() => categoria.id),
	valorAlvo: numeric("valor_alvo", { precision: 14, scale: 2 }),
});

export const meta = pgTable("meta", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	nome: text("nome"),
	contaId: uuid("conta_id").references(() => conta.id),
	valorAlvo: numeric("valor_alvo", { precision: 14, scale: 2 }),
	progresso: numeric("progresso", { precision: 14, scale: 2 }),
});

export const logIa = pgTable("log_ia", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
	tarefa: text("tarefa"),
	modelo: text("modelo"),
	tokensIn: integer("tokens_in"),
	tokensOut: integer("tokens_out"),
	custoUsd: numeric("custo_usd", { precision: 10, scale: 4 }),
	score: numeric("score", { precision: 4, scale: 2 }),
	detalhe: jsonb("detalhe"),
});

export const preferencias = pgTable("preferencias", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id").notNull(),
	moeda: text("moeda").notNull().default("BRL"),
	fuso: text("fuso").notNull().default("America/Sao_Paulo"),
	modoTema: text("modo_tema").notNull().default("system"),
	limitesAlerta: jsonb("limites_alerta"),
});

export const cartaoCredito = pgTable(
	"cartao_credito",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		contaId: uuid("conta_id")
			.notNull()
			.references(() => conta.id, { onDelete: "cascade" }),
		nome: text("nome").notNull(),
		instituicao: text("instituicao").notNull(),
		bandeira: text("bandeira").notNull(),
		ultimosDigitos: text("ultimos_digitos").notNull(),
		tipoCartao: text("tipo_cartao").notNull().default("nacional"),
		limiteTotal: numeric("limite_total", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		limiteDisponivel: numeric("limite_disponivel", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		diaFechamento: integer("dia_fechamento").notNull(),
		diaVencimento: integer("dia_vencimento").notNull(),
		melhorDiaCompra: integer("melhor_dia_compra"),
		anuidadeValor: numeric("anuidade_valor", { precision: 10, scale: 2 }),
		anuidadeProximoVenc: date("anuidade_proximo_venc"),
		taxaJurosMes: numeric("taxa_juros_mes", { precision: 5, scale: 2 }),
		status: text("status").notNull().default("ativo"),
		userId: uuid("user_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_cartao_credito_user").on(table.userId),
		index("idx_cartao_credito_conta").on(table.contaId),
		index("idx_cartao_credito_status").on(table.status),
		uniqueIndex("idx_cartao_credito_user_conta").on(
			table.userId,
			table.contaId,
		),
	],
);

export const fatura = pgTable(
	"fatura",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		cartaoId: uuid("cartao_id")
			.notNull()
			.references(() => cartaoCredito.id, { onDelete: "cascade" }),
		mesReferencia: text("mes_referencia").notNull(),
		dataFechamento: date("data_fechamento").notNull(),
		dataVencimento: date("data_vencimento").notNull(),
		valorTotal: numeric("valor_total", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		valorPago: numeric("valor_pago", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		valorMinimo: numeric("valor_minimo", { precision: 12, scale: 2 }),
		status: text("status").notNull().default("aberta"),
		dataPagamento: date("data_pagamento"),
		transacaoPagamentoId: uuid("transacao_pagamento_id").references(
			() => transacao.id,
		),
		userId: uuid("user_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_fatura_cartao").on(table.cartaoId),
		index("idx_fatura_user").on(table.userId),
		index("idx_fatura_status").on(table.status),
		index("idx_fatura_vencimento").on(table.dataVencimento),
		index("idx_fatura_mes_ref").on(table.mesReferencia),
		uniqueIndex("idx_fatura_cartao_mes").on(table.cartaoId, table.mesReferencia),
	],
);

export const alertaCartao = pgTable(
	"alerta_cartao",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id").notNull(),
		cartaoId: uuid("cartao_id").references(() => cartaoCredito.id, {
			onDelete: "cascade",
		}),
		tipo: text("tipo").notNull(),
		limiar: numeric("limiar", { precision: 10, scale: 2 }),
		diasAntecedencia: integer("dias_antecedencia"),
		ativo: boolean("ativo").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_alerta_cartao_user").on(table.userId),
		index("idx_alerta_cartao_cartao").on(table.cartaoId),
	],
);

// Relations

export const instituicaoRelations = relations(instituicao, ({ many }) => ({
	contas: many(conta),
	templates: many(templateImportacao),
}));

export const contaRelations = relations(conta, ({ one, many }) => ({
	instituicao: one(instituicao, {
		fields: [conta.instituicaoId],
		references: [instituicao.id],
	}),
	transacoes: many(transacao),
	metas: many(meta),
}));

export const categoriaRelations = relations(categoria, ({ many }) => ({
	regras: many(regraClassificacao),
	orcamentos: many(orcamento),
}));

export const transacaoRelations = relations(transacao, ({ one }) => ({
	conta: one(conta, {
		fields: [transacao.contaId],
		references: [conta.id],
	}),
}));

export const regraClassificacaoRelations = relations(
	regraClassificacao,
	({ one }) => ({
		categoria: one(categoria, {
			fields: [regraClassificacao.categoriaId],
			references: [categoria.id],
		}),
	}),
);

export const templateImportacaoRelations = relations(
	templateImportacao,
	({ one }) => ({
		instituicao: one(instituicao, {
			fields: [templateImportacao.instituicaoId],
			references: [instituicao.id],
		}),
	}),
);

export const orcamentoRelations = relations(orcamento, ({ one }) => ({
	categoria: one(categoria, {
		fields: [orcamento.categoriaId],
		references: [categoria.id],
	}),
}));

export const metaRelations = relations(meta, ({ one }) => ({
	conta: one(conta, {
		fields: [meta.contaId],
		references: [conta.id],
	}),
}));

export const cartaoCreditoRelations = relations(
	cartaoCredito,
	({ one, many }) => ({
		conta: one(conta, {
			fields: [cartaoCredito.contaId],
			references: [conta.id],
		}),
		faturas: many(fatura),
		alertas: many(alertaCartao),
	}),
);

export const faturaRelations = relations(fatura, ({ one, many }) => ({
	cartao: one(cartaoCredito, {
		fields: [fatura.cartaoId],
		references: [cartaoCredito.id],
	}),
	transacaoPagamento: one(transacao, {
		fields: [fatura.transacaoPagamentoId],
		references: [transacao.id],
	}),
	transacoes: many(transacao),
}));

export const alertaCartaoRelations = relations(alertaCartao, ({ one }) => ({
	cartao: one(cartaoCredito, {
		fields: [alertaCartao.cartaoId],
		references: [cartaoCredito.id],
	}),
}));
