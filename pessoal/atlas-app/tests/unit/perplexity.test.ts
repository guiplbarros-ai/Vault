import { describe, it, expect } from 'vitest'
import type { PromoValidation } from '../../src/services/perplexity.service.js'

// Testa a lógica de parsing do validatePromotion
// (sem chamar API — apenas o parse da resposta estruturada)
describe('Perplexity - PromoValidation Logic', () => {
  function parseValidation(content: string): PromoValidation {
    const tipoMatch = content.match(/TIPO:\s*(.+)/i)
    const ativaMatch = content.match(/ATIVA:\s*(.+)/i)
    const resumoMatch = content.match(/RESUMO:\s*(.+)/i)
    const relevanteMatch = content.match(/RELEVANTE_LIVELO:\s*(.+)/i)
    const correcaoMatch = content.match(/CORREÇÃO:\s*(.+)/i)

    const relevante = relevanteMatch?.[1]?.trim().toLowerCase() || ''
    const ativa = ativaMatch?.[1]?.trim().toLowerCase() || ''
    const resumo = resumoMatch?.[1]?.trim() || content.slice(0, 200)
    const correcao = correcaoMatch?.[1]?.trim()

    const isTransferBonus = relevante.includes('sim')
    const isActive = ativa.includes('sim')
    const isValid = isTransferBonus && isActive

    return {
      isValid,
      isTransferBonus,
      isActive,
      summary: resumo,
      correction: isValid ? undefined : correcao || undefined,
    }
  }

  it('identifica falso positivo (compra de milhas, não transferência)', () => {
    const content = `TIPO: compra de milhas
ATIVA: sim
RESUMO: Smiles oferece bônus na compra de milhas para assinantes do Clube
RELEVANTE_LIVELO: não
CORREÇÃO: Promoção é de compra direta de milhas Smiles, não de transferência Livelo`

    const result = parseValidation(content)
    expect(result.isValid).toBe(false)
    expect(result.isTransferBonus).toBe(false)
    expect(result.isActive).toBe(true)
    expect(result.correction).toBeDefined()
  })

  it('identifica positivo real (transferência Livelo→Smiles)', () => {
    const content = `TIPO: transferência de pontos
ATIVA: sim
RESUMO: Livelo oferece 80% de bônus para transferência de pontos para Smiles
RELEVANTE_LIVELO: sim`

    const result = parseValidation(content)
    expect(result.isValid).toBe(true)
    expect(result.isTransferBonus).toBe(true)
    expect(result.isActive).toBe(true)
    expect(result.correction).toBeUndefined()
  })

  it('identifica promo expirada', () => {
    const content = `TIPO: transferência de pontos
ATIVA: não
RESUMO: Promoção Livelo para Smiles já encerrou em 31/01/2026
RELEVANTE_LIVELO: sim
CORREÇÃO: Promoção expirada`

    const result = parseValidation(content)
    expect(result.isValid).toBe(false)
    expect(result.isTransferBonus).toBe(true)
    expect(result.isActive).toBe(false)
  })

  it('trata resposta sem campos como inválida', () => {
    const content = 'Não encontrei informações sobre esta promoção.'

    const result = parseValidation(content)
    expect(result.isValid).toBe(false)
    expect(result.isTransferBonus).toBe(false)
    expect(result.isActive).toBe(false)
  })

  it('relevante_livelo "sim" com ativa "incerto" = inválido', () => {
    const content = `TIPO: transferência de pontos
ATIVA: incerto
RESUMO: Pode ser promoção Livelo mas não confirmei
RELEVANTE_LIVELO: sim`

    const result = parseValidation(content)
    expect(result.isValid).toBe(false)
    expect(result.isTransferBonus).toBe(true)
    expect(result.isActive).toBe(false)
  })
})
