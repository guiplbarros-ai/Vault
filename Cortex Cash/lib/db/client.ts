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
  Usuario,
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
  Cenario,
  ConfiguracaoComportamento,
  ObjetivoFinanceiro,
} from '../types';

// Define o banco de dados Dexie
export class CortexCashDB extends Dexie {
  // Tabelas com tipos
  instituicoes!: EntityTable<Instituicao, 'id'>;
  contas!: EntityTable<Conta, 'id'>;
  categorias!: EntityTable<Categoria, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  usuarios!: EntityTable<Usuario, 'id'>;
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
  cenarios!: EntityTable<Cenario, 'id'>;
  configuracoes_comportamento!: EntityTable<ConfiguracaoComportamento, 'id'>;
  objetivos_financeiros!: EntityTable<ObjetivoFinanceiro, 'id'>;

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
      transacoes: 'id, conta_id, categoria_id, centro_custo_id, data, tipo, hash, transferencia_id, conta_destino_id, grupo_parcelamento_id',

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

    // v4: Adiciona tabelas para Planejamento Financeiro
    this.version(4).stores({
      cenarios: 'id, nome, tipo, created_at',
      configuracoes_comportamento: 'id, cenario_id, tipo, categoria_id, data_aplicacao',
      objetivos_financeiros: 'id, cenario_id, data_alvo, categoria, prioridade',
    });

    // v5: Índice único para deduplicação de transações (hash) + migração para remover duplicatas antigas
    this.version(5)
      .stores({
        // Torna hash único para impedir duplicatas
        transacoes:
          'id, conta_id, categoria_id, centro_custo_id, data, tipo, &hash, transferencia_id, conta_destino_id, grupo_parcelamento_id',
      })
      .upgrade(async (tx) => {
        try {
          const table = tx.table('transacoes');
          // Itera ordenado por hash para detectar duplicatas sem carregar tudo em memória
          let lastHash: string | undefined = undefined;
          const idsToDelete: string[] = [];

          await table.orderBy('hash').each((t: any) => {
            const h = t?.hash as string | undefined;
            if (!h) return;
            if (h === lastHash) {
              if (t.id) idsToDelete.push(t.id as string);
            } else {
              lastHash = h;
            }
          });

          if (idsToDelete.length > 0) {
            await table.bulkDelete(idsToDelete);
          }
        } catch (err) {
          // Em caso de erro na migração, deixamos logar mas não bloqueamos o app inteiro
          console.error('Erro ao migrar dedupe de transações (v5):', err);
        }
      });

    // v6: Adiciona índice de favoritos para templates de importação
    this.version(6)
      .stores({
        // Adiciona índice is_favorite para filtrar templates favoritos
        templates_importacao: 'id, instituicao_id, nome, tipo_arquivo, is_favorite',
      })
      .upgrade(async (tx) => {
        try {
          const table = tx.table('templates_importacao');
          // Inicializa is_favorite como false para todos os templates existentes
          await table.toCollection().modify(template => {
            if (template.is_favorite === undefined) {
              template.is_favorite = false;
            }
          });
        } catch (err) {
          console.error('Erro ao migrar templates com is_favorite (v6):', err);
        }
      });

    // v7: Adiciona suporte a contas vinculadas (conta_pai_id)
    this.version(7)
      .stores({
        // Adiciona índice conta_pai_id para contas vinculadas (poupança, investimento, cartões)
        contas: 'id, instituicao_id, nome, tipo, ativa, conta_pai_id',
      })
      .upgrade(async (tx) => {
        try {
          const table = tx.table('contas');
          // Inicializa conta_pai_id como undefined para todas as contas existentes
          await table.toCollection().modify(conta => {
            if (conta.conta_pai_id === undefined) {
              conta.conta_pai_id = undefined;
            }
          });
        } catch (err) {
          console.error('Erro ao migrar contas com conta_pai_id (v7):', err);
        }
      });

    // v8: Adiciona tabela de usuários para controle de permissões
    this.version(8).stores({
      // Usuários: gerenciamento de usuários e permissões
      usuarios: 'id, email, role, ativo',
    });

