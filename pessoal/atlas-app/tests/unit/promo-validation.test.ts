import { describe, it, expect } from 'vitest'
import { isTransferPromo } from '../../src/services/promo-monitor.service.js'

describe('Promo Validation - Consumption Keywords', () => {
  it('bloqueia "compra de milhas"', () => {
    expect(isTransferPromo(
      'Smiles oferece até 300% de bônus na compra de milhas',
      'Promoção para assinantes do Clube Smiles'
    )).toBe(false)
  })

  it('bloqueia "assinantes"', () => {
    expect(isTransferPromo(
      'Smiles: assinantes do Clube ganham milhas extras',
      'Promoção exclusiva para assinantes premium'
    )).toBe(false)
  })

  it('bloqueia "passagens a partir de"', () => {
    expect(isTransferPromo(
      'Livelo: passagens a partir de 10 mil pontos',
      'Resgate passagens com seus pontos Livelo'
    )).toBe(false)
  })

  it('bloqueia "cashback"', () => {
    expect(isTransferPromo(
      'Livelo oferece cashback em compras',
      'Ganhe pontos Livelo com cashback'
    )).toBe(false)
  })

  it('bloqueia "clube livelo"', () => {
    expect(isTransferPromo(
      'Clube Livelo: benefícios exclusivos para membros',
      'Acumule pontos com o clube Livelo'
    )).toBe(false)
  })

  it('aceita transferência genuína Livelo→Smiles', () => {
    expect(isTransferPromo(
      'Livelo oferece 80% de bônus para transferência de pontos para Smiles',
      'Transfira seus pontos Livelo para Smiles com 80% de bônus até 28/02'
    )).toBe(true)
  })

  it('aceita bônus Smiles com menção a Livelo', () => {
    expect(isTransferPromo(
      'Smiles com bônus de 100% para transferência Livelo',
      'Pontos Livelo rendem o dobro na Smiles'
    )).toBe(true)
  })

  it('aceita Smiles bônus transferência (sem Livelo)', () => {
    expect(isTransferPromo(
      'Smiles anuncia bônus de transferência',
      'Receba bônus ao transferir pontos para Smiles'
    )).toBe(true)
  })
})
