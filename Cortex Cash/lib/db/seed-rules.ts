/**
 * Seed de Regras de Classificação Comuns
 * Agent FINANCE: Owner
 *
 * 15 regras padrão para classificação automática de transações comuns no Brasil
 */

import { getDB } from './client';
import type { RegraClassificacao, TipoRegra } from '../types';

export interface RegraSeed {
  nome: string;
  tipo_regra: TipoRegra;
  padrao: string;
  categoria_nome: string; // Nome da categoria (será buscada no banco)
  prioridade: number;
  descricao?: string;
}

/**
 * 15 regras comuns de classificação automática
 * Ordenadas por prioridade (1 = mais importante)
 */
export const REGRAS_COMUNS: RegraSeed[] = [
  // TRANSPORTE (Prioridade 1-5)
  {
    nome: 'Uber',
    tipo_regra: 'contains',
    padrao: 'UBER',
    categoria_nome: 'Transporte',
    prioridade: 1,
    descricao: 'Viagens de Uber',
  },
  {
    nome: '99 Taxi',
    tipo_regra: 'contains',
    padrao: '99',
    categoria_nome: 'Transporte',
    prioridade: 2,
    descricao: 'Viagens de 99',
  },
  {
    nome: 'Combustível (Posto)',
    tipo_regra: 'regex',
    padrao: '(POSTO|SHELL|IPIRANGA|BR MANIA|PETROBRAS)',
    categoria_nome: 'Transporte',
    prioridade: 3,
    descricao: 'Abastecimento em postos',
  },

  // ALIMENTAÇÃO (Prioridade 6-10)
  {
    nome: 'iFood',
    tipo_regra: 'contains',
    padrao: 'IFOOD',
    categoria_nome: 'Alimentação',
    prioridade: 6,
    descricao: 'Pedidos iFood',
  },
  {
    nome: 'Rappi',
    tipo_regra: 'contains',
    padrao: 'RAPPI',
    categoria_nome: 'Alimentação',
    prioridade: 7,
    descricao: 'Pedidos Rappi',
  },
  {
    nome: 'Restaurantes',
    tipo_regra: 'regex',
    padrao: '(RESTAURANTE|LANCHONETE|PIZZARIA|HAMBURGUER|PADARIA)',
    categoria_nome: 'Alimentação',
    prioridade: 8,
    descricao: 'Restaurantes e lanchonetes',
  },
  {
    nome: 'Mercado/Supermercado',
    tipo_regra: 'regex',
    padrao: '(MERCADO|SUPERMERCADO|EXTRA|CARREFOUR|PAO DE ACUCAR|ATACADAO)',
    categoria_nome: 'Alimentação',
    prioridade: 9,
    descricao: 'Compras em supermercados',
  },

  // ENTRETENIMENTO (Prioridade 11-15)
  {
    nome: 'Netflix',
    tipo_regra: 'contains',
    padrao: 'NETFLIX',
    categoria_nome: 'Entretenimento',
    prioridade: 11,
    descricao: 'Assinatura Netflix',
  },
  {
    nome: 'Spotify',
    tipo_regra: 'contains',
    padrao: 'SPOTIFY',
    categoria_nome: 'Entretenimento',
    prioridade: 12,
    descricao: 'Assinatura Spotify',
  },
  {
    nome: 'Amazon Prime',
    tipo_regra: 'contains',
    padrao: 'AMAZON PRIME',
    categoria_nome: 'Entretenimento',
    prioridade: 13,
    descricao: 'Assinatura Amazon Prime',
  },
  {
    nome: 'Disney+',
    tipo_regra: 'regex',
    padrao: '(DISNEY|DISNEYPLUS)',
    categoria_nome: 'Entretenimento',
    prioridade: 14,
    descricao: 'Assinatura Disney+',
  },
  {
    nome: 'YouTube Premium',
    tipo_regra: 'contains',
    padrao: 'YOUTUBE PREMIUM',
    categoria_nome: 'Entretenimento',
    prioridade: 15,
    descricao: 'Assinatura YouTube Premium',
  },

  // UTILIDADES (Prioridade 16-20)
  {
    nome: 'Conta de Luz',
    tipo_regra: 'regex',
    padrao: '(CEMIG|COPEL|ELETROPAULO|LIGHT|CELPE|COELBA)',
    categoria_nome: 'Casa',
    prioridade: 16,
    descricao: 'Conta de energia elétrica',
  },
  {
    nome: 'Internet/TV',
    tipo_regra: 'regex',
    padrao: '(CLARO|VIVO|TIM|OI|SKY|NET|VIRTUA)',
    categoria_nome: 'Casa',
    prioridade: 17,
    descricao: 'Internet, TV a cabo e telefonia',
  },
  {
    nome: 'Água/Saneamento',
    tipo_regra: 'regex',
    padrao: '(SABESP|CEDAE|COPASA|CAESB|SANEPAR)',
    categoria_nome: 'Casa',
    prioridade: 18,
    descricao: 'Conta de água',
  },

  // SAÚDE (Prioridade 21-22)
  {
    nome: 'Farmácia',
    tipo_regra: 'regex',
    padrao: '(FARMACIA|DROGARIA|DROGA RAIA|PACHECO|DROGASIL|EXTRAFARMA)',
    categoria_nome: 'Saúde',
    prioridade: 21,
    descricao: 'Compras em farmácias',
  },
];

