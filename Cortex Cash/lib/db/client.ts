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
  Tag,
  Transacao,
  TemplateImportacao,
  RegraClassificacao,
  LogIA,
  CartaoConfig,
  Fatura,
  FaturaLancamento,
  CentroCusto,
  Orcamento,
  Investimento,
  HistoricoInvestimento,
  DeclaracaoIR,
  RendimentoTributavel,
  RendimentoIsentoNaoTributavel,
  DespesaDedutivel,
  BemDireito,
  DividaOnus,
} from '../types';

// Define o banco de dados Dexie
export class CortexCashDB extends Dexie {
  // Tabelas com tipos
  instituicoes!: EntityTable<Instituicao, 'id'>;
  contas!: EntityTable<Conta, 'id'>;
  categorias!: EntityTable<Categoria, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  transacoes!: EntityTable<Transacao, 'id'>;
  templates_importacao!: EntityTable<TemplateImportacao, 'id'>;
  regras_classificacao!: EntityTable<RegraClassificacao, 'id'>;
  logs_ia!: EntityTable<LogIA, 'id'>;
  cartoes_config!: EntityTable<CartaoConfig, 'id'>;
  faturas!: EntityTable<Fatura, 'id'>;
  faturas_lancamentos!: EntityTable<FaturaLancamento, 'id'>;
  centros_custo!: EntityTable<CentroCusto, 'id'>;
  orcamentos!: EntityTable<Orcamento, 'id'>;
  investimentos!: EntityTable<Investimento, 'id'>;
  historico_investimentos!: EntityTable<HistoricoInvestimento, 'id'>;
  declaracoes_ir!: EntityTable<DeclaracaoIR, 'id'>;
  rendimentos_tributaveis!: EntityTable<RendimentoTributavel, 'id'>;
  rendimentos_isentos!: EntityTable<RendimentoIsentoNaoTributavel, 'id'>;
  despesas_dedutiveis!: EntityTable<DespesaDedutivel, 'id'>;
  bens_direitos!: EntityTable<BemDireito, 'id'>;
  dividas_onus!: EntityTable<DividaOnus, 'id'>;

  constructor() {
    super('cortex-cash');

    // v1: Schema inicial
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

      // Investimentos
      investimentos: 'id, instituicao_id, nome, tipo, ticker, status, data_aplicacao, conta_origem_id',

      // Histórico de Investimentos
      historico_investimentos: 'id, investimento_id, data, tipo_movimentacao',
    });

    // v2: Adiciona suporte a subcategorias (pai_id) e tags
    this.version(2).stores({
      // Categorias: adiciona índice pai_id para subcategorias
      categorias: 'id, nome, tipo, grupo, pai_id, ativa, ordem',

      // Tags: nova tabela
      tags: 'id, nome, tipo',
    }).upgrade(tx => {
      // Migration: categorias existentes recebem pai_id = null (categorias raiz)
      return tx.table('categorias').toCollection().modify(categoria => {
        if (!categoria.pai_id) {
          categoria.pai_id = null;
        }
      });
    });

    // v3: Adiciona tabelas para Imposto de Renda
    this.version(3).stores({
      declaracoes_ir: 'id, ano_calendario, ano_exercicio, status',
      rendimentos_tributaveis: 'id, declaracao_id, tipo',
      rendimentos_isentos: 'id, declaracao_id, tipo',
      despesas_dedutiveis: 'id, declaracao_id, tipo, data_pagamento',
      bens_direitos: 'id, declaracao_id, tipo',
      dividas_onus: 'id, declaracao_id, tipo',
    });
  }
}

// Instância global do banco
let dbInstance: CortexCashDB | null = null;

/**
 * Verifica se o IndexedDB está disponível (verificação síncrona básica)
 * NOTA: Esta função não detecta bloqueios assíncronos (ex: Safari modo privado).
 * Para detecção completa, use checkIndexedDBSupportAsync().
 */
