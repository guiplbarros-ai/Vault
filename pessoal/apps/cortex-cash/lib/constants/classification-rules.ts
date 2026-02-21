/**
 * Classification Rules — Fonte Única de Verdade
 *
 * Todas as regras de classificação automática de transações.
 * Categorias devem corresponder a nomes em CATEGORIAS_PADRAO (seed.ts).
 *
 * Tier 1: Merchants específicos (maior prioridade)
 * Tier 2: Padrões categóricos genéricos
 * Tier 3: Padrões muito amplos (menor prioridade)
 */

import type { TipoRegra } from '../types'

export interface ClassificationRuleDefinition {
  pattern: string
  tipo_regra: TipoRegra
  /** Nome da categoria — deve existir em CATEGORIAS_PADRAO */
  categoria: string
  /** 1=merchant específico, 2=padrão categórico, 3=genérico */
  tier: 1 | 2 | 3
}

// =============================================================================
// Regras de Classificação
// =============================================================================

export const CLASSIFICATION_RULES: ClassificationRuleDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: Merchants específicos (maior prioridade)
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Alimentação > Restaurantes ---
  { pattern: 'IFOOD', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'IFD*', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'RAPPI', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'REST POT POURRI', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'TASTE SAVASSI', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'COCO BAMBU', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'REDENTOR', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'DONA DEJA', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'METROPOLE LANCHES', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'MR. CHENEY', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'KOPENHAGEN', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'OAKBERRY', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'CERVEJARIA', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'BAR TUDO LEGAL', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'COZINHA DE FOGO', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'DONERKABAB', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'AMERICAN COOKIES', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'CAFEZIN DESTINO', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'CAFE COM LETRAS', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },
  { pattern: 'MRB CAFE', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 1 },

  // --- Alimentação > Supermercado ---
  { pattern: 'VERDEMAR', tipo_regra: 'contains', categoria: 'Supermercado', tier: 1 },
  { pattern: 'SANTO AGOSTINHO', tipo_regra: 'contains', categoria: 'Supermercado', tier: 1 },
  { pattern: 'TRADICAO*DE*MINAS', tipo_regra: 'contains', categoria: 'Supermercado', tier: 1 },
  { pattern: 'MERCADOSAUTONOMOS', tipo_regra: 'contains', categoria: 'Supermercado', tier: 1 },
  { pattern: 'CASANICOLAU', tipo_regra: 'contains', categoria: 'Supermercado', tier: 1 },
  { pattern: 'EFATAALIMENTOS', tipo_regra: 'contains', categoria: 'Supermercado', tier: 1 },

  // --- Transporte > Combustível ---
  { pattern: 'SHELL', tipo_regra: 'contains', categoria: 'Combustível', tier: 1 },
  { pattern: 'SEM PARAR', tipo_regra: 'contains', categoria: 'Transporte', tier: 1 },

  // --- Moradia > Aluguel ---
  { pattern: 'ALUGUEL', tipo_regra: 'contains', categoria: 'Aluguel', tier: 1 },
  { pattern: 'LIGIA', tipo_regra: 'contains', categoria: 'Aluguel', tier: 1 },
  { pattern: 'CONDOMINIO', tipo_regra: 'contains', categoria: 'Aluguel', tier: 1 },
  { pattern: 'LIVE UP RESIDENCE', tipo_regra: 'contains', categoria: 'Aluguel', tier: 1 },

  // --- Moradia > Contas ---
  { pattern: 'CONTA LUZ', tipo_regra: 'contains', categoria: 'Contas', tier: 1 },
  { pattern: 'CONTA DE LUZ', tipo_regra: 'contains', categoria: 'Contas', tier: 1 },
  { pattern: 'CEMIG', tipo_regra: 'contains', categoria: 'Contas', tier: 1 },
  { pattern: 'CONTA TELEFONE', tipo_regra: 'contains', categoria: 'Contas', tier: 1 },
  { pattern: 'CONTA DE TELEFONE', tipo_regra: 'contains', categoria: 'Contas', tier: 1 },
  { pattern: 'CONTA DE AGUA', tipo_regra: 'contains', categoria: 'Contas', tier: 1 },
  { pattern: 'CLARO', tipo_regra: 'contains', categoria: 'Contas', tier: 1 },

  // --- Vestuário > Roupas ---
  { pattern: 'RIACHUELO', tipo_regra: 'contains', categoria: 'Roupas', tier: 1 },
  { pattern: 'FARFETCH', tipo_regra: 'contains', categoria: 'Roupas', tier: 1 },
  { pattern: 'ARTE ENXOVAIS', tipo_regra: 'contains', categoria: 'Roupas', tier: 1 },

  // --- Vestuário > Calçados ---
  { pattern: 'AREZZO', tipo_regra: 'contains', categoria: 'Calçados', tier: 1 },
  { pattern: 'CENTAURO', tipo_regra: 'contains', categoria: 'Calçados', tier: 1 },

  // --- Saúde > Farmácia ---
  { pattern: 'DROGA RAIA', tipo_regra: 'contains', categoria: 'Farmácia', tier: 1 },
  { pattern: 'RAIA DROGASIL', tipo_regra: 'contains', categoria: 'Farmácia', tier: 1 },
  { pattern: 'SMARTFIT', tipo_regra: 'contains', categoria: 'Saúde', tier: 1 },
  { pattern: 'ALLFACE', tipo_regra: 'contains', categoria: 'Saúde', tier: 1 },
  { pattern: 'BELEZA NA WEB', tipo_regra: 'contains', categoria: 'Saúde', tier: 1 },

  // --- Saúde > Plano de Saúde ---
  { pattern: 'UNIMED', tipo_regra: 'contains', categoria: 'Plano de Saúde', tier: 1 },

  // --- Assinaturas > Streaming ---
  { pattern: 'NETFLIX', tipo_regra: 'contains', categoria: 'Streaming', tier: 1 },
  { pattern: 'SPOTIFY', tipo_regra: 'contains', categoria: 'Streaming', tier: 1 },
  { pattern: 'AMAZON MUSIC', tipo_regra: 'contains', categoria: 'Streaming', tier: 1 },
  { pattern: 'AMAZONPRIMEBR', tipo_regra: 'contains', categoria: 'Streaming', tier: 1 },
  { pattern: 'DISNEY PLUS', tipo_regra: 'contains', categoria: 'Streaming', tier: 1 },
  { pattern: 'YOUTUBE', tipo_regra: 'contains', categoria: 'Streaming', tier: 1 },

  // --- Assinaturas > Software ---
  { pattern: 'APPLE.COM/BILL', tipo_regra: 'contains', categoria: 'Software', tier: 1 },
  { pattern: 'MICROSOFT', tipo_regra: 'contains', categoria: 'Software', tier: 1 },
  { pattern: 'NOTION', tipo_regra: 'contains', categoria: 'Software', tier: 1 },

  // --- Educação > Cursos ---
  { pattern: 'UDEMY', tipo_regra: 'contains', categoria: 'Cursos', tier: 1 },

  // --- Educação > Livros ---
  { pattern: 'AMAZON KINDLE', tipo_regra: 'contains', categoria: 'Livros', tier: 1 },

  // --- Lazer > Entretenimento ---
  { pattern: 'CINEMARK', tipo_regra: 'contains', categoria: 'Entretenimento', tier: 1 },
  { pattern: 'BOLIXE', tipo_regra: 'contains', categoria: 'Entretenimento', tier: 1 },
  { pattern: 'FILARMONICA', tipo_regra: 'contains', categoria: 'Entretenimento', tier: 1 },
  { pattern: 'PLAYSTATION', tipo_regra: 'contains', categoria: 'Entretenimento', tier: 1 },
  { pattern: 'ATLETICO MINEIRO', tipo_regra: 'contains', categoria: 'Entretenimento', tier: 1 },
  { pattern: 'LIVELO', tipo_regra: 'contains', categoria: 'Lazer', tier: 1 },

  // --- Lazer > Viagens ---
  { pattern: 'AIRBNB', tipo_regra: 'contains', categoria: 'Viagens', tier: 1 },
  { pattern: 'HOTEL', tipo_regra: 'contains', categoria: 'Viagens', tier: 1 },

  // --- Impostos ---
  { pattern: 'IPTU', tipo_regra: 'contains', categoria: 'Impostos', tier: 1 },
  { pattern: 'IPVA', tipo_regra: 'contains', categoria: 'Impostos', tier: 1 },
  { pattern: 'DAS SIMPLES', tipo_regra: 'contains', categoria: 'Impostos', tier: 1 },
  { pattern: 'PAGTO ELETRONICO TRIBUTO', tipo_regra: 'contains', categoria: 'Impostos', tier: 1 },

  // --- Outros (despesa) — ex-Compras / ex-Serviços ---
  { pattern: 'LEROY MERLIN', tipo_regra: 'contains', categoria: 'Outros', tier: 1 },
  { pattern: 'MADEIRAMADEIR', tipo_regra: 'contains', categoria: 'Outros', tier: 1 },
  { pattern: 'CONCEITO OPTICO', tipo_regra: 'contains', categoria: 'Outros', tier: 1 },
  { pattern: 'ALLU', tipo_regra: 'contains', categoria: 'Outros', tier: 1 },
  { pattern: 'SHELF', tipo_regra: 'contains', categoria: 'Outros', tier: 1 },
  { pattern: 'HOLAMBELO', tipo_regra: 'contains', categoria: 'Outros', tier: 1 },
  { pattern: 'BH SHOPPING', tipo_regra: 'contains', categoria: 'Outros', tier: 1 },
  { pattern: 'CARTORIO', tipo_regra: 'contains', categoria: 'Outros', tier: 1 },
  { pattern: 'PEX*', tipo_regra: 'contains', categoria: 'Outros', tier: 1 },

  // --- Pet ---
  { pattern: 'PETZ', tipo_regra: 'contains', categoria: 'Pet', tier: 1 },
  { pattern: 'COBASI', tipo_regra: 'contains', categoria: 'Pet', tier: 1 },

  // --- Empréstimos ---
  { pattern: 'PARCELA FINANC', tipo_regra: 'contains', categoria: 'Empréstimos', tier: 1 },

  // --- Receitas ---
  { pattern: 'FOLHA PAGAMENTO', tipo_regra: 'contains', categoria: 'Salário', tier: 1 },
  { pattern: 'RENDIMENTOS', tipo_regra: 'contains', categoria: 'Juros', tier: 1 },
  { pattern: 'TED-T ELET DISP', tipo_regra: 'contains', categoria: 'Salário', tier: 1 },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: Padrões categóricos (prioridade média)
  // ═══════════════════════════════════════════════════════════════════════════

  { pattern: 'RESTAURANTE', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 2 },
  { pattern: 'PADARIA', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 2 },
  { pattern: 'CAFETERIA', tipo_regra: 'contains', categoria: 'Restaurantes', tier: 2 },
  { pattern: 'SUPERMERCADO', tipo_regra: 'contains', categoria: 'Supermercado', tier: 2 },
  { pattern: 'HORTIFRUTI', tipo_regra: 'contains', categoria: 'Supermercado', tier: 2 },
  { pattern: 'FARMACIA', tipo_regra: 'contains', categoria: 'Farmácia', tier: 2 },
  { pattern: 'DROGARIA', tipo_regra: 'contains', categoria: 'Farmácia', tier: 2 },
  { pattern: 'UBER', tipo_regra: 'contains', categoria: 'Transporte', tier: 2 },
  { pattern: 'IOF', tipo_regra: 'contains', categoria: 'Impostos', tier: 2 },
  { pattern: 'TRIBUTO', tipo_regra: 'contains', categoria: 'Impostos', tier: 2 },
  { pattern: 'SALARIO', tipo_regra: 'contains', categoria: 'Salário', tier: 2 },
  { pattern: 'SEGURO', tipo_regra: 'contains', categoria: 'Outros', tier: 2 },
  { pattern: 'PETSHOP', tipo_regra: 'contains', categoria: 'Pet', tier: 2 },
  { pattern: 'VETERINARI', tipo_regra: 'contains', categoria: 'Pet', tier: 2 },
  { pattern: 'EMPRESTIMO', tipo_regra: 'contains', categoria: 'Empréstimos', tier: 2 },
  { pattern: 'FINANCIAMENTO', tipo_regra: 'contains', categoria: 'Empréstimos', tier: 2 },
  { pattern: 'LIVRARIA', tipo_regra: 'contains', categoria: 'Livros', tier: 2 },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: Padrões genéricos (menor prioridade)
  // ═══════════════════════════════════════════════════════════════════════════

  { pattern: 'POSTO ', tipo_regra: 'contains', categoria: 'Combustível', tier: 3 },
  { pattern: 'EPA ', tipo_regra: 'contains', categoria: 'Supermercado', tier: 3 },
  { pattern: 'MERCADO', tipo_regra: 'contains', categoria: 'Supermercado', tier: 3 },
  { pattern: 'AMAZON', tipo_regra: 'contains', categoria: 'Outros', tier: 3 },
  { pattern: 'MERCADOLIVRE', tipo_regra: 'contains', categoria: 'Outros', tier: 3 },
  { pattern: 'SHOPEE', tipo_regra: 'contains', categoria: 'Outros', tier: 3 },
  { pattern: 'GOOGLE', tipo_regra: 'contains', categoria: 'Software', tier: 3 },
  { pattern: 'DEPOSITO', tipo_regra: 'contains', categoria: 'Salário', tier: 3 },
  { pattern: 'PAGTO COBRANCA', tipo_regra: 'contains', categoria: 'Outros', tier: 3 },
  { pattern: 'PAGTO ELETRON COBRANCA', tipo_regra: 'contains', categoria: 'Outros', tier: 3 },

  // Transferências — tier 3 para que regras específicas de merchants ganhem
  { pattern: 'GASTO C CREDITO', tipo_regra: 'contains', categoria: 'Transferência', tier: 3 },
  { pattern: 'TRANSFE PIX', tipo_regra: 'contains', categoria: 'Transferência', tier: 3 },
  { pattern: 'SAQUE', tipo_regra: 'contains', categoria: 'Transferência', tier: 3 },
  // NOTA: "PIX" removido — muito genérico, matcha TODAS as transações PIX
]