    // v9: Mudança de saldo_inicial para saldo_referencia + data_referencia
    // Filosofia: User é soberano - informa saldo atual e sistema calcula retroativo
    this.version(9)
      .stores({
        // Mantém estrutura de contas mas adiciona campo data_referencia
        contas: 'id, instituicao_id, nome, tipo, ativa, conta_pai_id, data_referencia',
      })
      .upgrade(async (tx) => {
        try {
          const table = tx.table('contas');
          await table.toCollection().modify(conta => {
            // Se tem saldo_inicial (legado), converte para saldo_referencia
            if ('saldo_inicial' in conta && typeof conta.saldo_inicial === 'number') {
              conta.saldo_referencia = conta.saldo_inicial;
              delete conta.saldo_inicial;
            } else if (!('saldo_referencia' in conta)) {
              // Se não tem nenhum dos dois, inicializa com 0
              conta.saldo_referencia = 0;
            }

            // Adiciona data_referencia (usa created_at ou data atual)
            if (!conta.data_referencia) {
              conta.data_referencia = conta.created_at || new Date();
            }
          });
          console.log('[Migration v9] Contas migradas: saldo_inicial → saldo_referencia + data_referencia');
        } catch (err) {
          console.error('Erro ao migrar contas para saldo_referencia (v9):', err);
        }
      });