export function checkIndexedDBSupport(): { supported: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, error: 'Executando no servidor (SSR)' };
  }

  if (!('indexedDB' in window)) {
    return { supported: false, error: 'IndexedDB não está disponível neste navegador' };
  }

  // Verificação básica de disponibilidade da API
  try {
    // Tenta acessar a API para garantir que não está undefined
    if (!window.indexedDB.open) {
      return { supported: false, error: 'API IndexedDB incompleta' };
    }
    return { supported: true };
  } catch (err) {
    return { supported: false, error: 'Erro ao acessar IndexedDB: ' + (err instanceof Error ? err.message : 'desconhecido') };
  }
}

/**
 * Verifica se o IndexedDB está disponível e funcional (verificação assíncrona completa)
 * Detecta bloqueios em modo privado (Safari) e outras restrições
 */
export async function checkIndexedDBSupportAsync(): Promise<{ supported: boolean; error?: string }> {
  // Primeiro faz as verificações síncronas
  const basicCheck = checkIndexedDBSupport();
  if (!basicCheck.supported) {
    return basicCheck;
  }

  // Verifica se está em modo privado ou bloqueado (teste assíncrono)
  try {
    return await new Promise<{ supported: boolean; error?: string }>((resolve) => {
      const testDB = window.indexedDB.open('cortex-cash-test-db');

      testDB.onerror = () => {
        resolve({
          supported: false,
          error: 'IndexedDB pode estar bloqueado (modo privado ou configurações)'
        });
      };

      testDB.onsuccess = () => {
        // Fecha e deleta o DB de teste
        testDB.result.close();
        window.indexedDB.deleteDatabase('cortex-cash-test-db');
        resolve({ supported: true });
      };

      // Timeout de segurança (2 segundos)
      setTimeout(() => {
        resolve({
          supported: false,
          error: 'Timeout ao verificar IndexedDB - pode estar bloqueado'
        });
      }, 2000);
    });
  } catch (err) {
    return {
      supported: false,
      error: 'Erro ao testar IndexedDB: ' + (err instanceof Error ? err.message : 'desconhecido')
    };
  }
}

/**
 * Inicializa e retorna a instância do banco de dados
 */
export function getDB(): CortexCashDB {
  // Verifica suporte ao IndexedDB
  const support = checkIndexedDBSupport();
  if (!support.supported) {
    throw new Error(support.error || 'IndexedDB não suportado');
  }

  if (!dbInstance) {
    try {
      dbInstance = new CortexCashDB();
      console.log('✅ Instância do banco Dexie criada com sucesso');
    } catch (err) {
      console.error('❌ Erro ao criar instância do Dexie:', err);
      throw err;
    }
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
    tags: await db.tags.toArray(),
    transacoes: await db.transacoes.toArray(),
    templates_importacao: await db.templates_importacao.toArray(),
    regras_classificacao: await db.regras_classificacao.toArray(),
    logs_ia: await db.logs_ia.toArray(),
    cartoes_config: await db.cartoes_config.toArray(),
    faturas: await db.faturas.toArray(),
    faturas_lancamentos: await db.faturas_lancamentos.toArray(),
    centros_custo: await db.centros_custo.toArray(),
    orcamentos: await db.orcamentos.toArray(),
    investimentos: await db.investimentos.toArray(),
    historico_investimentos: await db.historico_investimentos.toArray(),
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
    if (data.tags) await db.tags.bulkAdd(data.tags);
    if (data.transacoes) await db.transacoes.bulkAdd(data.transacoes);
    if (data.templates_importacao) await db.templates_importacao.bulkAdd(data.templates_importacao);
    if (data.regras_classificacao) await db.regras_classificacao.bulkAdd(data.regras_classificacao);
    if (data.logs_ia) await db.logs_ia.bulkAdd(data.logs_ia);
    if (data.cartoes_config) await db.cartoes_config.bulkAdd(data.cartoes_config);
    if (data.faturas) await db.faturas.bulkAdd(data.faturas);
    if (data.faturas_lancamentos) await db.faturas_lancamentos.bulkAdd(data.faturas_lancamentos);
    if (data.centros_custo) await db.centros_custo.bulkAdd(data.centros_custo);
    if (data.orcamentos) await db.orcamentos.bulkAdd(data.orcamentos);
    if (data.investimentos) await db.investimentos.bulkAdd(data.investimentos);
    if (data.historico_investimentos) await db.historico_investimentos.bulkAdd(data.historico_investimentos);
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
