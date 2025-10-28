"use client";

/**
 * Dexie (IndexedDB) Database Client
 * Agent CORE: Owner
 *
 * Banco de dados local usando Dexie.js para melhor performance e compatibilidade
 */

import Dexie, { type EntityTable } from 'dexie';
import type {
  Instituicao,
  Conta,
  Categoria,
  Transacao,
  TemplateImportacao,
  RegraClassificacao,
  LogIA,
  CartaoConfig,
  Fatura,
  FaturaLancamento,
  CentroCusto,
  Orcamento,
} from '../types';

// Define o banco de dados Dexie
export class CortexCashDB extends Dexie {
  // Tabelas com tipos
  instituicoes!: EntityTable<Instituicao, 'id'>;
  contas!: EntityTable<Conta, 'id'>;
  categorias!: EntityTable<Categoria, 'id'>;
  transacoes!: EntityTable<Transacao, 'id'>;
  templates_importacao!: EntityTable<TemplateImportacao, 'id'>;
  regras_classificacao!: EntityTable<RegraClassificacao, 'id'>;
  logs_ia!: EntityTable<LogIA, 'id'>;
  cartoes_config!: EntityTable<CartaoConfig, 'id'>;
  faturas!: EntityTable<Fatura, 'id'>;
  faturas_lancamentos!: EntityTable<FaturaLancamento, 'id'>;
  centros_custo!: EntityTable<CentroCusto, 'id'>;
  orcamentos!: EntityTable<Orcamento, 'id'>;

  constructor() {
    super('cortex-cash');

    this.version(1).stores({
      // Instituições
      instituicoes: 'id, nome, codigo',

      // Contas
      contas: 'id, instituicao_id, nome, tipo, ativa',

      // Categorias
      categorias: 'id, nome, tipo, grupo, ativa, ordem',

      // Transações
      transacoes: 'id, conta_id, categoria_id, data, tipo, hash, transferencia_id, conta_destino_id, grupo_parcelamento_id',

      // Templates de Importação
      templates_importacao: 'id, instituicao_id, nome, tipo_arquivo',

      // Regras de Classificação
      regras_classificacao: 'id, categoria_id, nome, tipo_regra, ativa, prioridade',

      // Logs IA
      logs_ia: 'id, transacao_id, modelo, created_at',

      // Cartões
      cartoes_config: 'id, instituicao_id, nome, ativo',

      // Faturas
      faturas: 'id, cartao_id, mes_referencia, status',

      // Lançamentos de Fatura
      faturas_lancamentos: 'id, fatura_id, transacao_id, data_compra',

      // Centros de Custo
      centros_custo: 'id, nome, ativo',

      // Orçamentos
      orcamentos: 'id, nome, tipo, categoria_id, centro_custo_id, mes_referencia',
    });
  }
}

// Instância global do banco
let dbInstance: CortexCashDB | null = null;

/**
 * Inicializa e retorna a instância do banco de dados
 */
export function getDB(): CortexCashDB {
  if (!dbInstance) {
    dbInstance = new CortexCashDB();
  }
  return dbInstance;
}

/**
 * Exporta o banco de dados como JSON
 */
export async function exportDatabase(): Promise<Blob> {
  const db = getDB();

  const data = {
    instituicoes: await db.instituicoes.toArray(),
    contas: await db.contas.toArray(),
    categorias: await db.categorias.toArray(),
    transacoes: await db.transacoes.toArray(),
    templates_importacao: await db.templates_importacao.toArray(),
    regras_classificacao: await db.regras_classificacao.toArray(),
    logs_ia: await db.logs_ia.toArray(),
    cartoes_config: await db.cartoes_config.toArray(),
    faturas: await db.faturas.toArray(),
    faturas_lancamentos: await db.faturas_lancamentos.toArray(),
    centros_custo: await db.centros_custo.toArray(),
    orcamentos: await db.orcamentos.toArray(),
  };

  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Importa banco de dados de arquivo JSON
 */
export async function importDatabase(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);

  const db = getDB();

  // Limpa todas as tabelas
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });

  // Importa os dados
  await db.transaction('rw', db.tables, async () => {
    if (data.instituicoes) await db.instituicoes.bulkAdd(data.instituicoes);
    if (data.contas) await db.contas.bulkAdd(data.contas);
    if (data.categorias) await db.categorias.bulkAdd(data.categorias);
    if (data.transacoes) await db.transacoes.bulkAdd(data.transacoes);
    if (data.templates_importacao) await db.templates_importacao.bulkAdd(data.templates_importacao);
    if (data.regras_classificacao) await db.regras_classificacao.bulkAdd(data.regras_classificacao);
    if (data.logs_ia) await db.logs_ia.bulkAdd(data.logs_ia);
    if (data.cartoes_config) await db.cartoes_config.bulkAdd(data.cartoes_config);
    if (data.faturas) await db.faturas.bulkAdd(data.faturas);
    if (data.faturas_lancamentos) await db.faturas_lancamentos.bulkAdd(data.faturas_lancamentos);
    if (data.centros_custo) await db.centros_custo.bulkAdd(data.centros_custo);
    if (data.orcamentos) await db.orcamentos.bulkAdd(data.orcamentos);
  });
}

/**
 * Limpa todos os dados (use com cuidado!)
 */
export async function clearDatabase(): Promise<void> {
  const db = getDB();
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}
