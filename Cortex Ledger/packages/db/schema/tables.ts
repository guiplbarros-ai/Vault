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
	},
	(table) => [
		uniqueIndex("idx_tx_user_hash").on(table.userId, table.hashDedupe),
		index("idx_tx_user_conta_data").on(table.userId, table.contaId, table.data),
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