/**
 * Faz seed das regras comuns no banco de dados
 * Idempotente: não duplica regras existentes
 *
 * @returns Número de regras inseridas
 */
export async function seedCommonRules(): Promise<{
  inserted: number;
  skipped: number;
  errors: string[];
}> {
  const db = getDB();
  const now = new Date();

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  console.log('🌱 Iniciando seed de regras comuns...');

  for (const regraSeed of REGRAS_COMUNS) {
    try {
      // Busca categoria pelo nome
      const categoria = await db.categorias
        .filter(c => c.nome.toLowerCase() === regraSeed.categoria_nome.toLowerCase())
        .first();

      if (!categoria) {
        errors.push(`Categoria não encontrada: ${regraSeed.categoria_nome} (regra: ${regraSeed.nome})`);
        skipped++;
        continue;
      }

      // Verifica se regra já existe (pelo nome)
      const existingRegra = await db.regras_classificacao
        .filter(r => r.nome.toLowerCase() === regraSeed.nome.toLowerCase())
        .first();

      if (existingRegra) {
        console.log(`  ⏭️  Regra já existe: ${regraSeed.nome}`);
        skipped++;
        continue;
      }

      // Cria regra
      const regra: RegraClassificacao = {
        id: crypto.randomUUID(),
        categoria_id: categoria.id,
        nome: regraSeed.nome,
        tipo_regra: regraSeed.tipo_regra,
        padrao: regraSeed.padrao,
        prioridade: regraSeed.prioridade,
        ativa: true,
        usuario_id: 'usuario-producao',
        total_aplicacoes: 0,
        ultima_aplicacao: undefined,
        total_confirmacoes: 0,
        total_rejeicoes: 0,
        created_at: now,
        updated_at: now,
      };

      try {
        await db.regras_classificacao.add(regra);
        console.log(`  ✅ Regra criada: ${regraSeed.nome} → ${categoria.nome}`);
      } catch (error: any) {
        if (error?.name !== 'ConstraintError') {
          throw error;
        }
        console.log(`  ⚠️ Regra ${regraSeed.nome} já existe, pulando...`);
        continue;
      }
      inserted++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push(`${regraSeed.nome}: ${message}`);
      console.error(`  ❌ Erro ao criar regra ${regraSeed.nome}:`, error);
    }
  }

  console.log(`\n📊 Resultado do seed:`);
  console.log(`  ✅ Inseridas: ${inserted}`);
  console.log(`  ⏭️  Puladas: ${skipped}`);
  console.log(`  ❌ Erros: ${errors.length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Erros encontrados:`);
    errors.forEach(err => console.log(`  - ${err}`));
  }

  return { inserted, skipped, errors };
}

/**
 * Remove todas as regras de seed (útil para reset)
 */
export async function clearCommonRules(): Promise<number> {
  const db = getDB();

  const nomesSeed = REGRAS_COMUNS.map(r => r.nome.toLowerCase());

  const regrasParaRemover = await db.regras_classificacao
    .filter(r => nomesSeed.includes(r.nome.toLowerCase()))
    .toArray();

  for (const regra of regrasParaRemover) {
    await db.regras_classificacao.delete(regra.id);
  }

  console.log(`🗑️  Removidas ${regrasParaRemover.length} regras de seed`);
  return regrasParaRemover.length;
}
