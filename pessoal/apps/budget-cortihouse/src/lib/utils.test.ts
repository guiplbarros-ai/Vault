/**
 * Testes Unitários - Funções Utilitárias
 */

import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatPhone, generateQuoteNumber } from './utils'

// Normaliza espaços (NBSP → espaço normal) para comparação
const normalize = (str: string) => str.replace(/\u00A0/g, ' ')

describe('Funções Utilitárias', () => {
  describe('formatCurrency', () => {
    it('deve formatar valores positivos em BRL', () => {
      expect(normalize(formatCurrency(100))).toBe('R$ 100,00')
      expect(normalize(formatCurrency(1234.56))).toBe('R$ 1.234,56')
      expect(normalize(formatCurrency(1000000))).toBe('R$ 1.000.000,00')
    })

    it('deve formatar zero', () => {
      expect(normalize(formatCurrency(0))).toBe('R$ 0,00')
    })

    it('deve formatar valores negativos', () => {
      expect(normalize(formatCurrency(-100))).toBe('-R$ 100,00')
      expect(normalize(formatCurrency(-1234.56))).toBe('-R$ 1.234,56')
    })

    it('deve formatar valores decimais corretamente', () => {
      expect(normalize(formatCurrency(99.9))).toBe('R$ 99,90')
      expect(normalize(formatCurrency(99.99))).toBe('R$ 99,99')
      expect(normalize(formatCurrency(0.01))).toBe('R$ 0,01')
    })

    it('deve arredondar valores com mais de 2 casas decimais', () => {
      expect(normalize(formatCurrency(99.999))).toBe('R$ 100,00')
      expect(normalize(formatCurrency(99.994))).toBe('R$ 99,99')
    })
  })

  describe('formatDate', () => {
    it('deve formatar objeto Date em pt-BR', () => {
      const date = new Date(2024, 0, 15) // 15 de janeiro de 2024
      expect(formatDate(date)).toBe('15/01/2024')
    })

    it('deve formatar string de data ISO com timezone', () => {
      // Usar formato ISO com horário para evitar problemas de timezone
      expect(formatDate('2024-01-15T12:00:00')).toBe('15/01/2024')
      expect(formatDate('2024-12-31T12:00:00')).toBe('31/12/2024')
    })

    it('deve formatar datas com horário', () => {
      const date = new Date(2024, 5, 20, 14, 30, 0) // 20 de junho de 2024, 14:30
      expect(formatDate(date)).toBe('20/06/2024')
    })
  })

  describe('formatPhone', () => {
    it('deve formatar telefone com 11 dígitos (celular)', () => {
      expect(formatPhone('11999998888')).toBe('(11) 99999-8888')
      expect(formatPhone('21912345678')).toBe('(21) 91234-5678')
    })

    it('deve formatar telefone com 10 dígitos (fixo)', () => {
      expect(formatPhone('1134567890')).toBe('(11) 3456-7890')
      expect(formatPhone('2123456789')).toBe('(21) 2345-6789')
    })

    it('deve retornar original para entrada inválida', () => {
      expect(formatPhone('123')).toBe('123')
      expect(formatPhone('1234567890123')).toBe('1234567890123')
      expect(formatPhone('')).toBe('')
    })

    it('deve limpar caracteres não numéricos antes de formatar', () => {
      expect(formatPhone('(11) 99999-8888')).toBe('(11) 99999-8888')
      expect(formatPhone('11 99999 8888')).toBe('(11) 99999-8888')
      expect(formatPhone('11-99999-8888')).toBe('(11) 99999-8888')
    })

    it('deve retornar original se após limpeza não tiver 10 ou 11 dígitos', () => {
      expect(formatPhone('abc')).toBe('abc')
      expect(formatPhone('(11) 1234')).toBe('(11) 1234')
    })
  })

  describe('generateQuoteNumber', () => {
    it('deve gerar número com sequência de 3 dígitos', () => {
      expect(generateQuoteNumber(2024, 1)).toBe('001/2024')
      expect(generateQuoteNumber(2024, 10)).toBe('010/2024')
      expect(generateQuoteNumber(2024, 100)).toBe('100/2024')
    })

    it('deve usar o ano fornecido', () => {
      expect(generateQuoteNumber(2023, 1)).toBe('001/2023')
      expect(generateQuoteNumber(2025, 1)).toBe('001/2025')
    })

    it('deve lidar com sequências maiores que 999', () => {
      expect(generateQuoteNumber(2024, 1000)).toBe('1000/2024')
      expect(generateQuoteNumber(2024, 9999)).toBe('9999/2024')
    })

    it('deve lidar com sequência zero', () => {
      expect(generateQuoteNumber(2024, 0)).toBe('000/2024')
    })
  })
})