    // v10: Sistema multi-usuário
    // Adiciona usuario_id nas tabelas principais e is_sistema para dados do sistema
    this.version(10)
      .stores({
        // Atualiza índices para incluir usuario_id
        contas: 'id, instituicao_id, nome, tipo, ativa, conta_pai_id, data_referencia, usuario_id',
        categorias: 'id, nome, tipo, grupo, pai_id, ativa, ordem, usuario_id, is_sistema',
        tags: 'id, nome, tipo, usuario_id, is_sistema',
        transacoes: 'id, conta_id, categoria_id, centro_custo_id, data, tipo, hash, transferencia_id, conta_destino_id, grupo_parcelamento_id, usuario_id',
        orcamentos: 'id, nome, tipo, categoria_id, centro_custo_id, mes_referencia, usuario_id',
        investimentos: 'id, instituicao_id, nome, tipo, ticker, status, data_aplicacao, conta_origem_id, usuario_id',
        cartoes_config: 'id, instituicao_id, nome, ativo, usuario_id',
        regras_classificacao: 'id, categoria_id, nome, tipo_regra, ativa, prioridade, usuario_id',
        templates_importacao: 'id, instituicao_id, nome, tipo_arquivo, usuario_id, is_favorite',
        centros_custo: 'id, nome, ativo, usuario_id',
      })
      .upgrade(async (tx) => {
        try {
          console.log('[Migration v10] Iniciando migração multi-usuário...');

          // Criar usuário "Produção" padrão se não existir
          const usuariosTable = tx.table('usuarios');
          let usuarioProd = await usuariosTable.where('email').equals('producao@cortexcash.local').first();

          if (!usuarioProd) {
            const idProd = 'usuario-producao';
            usuarioProd = {
              id: idProd,
              nome: '📊 Produção',
              email: 'producao@cortexcash.local',
              role: 'admin',
              ativo: true,
              created_at: new Date(),
              updated_at: new Date(),
            };
            await usuariosTable.add(usuarioProd);
            console.log('[Migration v10] Usuário Produção criado');
          }

          const usuarioId = usuarioProd.id;

          // Migrar dados existentes para o usuário Produção
          const tablesToMigrate = [
            'contas', 'categorias', 'tags', 'transacoes', 'orcamentos',
            'investimentos', 'cartoes_config', 'regras_classificacao',
            'templates_importacao', 'centros_custo'
          ];

          for (const tableName of tablesToMigrate) {
            const table = tx.table(tableName);
            const count = await table.count();

            if (count > 0) {
              await table.toCollection().modify(record => {
                if (!record.usuario_id) {
                  record.usuario_id = usuarioId;
                }

                // Marcar categorias e tags padrão como sistema
                if ((tableName === 'categorias' || tableName === 'tags') && !('is_sistema' in record)) {
                  // Se o registro já existia antes da v10, é considerado do sistema
                  record.is_sistema = true;
                }
              });
              console.log(`[Migration v10] ${count} registros migrados em ${tableName}`);
            }
          }

          // Salvar usuário ativo no localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('cortex-cash-current-user-id', usuarioId);
            console.log('[Migration v10] Usuário ativo definido como Produção');
          }

          console.log('[Migration v10] Migração multi-usuário concluída!');
        } catch (err) {
          console.error('[Migration v10] Erro ao migrar para multi-usuário:', err);
        }
      });

    /**
     * v11: Adiciona campo senha_hash para autenticação real
     * Migra usuários existentes com senha padrão (devem ser desativados)
     */
    this.version(11)
      .stores({
        // Mantém o schema atual, Dexie permite adicionar campos sem declarar no schema
        usuarios: 'id, email, role, ativo',
      })
      .upgrade(async (tx) => {
        try {
          console.log('[Migration v11] Adicionando campo senha_hash aos usuários...');

          // Hash de senha padrão: "123456" (bcrypt)
          const DEFAULT_PASSWORD_HASH = '$2a$10$YQ3p5kZ8qZ7p5kZ8qZ7p5.YQ3p5kZ8qZ7p5kZ8qZ7p5kZ8qZ7p5kZ';

          const usuariosTable = tx.table('usuarios');
          await usuariosTable.toCollection().modify(usuario => {
            if (!usuario.senha_hash) {
              usuario.senha_hash = DEFAULT_PASSWORD_HASH;
              // Desativa usuários antigos - devem criar conta real
              usuario.ativo = false;
              console.log(`[Migration v11] Usuário ${usuario.email} atualizado com senha padrão e desativado`);
            }
          });

          console.log('[Migration v11] Campo senha_hash adicionado com sucesso!');
        } catch (err) {
          console.error('[Migration v11] Erro ao adicionar senha_hash:', err);
        }
      });

    /**
     * v12: Expande campos de perfil do usuário
     * Adiciona: telefone, data_nascimento, cpf, biografia, moeda_preferida, idioma_preferido
     */
    this.version(12)
      .stores({
        // Mantém o schema atual, Dexie permite adicionar campos sem declarar no schema
        usuarios: 'id, email, role, ativo',
      })
      .upgrade(async (tx) => {
        try {
          console.log('[Migration v12] Adicionando campos de perfil aos usuários...');

          const usuariosTable = tx.table('usuarios');
          await usuariosTable.toCollection().modify(usuario => {
            // Inicializa novos campos de perfil se não existirem
            if (!('telefone' in usuario)) usuario.telefone = undefined;
            if (!('data_nascimento' in usuario)) usuario.data_nascimento = undefined;
            if (!('cpf' in usuario)) usuario.cpf = undefined;
            if (!('biografia' in usuario)) usuario.biografia = undefined;
            if (!('moeda_preferida' in usuario)) usuario.moeda_preferida = 'BRL';
            if (!('idioma_preferido' in usuario)) usuario.idioma_preferido = 'pt-BR';
          });

          console.log('[Migration v12] Campos de perfil adicionados com sucesso!');
        } catch (err) {
          console.error('[Migration v12] Erro ao adicionar campos de perfil:', err);
        }
      });

    /**
     * v13: Fix - Adiciona índice is_favorite em templates_importacao
     * O índice foi perdido durante a migração v10
     */
    this.version(13).stores({
      templates_importacao: 'id, instituicao_id, nome, tipo_arquivo, usuario_id, is_favorite',
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
      // Garante que dados de sistema essenciais estejam presentes
      // (ex.: templates de importação). Executa de forma assíncrona
      // e idempotente para não bloquear a inicialização.
      void ensureSystemDataSeeded();
    } catch (err) {
      console.error('❌ Erro ao criar instância do Dexie:', err);
      throw err;
    }
  }
  return dbInstance;
}

