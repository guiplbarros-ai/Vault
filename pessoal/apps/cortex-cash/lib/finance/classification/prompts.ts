/**
 * AI Classification Prompts - Prompts otimizados para classificação de transações
 * Agent DATA: Owner
 */

import type { Categoria } from '../../types'

export interface CategoriaLite {
  id: string
  nome: string
  icone?: string
  grupo?: string
}

/**
 * Gera prompt otimizado para classificação de transações
 * Aceita tanto Categoria completa quanto CategoriaLite (DTO compacto)
 */
export function generateClassificationPrompt(
  descricao: string,
  valor: number,
  tipo: 'receita' | 'despesa',
  categorias: Categoria[] | CategoriaLite[]
): string {
  const categoriasTexto = categorias
    .map((c) => {
      const emoji = c.icone || ''
      const grupo = c.grupo ? ` (${c.grupo})` : ''
      return `  - ID: ${c.id} | ${emoji} ${c.nome}${grupo}`
    })
    .join('\n')

  // Exemplos contextuais por tipo
  const exemplos =
    tipo === 'despesa'
      ? `**Exemplos de classificação:**
- "Almoço no Subway" → Alimentação (alta confiança: 0.95)
- "Uber para o aeroporto" → Transporte (alta confiança: 0.9)
- "Netflix" → Assinatura/Entretenimento (alta confiança: 0.92)
- "Conta de luz" → Moradia/Utilidades (alta confiança: 0.88)`
      : `**Exemplos de classificação:**
- "Salário" → Salário (alta confiança: 0.98)
- "Transferência de João" → Transferência recebida (média confiança: 0.6)
- "Dividendos PETR4" → Investimentos (alta confiança: 0.9)
- "Venda no Mercado Livre" → Vendas (média confiança: 0.7)`

  return `Você é um especialista em classificação de transações financeiras no Brasil.

**SUA TAREFA:**
Analise a transação abaixo e sugira a categoria mais apropriada da lista.

**TRANSAÇÃO A CLASSIFICAR:**
📝 Descrição: "${descricao}"
💰 Valor: R$ ${valor.toFixed(2)}
📊 Tipo: ${tipo.toUpperCase()}

**CATEGORIAS DISPONÍVEIS:**
${categoriasTexto}

${exemplos}

**INSTRUÇÕES DE CLASSIFICAÇÃO:**
1. Analise palavras-chave na descrição (ex: "uber" → Transporte, "netflix" → Entretenimento)
2. Considere o contexto brasileiro (marcas, serviços, pagamentos comuns)
3. Use o valor como pista secundária (ex: R$ 5.000+ pode ser salário)
4. Se a descrição for genérica (ex: "Transferência"), use confiança baixa (0.3-0.5)
5. Se for muito específico e claro (ex: "Almoço Subway"), use confiança alta (0.85-0.98)

**FORMATO DE RESPOSTA:**
Retorne APENAS um JSON válido (sem markdown, sem explicações extras):

{
  "categoria_id": "id-da-categoria-escolhida",
  "confianca": 0.85,
  "reasoning": "Palavra-chave 'X' indica categoria Y"
}

**REGRAS DO JSON:**
- categoria_id: ID exato de uma das categorias listadas (ou null se nenhuma servir)
- confianca: número entre 0.0 e 1.0
  - 0.9-1.0: certeza absoluta (palavra-chave óbvia)
  - 0.7-0.89: alta confiança (contexto claro)
  - 0.5-0.69: média confiança (palpite razoável)
  - 0.0-0.49: baixa confiança (muito genérico)
- reasoning: máximo 60 caracteres, explicação concisa em português

**IMPORTANTE:**
- Responda APENAS com o JSON
- Não adicione texto antes ou depois do JSON
- Não use markdown (sem \`\`\`json)`
}

/**
 * System prompt para o modelo OpenAI
 */
export const SYSTEM_PROMPT = `Você é um assistente financeiro especializado em classificar transações bancárias no Brasil.

Seu objetivo é analisar descrições de transações e sugerir a categoria mais apropriada.

Características importantes:
- Reconheça marcas e serviços brasileiros (Nubank, Uber, iFood, Netflix, etc.)
- Considere padrões de descrição de bancos brasileiros
- Use o valor da transação como pista secundária
- Seja conservador na confiança quando a descrição for genérica
- Retorne SEMPRE um JSON válido, sem texto adicional

Exemplos de alta confiança (0.9+):
- "Uber" → Transporte
- "iFood" → Alimentação
- "Netflix" → Entretenimento/Assinatura
- "Salário" → Salário

Exemplos de baixa confiança (0.3-0.5):
- "Transferência" → Incerto (pode ser várias categorias)
- "Pagamento" → Incerto (muito genérico)
- "PIX recebido" → Incerto (origem desconhecida)

Responda SEMPRE no formato JSON especificado no prompt do usuário.`

/**
 * Extrai lista de palavras-chave comuns por categoria (helper para futuras melhorias)
 */
export const CATEGORY_KEYWORDS = {
  alimentacao: [
    'almoço',
    'jantar',
    'cafe',
    'lanche',
    'comida',
    'restaurante',
    'ifood',
    'uber eats',
    'rappi',
    'subway',
    'mcdonald',
  ],
  transporte: [
    'uber',
    '99',
    'taxi',
    'gasolina',
    'combustivel',
    'posto',
    'estacionamento',
    'onibus',
    'metro',
  ],
  moradia: ['aluguel', 'condominio', 'luz', 'agua', 'gas', 'internet', 'iptu', 'condomínio'],
  saude: [
    'farmacia',
    'droga',
    'hospital',
    'clinica',
    'medico',
    'consulta',
    'exame',
    'plano de saude',
  ],
  educacao: ['faculdade', 'curso', 'livro', 'escola', 'aula', 'mensalidade'],
  lazer: ['cinema', 'show', 'ingresso', 'viagem', 'hotel', 'airbnb'],
  assinatura: ['netflix', 'spotify', 'amazon prime', 'youtube', 'disney', 'hbo'],
  salario: ['salario', 'salário', 'pagamento salario', 'credito salario'],
  investimento: ['dividendo', 'rendimento', 'aplicacao', 'resgate', 'cdb', 'tesouro'],
} as const
