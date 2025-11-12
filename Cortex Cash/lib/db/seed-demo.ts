/**
 * Seed de Dados Demo
 * Agent APP: Owner
 *
 * Popula o banco com dados de exemplo para demonstração
 */

import { getDB } from './client';
import { contaService } from '../services/conta.service';
import { instituicaoService } from '../services/instituicao.service';
import { transacaoService } from '../services/transacao.service';
import { categoriaService } from '../services/categoria.service';
import { tagService } from '../services/tag.service';
import { seedCategorias } from './seed';
import type { Instituicao, Conta, Transacao, Categoria, TipoConta } from '../types';

/**
 * Seed de dados demo completo
 */
export async function seedDemoData() {
  // Verificação: só funciona no browser
  if (typeof window === 'undefined') {
    throw new Error('seedDemoData só pode ser executado no navegador');
  }

  console.log('[DEMO SEED] Iniciando seed de dados demo...');

  try {
    // 1. Verificar se já existem dados
    console.log('[DEMO SEED] Passo 1: Verificando dados existentes...');
    const existingContas = await contaService.listContas();
    console.log(`[DEMO SEED] Encontradas ${existingContas.length} contas`);

    if (existingContas.length > 0) {
      console.log('[DEMO SEED] Dados já existem. Limpando antes de popular...');
      await clearAllData();
      console.log('[DEMO SEED] Dados limpos com sucesso');
    }

    // 2. Criar instituições
    console.log('[DEMO SEED] Passo 2: Criando instituições...');
    const instituicoes = await seedInstituicoes();
    console.log(`[DEMO SEED] ✅ ${instituicoes.length} instituições criadas`);

    // 3. Criar contas
    console.log('[DEMO SEED] Passo 3: Criando contas...');
    const contas = await seedContas(instituicoes);
    console.log(`[DEMO SEED] ✅ ${contas.length} contas criadas`);

    // 4. Criar categorias padrão (se não existirem)
    console.log('[DEMO SEED] Passo 4: Criando categorias padrão...');
    const db = getDB();
    await seedCategorias(db);
    console.log('[DEMO SEED] ✅ Categorias padrão criadas');

    // 5. Criar tags padrão
    console.log('[DEMO SEED] Passo 5: Criando tags padrão...');
    await seedTags();
    console.log('[DEMO SEED] ✅ Tags padrão criadas');

    // 6. Verificar categorias
    console.log('[DEMO SEED] Passo 6: Verificando categorias...');
    const categorias = await categoriaService.listCategorias();
    console.log(`[DEMO SEED] ✅ ${categorias.length} categorias encontradas`);

    // 7. Criar transações
    console.log('[DEMO SEED] Passo 7: Criando transações (isso pode demorar)...');
    const transacoes = await seedTransacoes(contas, categorias);
    console.log(`[DEMO SEED] ✅ ${transacoes.length} transações criadas`);

    // 8. Recalcular saldos de todas as contas
    console.log('[DEMO SEED] Passo 8: Recalculando saldos...');
    for (let i = 0; i < contas.length; i++) {
      const conta = contas[i];
      console.log(`[DEMO SEED] Recalculando saldo da conta ${i + 1}/${contas.length}: ${conta.nome}`);
      await contaService.recalcularESalvarSaldo(conta.id);
    }
    console.log('[DEMO SEED] ✅ Saldos recalculados');

    console.log('[DEMO SEED] ✅✅✅ Seed de dados demo concluído com sucesso!');

    return {
      instituicoes: instituicoes.length,
      contas: contas.length,
      categorias: categorias.length,
      transacoes: transacoes.length,
    };
  } catch (error) {
    console.error('[DEMO SEED] ❌❌❌ Erro ao popular dados demo:', error);
    if (error instanceof Error) {
      console.error('[DEMO SEED] Mensagem:', error.message);
      console.error('[DEMO SEED] Stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Limpa todos os dados do banco
 */
async function clearAllData() {
  const db = getDB();

  await db.transaction('rw', [
    db.transacoes,
    db.contas,
    db.instituicoes,
  ], async () => {
    await db.transacoes.clear();
    await db.contas.clear();
    await db.instituicoes.clear();
  });

  console.log('[DEMO SEED] Dados limpos');
}

/**
 * Cria instituições de exemplo
 */
async function seedInstituicoes(): Promise<Instituicao[]> {
  const instituicoesData = [
    {
      nome: 'Nubank',
      codigo: '260',
      cor: '#8A05BE',
    },
    {
      nome: 'Banco do Brasil',
      codigo: '001',
      cor: '#FFF100',
    },
    {
      nome: 'Itaú Unibanco',
      codigo: '341',
      cor: '#EC7000',
    },
    {
      nome: 'Inter',
      codigo: '077',
      cor: '#FF7A00',
    },
    {
      nome: 'C6 Bank',
      codigo: '336',
      cor: '#000000',
    },
  ];

  const instituicoes: Instituicao[] = [];

  for (const data of instituicoesData) {
    const instituicao = await instituicaoService.createInstituicao(data);
    instituicoes.push(instituicao);
  }

  return instituicoes;
}

/**
 * Cria contas de exemplo
 */
async function seedContas(instituicoes: Instituicao[]): Promise<Conta[]> {
  const contasData: Array<{
    instituicao_id: string;
    nome: string;
    tipo: TipoConta;
    saldo_inicial: number;
    cor?: string;
    icone?: string;
    agencia?: string;
    numero?: string;
  }> = [
    {
      instituicao_id: instituicoes[0].id, // Nubank
      nome: 'Conta Corrente Nubank',
      tipo: 'corrente',
      saldo_inicial: 5420.50,
      cor: '#8A05BE',
      agencia: '0001',
      numero: '12345678-9',
    },
    {
      instituicao_id: instituicoes[0].id, // Nubank
      nome: 'Poupança Nubank',
      tipo: 'poupanca',
      saldo_inicial: 12000.00,
      cor: '#8A05BE',
    },
    {
      instituicao_id: instituicoes[1].id, // Banco do Brasil
      nome: 'Conta Salário BB',
      tipo: 'corrente',
      saldo_inicial: 850.00,
      cor: '#FFF100',
      agencia: '1234-5',
      numero: '56789-0',
    },
    {
      instituicao_id: instituicoes[2].id, // Itaú
      nome: 'Investimentos Itaú',
      tipo: 'investimento',
      saldo_inicial: 25000.00,
      cor: '#EC7000',
    },
    {
      instituicao_id: instituicoes[3].id, // Inter
      nome: 'Conta Digital Inter',
      tipo: 'corrente',
      saldo_inicial: 3200.00,
      cor: '#FF7A00',
    },
    {
      instituicao_id: instituicoes[0].id, // Nubank (carteira)
      nome: 'Carteira',
      tipo: 'carteira',
      saldo_inicial: 350.00,
      cor: '#10b981',
    },
  ];

  const contas: Conta[] = [];

  for (const data of contasData) {
    const conta = await contaService.createConta({
      ...data,
      saldo_referencia: data.saldo_inicial, // User é soberano!
      data_referencia: new Date(),
      ativa: true,
      saldo_atual: data.saldo_inicial, // Será recalculado depois
      usuario_id: 'usuario-producao', // Será sobrescrito com o usuário atual no service
    });
    contas.push(conta);
  }

  return contas;
}

/**
 * Cria tags padrão
 */
async function seedTags(): Promise<void> {
  const tagsPadrao = [
    { nome: 'fixo', cor: '#4A90E2' },
    { nome: 'variável', cor: '#F5A623' },
    { nome: 'mensal', cor: '#7ED321' },
    { nome: 'anual', cor: '#50E3C2' },
    { nome: 'salário', cor: '#8B572A' },
    { nome: 'freelance', cor: '#9013FE' },
    { nome: 'extra', cor: '#BD10E0' },
    { nome: 'design', cor: '#4A4A4A' },
    { nome: 'moradia', cor: '#D0021B' },
    { nome: 'alimentação', cor: '#F8E71C' },
    { nome: 'transporte', cor: '#417505' },
    { nome: 'uber', cor: '#000000' },
    { nome: 'restaurante', cor: '#FF6B6B' },
    { nome: 'internet', cor: '#4ECDC4' },
    { nome: 'energia', cor: '#FFD93D' },
    { nome: 'saúde', cor: '#6BCF7F' },
    { nome: 'academia', cor: '#FF8B94' },
    { nome: 'lazer', cor: '#C44569' },
    { nome: 'entretenimento', cor: '#A8E6CF' },
    { nome: 'educação', cor: '#3498DB' },
    { nome: 'livros', cor: '#9B59B6' },
    { nome: 'streaming', cor: '#E74C3C' },
    { nome: 'música', cor: '#1DB954' },
  ];

  const existingTags = await tagService.listTags();
  const existingTagNames = new Set(existingTags.map(t => t.nome.toLowerCase()));

  for (const tagData of tagsPadrao) {
    if (!existingTagNames.has(tagData.nome.toLowerCase())) {
      try {
        await tagService.createTag(tagData);
        console.log(`[SEED] Tag criada: ${tagData.nome}`);
      } catch (error) {
        console.warn(`[SEED] Erro ao criar tag ${tagData.nome}:`, error);
      }
    } else {
      console.log(`[SEED] Tag já existe: ${tagData.nome}`);
    }
  }
}

/**
 * Cria transações de exemplo para os últimos 3 meses
 */
async function seedTransacoes(contas: Conta[], categorias: Categoria[]): Promise<Transacao[]> {
  const transacoes: Transacao[] = [];

  // Categorias comuns - busca por tipo também
  console.log('[SEED] Categorias disponíveis:', categorias.map(c => `${c.nome} (${c.tipo})`).join(', '));

  const catSalario = categorias.find(c => c.tipo === 'receita' && c.nome.toLowerCase().includes('salário'))
    || categorias.find(c => c.tipo === 'receita');
  const catAlimentacao = categorias.find(c => c.tipo === 'despesa' && c.nome.toLowerCase().includes('alimentação'))
    || categorias.find(c => c.tipo === 'despesa');
  const catTransporte = categorias.find(c => c.tipo === 'despesa' && c.nome.toLowerCase().includes('transporte'))
    || categorias.find(c => c.tipo === 'despesa');
  const catMoradia = categorias.find(c => c.tipo === 'despesa' && (c.nome.toLowerCase().includes('moradia') || c.nome.toLowerCase().includes('casa')))
    || categorias.find(c => c.tipo === 'despesa');
  const catLazer = categorias.find(c => c.tipo === 'despesa' && c.nome.toLowerCase().includes('lazer'))
    || categorias.find(c => c.tipo === 'despesa');
  const catSaude = categorias.find(c => c.tipo === 'despesa' && c.nome.toLowerCase().includes('saúde'))
    || categorias.find(c => c.tipo === 'despesa');
  const catEducacao = categorias.find(c => c.tipo === 'despesa' && c.nome.toLowerCase().includes('educação'))
    || categorias.find(c => c.tipo === 'despesa');

  console.log('[SEED] Categorias selecionadas:');
  console.log('  - Salário:', catSalario?.nome || '❌ NÃO ENCONTRADA');
  console.log('  - Alimentação:', catAlimentacao?.nome || '❌ NÃO ENCONTRADA');
  console.log('  - Transporte:', catTransporte?.nome || '❌ NÃO ENCONTRADA');
  console.log('  - Moradia:', catMoradia?.nome || '❌ NÃO ENCONTRADA');
  console.log('  - Lazer:', catLazer?.nome || '❌ NÃO ENCONTRADA');
  console.log('  - Saúde:', catSaude?.nome || '❌ NÃO ENCONTRADA');
  console.log('  - Educação:', catEducacao?.nome || '❌ NÃO ENCONTRADA');

  // Verificar se alguma categoria essencial não foi encontrada
  if (!catSalario || !catAlimentacao || !catTransporte || !catMoradia) {
    console.warn('[SEED] ⚠️ ATENÇÃO: Algumas categorias essenciais não foram encontradas!');
    console.warn('[SEED] As transações podem ficar sem categoria. Execute o seed inicial de categorias primeiro.');
  }

  // Contas
  const contaCorrente = contas.find(c => c.tipo === 'corrente');
  const contaPoupanca = contas.find(c => c.tipo === 'poupanca');
  const contaCarteira = contas.find(c => c.tipo === 'carteira');

  if (!contaCorrente) {
    throw new Error('Conta corrente não encontrada');
  }

  // Gerar transações dos últimos 6 meses (180 dias)
  const hoje = new Date();
  const transacoesData: Array<{
    conta_id: string;
    categoria_id?: string;
    data: Date;
    descricao: string;
    valor: number;
    tipo: 'receita' | 'despesa';
    tags?: string[];
  }> = [];

  // RECEITAS (mensal) - 6 meses
  for (let mes = 0; mes < 6; mes++) {
    const dataSalario = new Date(hoje);
    dataSalario.setMonth(dataSalario.getMonth() - mes);
    dataSalario.setDate(5); // Dia 5 de cada mês

    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catSalario?.id,
      data: dataSalario,
      descricao: 'Salário Mensal',
      valor: 8500.00,
      tipo: 'receita',
      tags: ['salário', 'fixo', 'mensal'],
    });

    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catSalario?.id,
      data: new Date(dataSalario.getTime() + 2 * 24 * 60 * 60 * 1000),
      descricao: 'Freela Design',
      valor: 1200.00,
      tipo: 'receita',
      tags: ['freelance', 'extra', 'design'],
    });
  }

  // DESPESAS FIXAS (mensal) - 6 meses
  for (let mes = 0; mes < 6; mes++) {
    const dataBase = new Date(hoje);
    dataBase.setMonth(dataBase.getMonth() - mes);

    // Aluguel
    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catMoradia?.id,
      data: new Date(dataBase.getFullYear(), dataBase.getMonth(), 10),
      descricao: 'Aluguel',
      valor: 2200.00,
      tipo: 'despesa',
      tags: ['fixo', 'mensal', 'moradia'],
    });

    // Condomínio
    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catMoradia?.id,
      data: new Date(dataBase.getFullYear(), dataBase.getMonth(), 15),
      descricao: 'Condomínio',
      valor: 450.00,
      tipo: 'despesa',
      tags: ['fixo', 'mensal'],
    });

    // Internet
    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catMoradia?.id,
      data: new Date(dataBase.getFullYear(), dataBase.getMonth(), 20),
      descricao: 'Internet Fibra',
      valor: 119.90,
      tipo: 'despesa',
      tags: ['fixo', 'internet', 'mensal'],
    });

    // Energia
    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catMoradia?.id,
      data: new Date(dataBase.getFullYear(), dataBase.getMonth(), 18),
      descricao: 'Conta de Luz',
      valor: 280.50,
      tipo: 'despesa',
      tags: ['fixo', 'energia', 'mensal'],
    });
  }

  // DESPESAS VARIÁVEIS (semanais) - 6 meses = 24 semanas
  for (let semana = 0; semana < 24; semana++) {
    const dataSemana = new Date(hoje);
    dataSemana.setDate(dataSemana.getDate() - (semana * 7));

    // Mercado
    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catAlimentacao?.id,
      data: dataSemana,
      descricao: 'Supermercado',
      valor: Math.random() * 300 + 200, // R$ 200-500
      tipo: 'despesa',
      tags: ['alimentação', 'variável'],
    });

    // Uber/Transporte
    transacoesData.push({
      conta_id: contaCarteira?.id || contaCorrente.id,
      categoria_id: catTransporte?.id,
      data: new Date(dataSemana.getTime() + 2 * 24 * 60 * 60 * 1000),
      descricao: 'Uber',
      valor: Math.random() * 40 + 20, // R$ 20-60
      tipo: 'despesa',
      tags: ['transporte', 'variável', 'uber'],
    });

    // Almoço/Jantar fora
    transacoesData.push({
      conta_id: contaCarteira?.id || contaCorrente.id,
      categoria_id: catAlimentacao?.id,
      data: new Date(dataSemana.getTime() + 3 * 24 * 60 * 60 * 1000),
      descricao: 'Restaurante',
      valor: Math.random() * 80 + 40, // R$ 40-120
      tipo: 'despesa',
      tags: ['alimentação', 'restaurante', 'variável'],
    });
  }

  // DESPESAS OCASIONAIS
  const despesasOcasionais = [
    {
      descricao: 'Academia (Mensalidade)',
      valor: 149.90,
      categoria_id: catSaude?.id,
      dias_atras: 10,
      tags: ['saúde', 'fixo', 'academia'],
    },
    {
      descricao: 'Farmácia',
      valor: 87.50,
      categoria_id: catSaude?.id,
      dias_atras: 15,
      tags: ['saúde', 'variável'],
    },
    {
      descricao: 'Cinema',
      valor: 68.00,
      categoria_id: catLazer?.id,
      dias_atras: 20,
      tags: ['lazer', 'entretenimento', 'variável'],
    },
    {
      descricao: 'Livros',
      valor: 125.00,
      categoria_id: catEducacao?.id,
      dias_atras: 25,
      tags: ['educação', 'livros', 'variável'],
    },
    {
      descricao: 'Streaming (Netflix)',
      valor: 55.90,
      categoria_id: catLazer?.id,
      dias_atras: 5,
      tags: ['streaming', 'fixo', 'mensal'],
    },
    {
      descricao: 'Spotify Premium',
      valor: 21.90,
      categoria_id: catLazer?.id,
      dias_atras: 7,
      tags: ['streaming', 'música', 'fixo'],
    },
  ];

  for (const despesa of despesasOcasionais) {
    const data = new Date(hoje);
    data.setDate(data.getDate() - despesa.dias_atras);

    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: despesa.categoria_id,
      data,
      descricao: despesa.descricao,
      valor: despesa.valor,
      tipo: 'despesa',
      tags: despesa.tags,
    });
  }

  // Criar todas as transações
  for (const data of transacoesData) {
    const transacao = await transacaoService.createTransacao({
      ...data,
    });
    transacoes.push(transacao);
  }

  return transacoes;
}

/**
 * Limpa apenas os dados demo (mantém categorias e tags padrão)
 */
export async function clearDemoData() {
  console.log('[DEMO CLEAR] Limpando dados demo...');

  try {
    await clearAllData();
    console.log('[DEMO CLEAR] ✅ Dados demo limpos com sucesso!');
  } catch (error) {
    console.error('[DEMO CLEAR] ❌ Erro ao limpar dados demo:', error);
    throw error;
  }
}