/**
 * Garante que dados essenciais do sistema (que não dependem do usuário)
 * sejam inseridos após inicialização/criação/limpeza do banco.
 * - Idempotente: pode rodar múltiplas vezes sem duplicar registros
 */
async function ensureSystemDataSeeded(): Promise<void> {
  try {
    const { areTemplatesSeeded, seedBankTemplates } = await import('../import/templates/seed-templates');
    const seeded = await areTemplatesSeeded();
    if (!seeded) {
      const inserted = await seedBankTemplates();
      console.log(`🌱 Templates de importação seed realizados: ${inserted}`);
    }
  } catch (err) {
    // Não bloqueia a aplicação caso falhe; apenas loga para diagnóstico
    console.warn('Não foi possível garantir o seed de dados do sistema:', err);
  }
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
    usuarios: await db.usuarios.toArray(),
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
    declaracoes_ir: await db.declaracoes_ir.toArray(),
    rendimentos_tributaveis: await db.rendimentos_tributaveis.toArray(),
    rendimentos_isentos: await db.rendimentos_isentos.toArray(),
    despesas_dedutiveis: await db.despesas_dedutiveis.toArray(),
    bens_direitos: await db.bens_direitos.toArray(),
    dividas_onus: await db.dividas_onus.toArray(),
    cenarios: await db.cenarios.toArray(),
    configuracoes_comportamento: await db.configuracoes_comportamento.toArray(),
    objetivos_financeiros: await db.objetivos_financeiros.toArray(),
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

  // Importa os dados do backup
  // Usa bulkPut (não bulkAdd) porque mesmo após clear(), garante que não haverá erros de duplicata
  await db.transaction('rw', db.tables, async () => {
    if (data.instituicoes) await db.instituicoes.bulkPut(data.instituicoes);
    if (data.contas) await db.contas.bulkPut(data.contas);
    if (data.categorias) await db.categorias.bulkPut(data.categorias);
    if (data.tags) await db.tags.bulkPut(data.tags);
    if (data.usuarios) await db.usuarios.bulkPut(data.usuarios);
    if (data.transacoes) await db.transacoes.bulkPut(data.transacoes);
    if (data.templates_importacao) await db.templates_importacao.bulkPut(data.templates_importacao);
    if (data.regras_classificacao) await db.regras_classificacao.bulkPut(data.regras_classificacao);
    if (data.logs_ia) await db.logs_ia.bulkPut(data.logs_ia);
    if (data.cartoes_config) await db.cartoes_config.bulkPut(data.cartoes_config);
    if (data.faturas) await db.faturas.bulkPut(data.faturas);
    if (data.faturas_lancamentos) await db.faturas_lancamentos.bulkPut(data.faturas_lancamentos);
    if (data.centros_custo) await db.centros_custo.bulkPut(data.centros_custo);
    if (data.orcamentos) await db.orcamentos.bulkPut(data.orcamentos);
    if (data.investimentos) await db.investimentos.bulkPut(data.investimentos);
    if (data.historico_investimentos) await db.historico_investimentos.bulkPut(data.historico_investimentos);
    if (data.declaracoes_ir) await db.declaracoes_ir.bulkPut(data.declaracoes_ir);
    if (data.rendimentos_tributaveis) await db.rendimentos_tributaveis.bulkPut(data.rendimentos_tributaveis);
    if (data.rendimentos_isentos) await db.rendimentos_isentos.bulkPut(data.rendimentos_isentos);
    if (data.despesas_dedutiveis) await db.despesas_dedutiveis.bulkPut(data.despesas_dedutiveis);
    if (data.bens_direitos) await db.bens_direitos.bulkPut(data.bens_direitos);
    if (data.dividas_onus) await db.dividas_onus.bulkPut(data.dividas_onus);
    if (data.cenarios) await db.cenarios.bulkPut(data.cenarios);
    if (data.configuracoes_comportamento) await db.configuracoes_comportamento.bulkPut(data.configuracoes_comportamento);
    if (data.objetivos_financeiros) await db.objetivos_financeiros.bulkPut(data.objetivos_financeiros);
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
