/**
 * Seed de transações mock para demonstração
 * Cria transações realistas usando as categorias e tags do sistema
 */

import { getDB } from './client';
import type { Transacao, Conta } from '../types';
import { subDays, startOfMonth, addDays } from 'date-fns';

export async function seedMockTransactions(): Promise<void> {
  const db = getDB();

  // Verificar se já existem transações
  const existingTransactions = await db.transacoes.count();
  if (existingTransactions > 0) {
    console.log('⚠️ Já existem transações no banco. Pulando seed de mock data.');
    return;
  }

  console.log('🔄 Criando mock data de transações...');

  // Buscar categorias e contas
  const categorias = await db.categorias.toArray();
  const contas = await db.contas.toArray();
  const tags = await db.tags.toArray();

  if (categorias.length === 0) {
    console.log('⚠️ Nenhuma categoria encontrada. Execute o seed de categorias primeiro.');
    return;
  }

  // Criar uma conta padrão se não existir
  let contaPrincipal: Conta;
  if (contas.length === 0) {
    const contaId = crypto.randomUUID();
    const instituicaoId = crypto.randomUUID(); // ID fictício de instituição
    contaPrincipal = {
      id: contaId,
      instituicao_id: instituicaoId,
      nome: 'Conta Corrente',
      tipo: 'corrente',
      saldo_inicial: 5000,
      saldo_atual: 5000,
      ativa: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db.contas.add(contaPrincipal);
    console.log('✅ Conta padrão criada');
  } else {
    contaPrincipal = contas[0];
  }

  // Mapear categorias por nome para facilitar
  const catMap: Record<string, string> = {};
  categorias.forEach(cat => {
    catMap[cat.nome] = cat.id;
  });

  // Mapear tags por nome
  const tagMap: Record<string, string> = {};
  tags.forEach(tag => {
    tagMap[tag.nome] = tag.id;
  });

  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);

  // Transações mock realistas
  const transacoesMock: (Omit<Transacao, 'id' | 'created_at' | 'updated_at' | 'tags' | 'parcelado' | 'classificacao_confirmada' | 'classificacao_origem' | 'hash'> & { tags?: string[] })[] = [
    // === ALIMENTAÇÃO ===
    {
      descricao: 'Almoço no restaurante',
      valor: -45.90,
      data: subDays(hoje, 1),
      tipo: 'despesa',
      categoria_id: catMap['Restaurantes'] || catMap['Alimentação'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
      observacoes: 'Almoço com colegas de trabalho',
    },
    {
      descricao: 'Supermercado - compras do mês',
      valor: -342.50,
      data: subDays(hoje, 3),
      tipo: 'despesa',
      categoria_id: catMap['Supermercado'] || catMap['Alimentação'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial'],
      observacoes: 'Compras mensais',
    },
    {
      descricao: 'Padaria - café da manhã',
      valor: -12.50,
      data: subDays(hoje, 2),
      tipo: 'despesa',
      categoria_id: catMap['Alimentação'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
    },
    {
      descricao: 'iFood - jantar',
      valor: -67.80,
      data: hoje,
      tipo: 'despesa',
      categoria_id: catMap['Delivery'] || catMap['Restaurantes'] || catMap['Alimentação'],
      conta_id: contaPrincipal.id,
      tags: ['Importante'],
    },

    // === TRANSPORTE ===
    {
      descricao: 'Combustível - Posto Shell',
      valor: -250.00,
      data: subDays(hoje, 5),
      tipo: 'despesa',
      categoria_id: catMap['Combustível'] || catMap['Transporte'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
    },
    {
      descricao: 'Uber - volta do trabalho',
      valor: -28.50,
      data: subDays(hoje, 1),
      tipo: 'despesa',
      categoria_id: catMap['Aplicativos de Transporte'] || catMap['Transporte'],
      conta_id: contaPrincipal.id,
      tags: ['Importante'],
    },
    {
      descricao: 'Estacionamento shopping',
      valor: -15.00,
      data: subDays(hoje, 6),
      tipo: 'despesa',
      categoria_id: catMap['Estacionamento'] || catMap['Transporte'],
      conta_id: contaPrincipal.id,
      tags: ['Importante'],
    },

    // === MORADIA ===
    {
      descricao: 'Aluguel - outubro',
      valor: -1500.00,
      data: addDays(inicioMes, 5),
      tipo: 'despesa',
      categoria_id: catMap['Aluguel'] || catMap['Moradia'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
    },
    {
      descricao: 'Condomínio - outubro',
      valor: -450.00,
      data: addDays(inicioMes, 10),
      tipo: 'despesa',
      categoria_id: catMap['Condomínio'] || catMap['Moradia'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
    },
    {
      descricao: 'Conta de luz - Enel',
      valor: -180.50,
      data: subDays(hoje, 8),
      tipo: 'despesa',
      categoria_id: catMap['Energia'] || catMap['Moradia'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
    },
    {
      descricao: 'Conta de água - Sabesp',
      valor: -95.30,
      data: subDays(hoje, 7),
      tipo: 'despesa',
      categoria_id: catMap['Água'] || catMap['Moradia'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
    },
    {
      descricao: 'Internet - banda larga',
      valor: -120.00,
      data: subDays(hoje, 10),
      tipo: 'despesa',
      categoria_id: catMap['Internet'] || catMap['Moradia'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
    },

    // === SAÚDE ===
    {
      descricao: 'Consulta médica',
      valor: -280.00,
      data: subDays(hoje, 12),
      tipo: 'despesa',
      categoria_id: catMap['Consultas'] || catMap['Saúde'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Extraordinário'],
    },
    {
      descricao: 'Farmácia - medicamentos',
      valor: -156.80,
      data: subDays(hoje, 11),
      tipo: 'despesa',
      categoria_id: catMap['Medicamentos'] || catMap['Saúde'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial'],
    },
    {
      descricao: 'Academia - mensalidade',
      valor: -89.90,
      data: addDays(inicioMes, 3),
      tipo: 'despesa',
      categoria_id: catMap['Academia'] || catMap['Saúde'],
      conta_id: contaPrincipal.id,
      tags: ['Importante', 'Recorrente'],
    },

    // === EDUCAÇÃO ===
    {
      descricao: 'Curso online - Udemy',
      valor: -79.90,
      data: subDays(hoje, 15),
      tipo: 'despesa',
      categoria_id: catMap['Cursos'] || catMap['Educação'],
      conta_id: contaPrincipal.id,
      tags: ['Importante'],
      observacoes: 'Curso de programação',
    },
    {
      descricao: 'Livros técnicos - Amazon',
      valor: -120.00,
      data: subDays(hoje, 18),
      tipo: 'despesa',
      categoria_id: catMap['Livros'] || catMap['Educação'],
      conta_id: contaPrincipal.id,
      tags: ['Importante'],
    },

    // === LAZER ===
    {
      descricao: 'Cinema - ingressos',
      valor: -80.00,
      data: subDays(hoje, 4),
      tipo: 'despesa',
      categoria_id: catMap['Cinema'] || catMap['Lazer'],
      conta_id: contaPrincipal.id,
      tags: ['Supérfluo'],
    },
    {
      descricao: 'Netflix - mensalidade',
      valor: -55.90,
      data: addDays(inicioMes, 15),
      tipo: 'despesa',
      categoria_id: catMap['Streaming'] || catMap['Lazer'],
      conta_id: contaPrincipal.id,
      tags: ['Importante', 'Recorrente'],
    },
    {
      descricao: 'Spotify Premium',
      valor: -21.90,
      data: addDays(inicioMes, 18),
      tipo: 'despesa',
      categoria_id: catMap['Streaming'] || catMap['Lazer'],
      conta_id: contaPrincipal.id,
      tags: ['Importante', 'Recorrente'],
    },

    // === VESTUÁRIO ===
    {
      descricao: 'Roupas - Renner',
      valor: -289.90,
      data: subDays(hoje, 9),
      tipo: 'despesa',
      categoria_id: catMap['Roupas'] || catMap['Vestuário'],
      conta_id: contaPrincipal.id,
      tags: ['Importante'],
    },
    {
      descricao: 'Tênis esportivo',
      valor: -350.00,
      data: subDays(hoje, 14),
      tipo: 'despesa',
      categoria_id: catMap['Calçados'] || catMap['Vestuário'],
      conta_id: contaPrincipal.id,
      tags: ['Importante', 'Extraordinário'],
    },

    // === OUTROS ===
    {
      descricao: 'Pet shop - ração',
      valor: -145.00,
      data: subDays(hoje, 13),
      tipo: 'despesa',
      categoria_id: catMap['Pet'] || catMap['Outros'],
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
    },
    {
      descricao: 'Presentes - aniversário',
      valor: -180.00,
      data: subDays(hoje, 16),
      tipo: 'despesa',
      categoria_id: catMap['Presentes'] || catMap['Outros'],
      conta_id: contaPrincipal.id,
      tags: ['Extraordinário'],
    },

    // === RECEITAS ===
    {
      descricao: 'Salário - outubro',
      valor: 5500.00,
      data: addDays(inicioMes, 5),
      tipo: 'receita',
      categoria_id: catMap['Salário'] || categorias.find(c => c.tipo === 'receita')?.id || categorias[0].id,
      conta_id: contaPrincipal.id,
      tags: ['Essencial', 'Recorrente'],
    },
    {
      descricao: 'Freelance - projeto web',
      valor: 1200.00,
      data: subDays(hoje, 7),
      tipo: 'receita',
      categoria_id: catMap['Trabalho Autônomo'] || catMap['Salário'] || categorias.find(c => c.tipo === 'receita')?.id || categorias[0].id,
      conta_id: contaPrincipal.id,
      tags: ['Importante', 'Extraordinário'],
      observacoes: 'Desenvolvimento de landing page',
    },
    {
      descricao: 'Venda no Mercado Livre',
      valor: 250.00,
      data: subDays(hoje, 10),
      tipo: 'receita',
      categoria_id: catMap['Vendas'] || categorias.find(c => c.tipo === 'receita')?.id || categorias[0].id,
      conta_id: contaPrincipal.id,
      tags: ['Extraordinário'],
    },
  ];

  // Inserir transações
  const now = new Date();
  const { generateHash } = await import('../utils/format');
  const transacoesParaInserir = await Promise.all(transacoesMock.map(async (t) => {
    const hashInput = `${t.conta_id}-${t.data.toISOString()}-${t.descricao}-${t.valor}`;
    return {
      id: crypto.randomUUID(),
      ...t,
      tags: t.tags ? JSON.stringify(t.tags) : undefined, // Convert tags array to JSON string
      parcelado: false,
      classificacao_confirmada: true,
      classificacao_origem: 'manual' as const,
      hash: await generateHash(hashInput),
      created_at: now,
      updated_at: now,
    };
  }));

  await db.transacoes.bulkAdd(transacoesParaInserir);

  console.log(`✅ ${transacoesParaInserir.length} transações mock criadas com sucesso!`);
  console.log(`   - ${transacoesParaInserir.filter(t => t.tipo === 'receita').length} receitas`);
  console.log(`   - ${transacoesParaInserir.filter(t => t.tipo === 'despesa').length} despesas`);
}

/**
 * Helper para deletar todas as transações (útil para testar)
 */
export async function clearMockTransactions(): Promise<void> {
  const db = getDB();
  await db.transacoes.clear();
  console.log('✅ Todas as transações foram removidas');
}