// =============================================================================
// Prioridade
// =============================================================================

/**
 * Atribui prioridades numéricas baseadas no tier.
 * Tier 1: 1-999 (mais específico primeiro, por comprimento do padrão)
 * Tier 2: 1000-1999
 * Tier 3: 2000-2999
 */
export function assignPriorities(
  rules: ClassificationRuleDefinition[],
): (ClassificationRuleDefinition & { prioridade: number })[] {
  const tier1: ClassificationRuleDefinition[] = []
  const tier2: ClassificationRuleDefinition[] = []
  const tier3: ClassificationRuleDefinition[] = []

  for (const rule of rules) {
    if (rule.tier === 1) tier1.push(rule)
    else if (rule.tier === 2) tier2.push(rule)
    else tier3.push(rule)
  }

  // Dentro de cada tier, padrões mais longos têm prioridade mais alta (número menor)
  const sortByLength = (a: ClassificationRuleDefinition, b: ClassificationRuleDefinition) =>
    b.pattern.length - a.pattern.length

  tier1.sort(sortByLength)
  tier2.sort(sortByLength)
  tier3.sort(sortByLength)

  const result: (ClassificationRuleDefinition & { prioridade: number })[] = []
  let priority = 1

  for (const rule of tier1) {
    result.push({ ...rule, prioridade: priority++ })
  }
  priority = 1000
  for (const rule of tier2) {
    result.push({ ...rule, prioridade: priority++ })
  }
  priority = 2000
  for (const rule of tier3) {
    result.push({ ...rule, prioridade: priority++ })
  }

  return result
}
