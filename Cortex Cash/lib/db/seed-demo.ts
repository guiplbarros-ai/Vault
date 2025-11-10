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
import type { Instituicao, Conta, Transacao, Categoria, TipoConta } from '../types';

/**
 * Seed de dados demo completo
 */
export async function seedDemoData() {
  console.log('[DEMO SEED] Iniciando seed de dados demo...');

  try {
    // 1. Verificar se já existem dados
    const existingContas = await contaService.listContas();
    if (existingContas.length > 0) {
      console.log('[DEMO SEED] Dados já existem. Limpando antes de popular...');
      await clearAllData();
    }

    // 2. Criar instituições
    const instituicoes = await seedInstituicoes();
    console.log(`[DEMO SEED] ${instituicoes.length} instituições criadas`);

    // 3. Criar contas
    const contas = await seedContas(instituicoes);
    console.log(`[DEMO SEED] ${contas.length} contas criadas`);

    // 4. Verificar categorias (devem existir do seed inicial)
    const categorias = await categoriaService.listCategorias();
    console.log(`[DEMO SEED] ${categorias.length} categorias encontradas`);

    // 5. Criar transações
    const transacoes = await seedTransacoes(contas, categorias);
    console.log(`[DEMO SEED] ${transacoes.length} transações criadas`);

    // 6. Recalcular saldos de todas as contas
    for (const conta of contas) {
      await contaService.recalcularESalvarSaldo(conta.id);
    }
    console.log('[DEMO SEED] Saldos recalculados');

    console.log('[DEMO SEED] ✅ Seed de dados demo concluído com sucesso!');

    return {
      instituicoes: instituicoes.length,
      contas: contas.length,
      categorias: categorias.length,
      transacoes: transacoes.length,
    };
  } catch (error) {
    console.error('[DEMO SEED] ❌ Erro ao popular dados demo:', error);
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
      ativa: true,
      saldo_atual: data.saldo_inicial, // Será recalculado depois
    });
    contas.push(conta);
  }

  return contas;
}

/**
 * Cria transações de exemplo para os últimos 3 meses
 */
async function seedTransacoes(contas: Conta[], categorias: Categoria[]): Promise<Transacao[]> {
  const transacoes: Transacao[] = [];

  // Categorias comuns
  const catSalario = categorias.find(c => c.nome.toLowerCase().includes('salário'));
  const catAlimentacao = categorias.find(c => c.nome.toLowerCase().includes('alimentação'));
  const catTransporte = categorias.find(c => c.nome.toLowerCase().includes('transporte'));
  const catMoradia = categorias.find(c => c.nome.toLowerCase().includes('moradia'));
  const catLazer = categorias.find(c => c.nome.toLowerCase().includes('lazer'));
  const catSaude = categorias.find(c => c.nome.toLowerCase().includes('saúde'));
  const catEducacao = categorias.find(c => c.nome.toLowerCase().includes('educação'));

  // Contas
  const contaCorrente = contas.find(c => c.tipo === 'corrente');
  const contaPoupanca = contas.find(c => c.tipo === 'poupanca');
  const contaCarteira = contas.find(c => c.tipo === 'carteira');

  if (!contaCorrente) {
    throw new Error('Conta corrente não encontrada');
  }

  // Gerar transações dos últimos 90 dias
  const hoje = new Date();
  const transacoesData: Array<{
    conta_id: string;
    categoria_id?: string;
    data: Date;
    descricao: string;
    valor: number;
    tipo: 'receita' | 'despesa';
  }> = [];

  // RECEITAS (mensal)
  for (let mes = 0; mes < 3; mes++) {
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
    });

    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catSalario?.id,
      data: new Date(dataSalario.getTime() + 2 * 24 * 60 * 60 * 1000),
      descricao: 'Freela Design',
      valor: 1200.00,
      tipo: 'receita',
    });
  }

  // DESPESAS FIXAS (mensal)
  for (let mes = 0; mes < 3; mes++) {
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
    });

    // Condomínio
    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catMoradia?.id,
      data: new Date(dataBase.getFullYear(), dataBase.getMonth(), 15),
      descricao: 'Condomínio',
      valor: 450.00,
      tipo: 'despesa',
    });

    // Internet
    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catMoradia?.id,
      data: new Date(dataBase.getFullYear(), dataBase.getMonth(), 20),
      descricao: 'Internet Fibra',
      valor: 119.90,
      tipo: 'despesa',
    });

    // Energia
    transacoesData.push({
      conta_id: contaCorrente.id,
      categoria_id: catMoradia?.id,
      data: new Date(dataBase.getFullYear(), dataBase.getMonth(), 18),
      descricao: 'Conta de Luz',
      valor: 280.50,
      tipo: 'despesa',
    });
  }

  // DESPESAS VARIÁVEIS (semanais)
  for (let semana = 0; semana < 12; semana++) {
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
    });

    // Uber/Transporte
    transacoesData.push({
      conta_id: contaCarteira?.id || contaCorrente.id,
      categoria_id: catTransporte?.id,
      data: new Date(dataSemana.getTime() + 2 * 24 * 60 * 60 * 1000),
      descricao: 'Uber',
      valor: Math.random() * 40 + 20, // R$ 20-60
      tipo: 'despesa',
    });

    // Almoço/Jantar fora
    transacoesData.push({
      conta_id: contaCarteira?.id || contaCorrente.id,
      categoria_id: catAlimentacao?.id,
      data: new Date(dataSemana.getTime() + 3 * 24 * 60 * 60 * 1000),
      descricao: 'Restaurante',
      valor: Math.random() * 80 + 40, // R$ 40-120
      tipo: 'despesa',
    });
  }

  // DESPESAS OCASIONAIS
  const despesasOcasionais = [
    {
      descricao: 'Academia (Mensalidade)',
      valor: 149.90,
      categoria_id: catSaude?.id,
      dias_atras: 10,
    },
    {
      descricao: 'Farmácia',
      valor: 87.50,
      categoria_id: catSaude?.id,
      dias_atras: 15,
    },
    {
      descricao: 'Cinema',
      valor: 68.00,
      categoria_id: catLazer?.id,
      dias_atras: 20,
    },
    {
      descricao: 'Livros',
      valor: 125.00,
      categoria_id: catEducacao?.id,
      dias_atras: 25,
    },
    {
      descricao: 'Streaming (Netflix)',
      valor: 55.90,
      categoria_id: catLazer?.id,
      dias_atras: 5,
    },
    {
      descricao: 'Spotify Premium',
      valor: 21.90,
      categoria_id: catLazer?.id,
      dias_atras: 7,
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
