import { describe, it, expect } from 'vitest'
import { isTransferPromo, isSmilesTransfer } from '../../src/services/promo-monitor.service.js'

describe('Promo Filter - isTransferPromo', () => {
  describe('deve ACEITAR promos de transferência entre programas', () => {
    it('Livelo → Smiles com bônus', () => {
      expect(isTransferPromo(
        'Livelo oferece bônus de 80% para transferência Smiles',
        'Transfira seus pontos Livelo para Smiles com 80% de bônus'
      )).toBe(true)
    })

    it('Livelo → Smiles transferência', () => {
      expect(isTransferPromo(
        'Bônus Livelo para Smiles: até 90% extra',
        'Promoção de transferência de pontos Livelo para Smiles'
      )).toBe(true)
    })

    it('Livelo → LATAM Pass', () => {
      expect(isTransferPromo(
        'Livelo com bônus de transferência para LATAM Pass',
        'Transfira pontos com bonificação'
      )).toBe(true)
    })

    it('Livelo → Azul/TudoAzul', () => {
      expect(isTransferPromo(
        'Livelo oferece bônus para Tudo Azul',
        'Promoção de pontos'
      )).toBe(true)
    })

    it('Smiles com bônus de milhas', () => {
      expect(isTransferPromo(
        'Smiles oferece bônus de 100% em milhas',
        'Compre milhas Smiles com desconto'
      )).toBe(true)
    })

    it('Smiles transferência Livelo', () => {
      expect(isTransferPromo(
        'Smiles com bônus para quem transfere do Livelo',
        'Promoção de transferência'
      )).toBe(true)
    })

    it('Livelo milhas aéreas', () => {
      expect(isTransferPromo(
        'Livelo permite trocar pontos por milhas aéreas com bônus',
        'Programa de milhas'
      )).toBe(true)
    })

    it('Livelo transferir pontos', () => {
      expect(isTransferPromo(
        'Como transferir pontos Livelo para programas de milhas',
        'Guia de transferência'
      )).toBe(true)
    })
  })

  describe('deve REJEITAR promos de consumo/compras', () => {
    it('pontos por real gasto em lojas', () => {
      expect(isTransferPromo(
        'Livelo oferece até 12 pontos por real gasto na Beleza na web, HERO Seguros, O Boticário e outros parceiros',
        'Acumule pontos em compras'
      )).toBe(false)
    })

    it('pontos por real em parceiros', () => {
      expect(isTransferPromo(
        'Ganhe pontos Livelo por real gasto em parceiros selecionados',
        'Promoção de acúmulo'
      )).toBe(false)
    })

    it('cashback Livelo', () => {
      expect(isTransferPromo(
        'Livelo com cashback de 10% no Submarino',
        'Promoção de cashback'
      )).toBe(false)
    })

    it('compras no shopping', () => {
      expect(isTransferPromo(
        'Livelo: ganhe pontos em compras no shopping',
        'Compras acumulam pontos'
      )).toBe(false)
    })

    it('Clube Livelo assinatura', () => {
      expect(isTransferPromo(
        'Clube Livelo: assine e ganhe pontos todo mês',
        'Assinatura de pontos'
      )).toBe(false)
    })

    it('marketplace Livelo', () => {
      expect(isTransferPromo(
        'Livelo marketplace: troque pontos por produtos',
        'Resgate no marketplace'
      )).toBe(false)
    })

    it('loja parceira', () => {
      expect(isTransferPromo(
        'Livelo: acumule pontos na loja Americanas',
        'Bônus de acúmulo'
      )).toBe(false)
    })

    it('pontos por R$ gasto', () => {
      expect(isTransferPromo(
        'Livelo oferece até 8 pontos por R$ 1 gasto',
        'Promoção de acúmulo com cartão'
      )).toBe(false)
    })
  })

  describe('deve REJEITAR conteúdo sem relação', () => {
    it('artigo genérico de viagem', () => {
      expect(isTransferPromo(
        'Melhores destinos para viajar em 2026',
        'Descubra os melhores destinos para férias'
      )).toBe(false)
    })

    it('promoção de passagem aérea', () => {
      expect(isTransferPromo(
        'Passagens para Europa a partir de R$ 2.500',
        'LATAM tem promoção para Londres e Paris'
      )).toBe(false)
    })

    it('cartão de crédito sem Livelo/Smiles', () => {
      expect(isTransferPromo(
        'Novo cartão Nubank com cashback',
        'Conheça o novo cartão'
      )).toBe(false)
    })
  })
})

describe('Promo Filter - isSmilesTransfer', () => {
  it('detecta bônus Livelo → Smiles', () => {
    expect(isSmilesTransfer(
      'Bônus Livelo para Smiles: 80% extra',
      'Transferência com bonificação'
    )).toBe(true)
  })

  it('detecta Smiles com bônus genérico', () => {
    expect(isSmilesTransfer(
      'Smiles com bônus de 100%',
      'Promoção de milhas'
    )).toBe(true)
  })

  it('detecta Smiles transferência Livelo', () => {
    expect(isSmilesTransfer(
      'Smiles: transfira do Livelo com vantagem',
      'Promoção especial'
    )).toBe(true)
  })

  it('não detecta Livelo sem Smiles', () => {
    expect(isSmilesTransfer(
      'Livelo com bônus para LATAM Pass',
      'Transferência de pontos'
    )).toBe(false)
  })

  it('não detecta artigo genérico', () => {
    expect(isSmilesTransfer(
      'Melhores destinos baratos',
      'Viagem econômica'
    )).toBe(false)
  })
})
