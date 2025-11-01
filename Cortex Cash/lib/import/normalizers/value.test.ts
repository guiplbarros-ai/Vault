/**
 * Testes para normalização de valores monetários
 * Agent IMPORT: Tests
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeValue,
  detectDecimalSeparator,
  formatValueBR,
  isMonetaryValue,
} from './value';

describe('normalizeValue', () => {
  it('deve fazer parse de valor brasileiro com vírgula', () => {
    expect(normalizeValue('1.234,56', ',')).toBe(1234.56);
  });

  it('deve fazer parse de valor americano com ponto', () => {
    expect(normalizeValue('1,234.56', '.')).toBe(1234.56);
  });

  it('deve fazer parse de valor com símbolo R$', () => {
    expect(normalizeValue('R$ 1.234,56', ',')).toBe(1234.56);
  });

  it('deve fazer parse de valor com símbolo $', () => {
    expect(normalizeValue('$1,234.56', '.')).toBe(1234.56);
  });

  it('deve fazer parse de valor negativo com sinal', () => {
    expect(normalizeValue('-1.234,56', ',')).toBe(-1234.56);
  });

  it('deve fazer parse de valor negativo com parênteses', () => {
    expect(normalizeValue('(1.234,56)', ',')).toBe(-1234.56);
  });

  it('deve fazer parse de valor sem separador de milhar', () => {
    expect(normalizeValue('1234,56', ',')).toBe(1234.56);
  });

  it('deve fazer parse de valor inteiro', () => {
    expect(normalizeValue('1234', ',')).toBe(1234);
  });

  it('deve fazer parse de valor com espaços', () => {
    expect(normalizeValue('  1.234,56  ', ',')).toBe(1234.56);
  });

  it('deve retornar null para valor inválido', () => {
    expect(normalizeValue('abc', ',')).toBeNull();
    expect(normalizeValue('', ',')).toBeNull();
  });

  it('deve fazer parse de valor com centavos sem zero à esquerda', () => {
    expect(normalizeValue('1234,5', ',')).toBe(1234.5);
  });

  it('deve detectar automaticamente separador quando não especificado', () => {
    expect(normalizeValue('1.234,56')).toBe(1234.56);
    expect(normalizeValue('1,234.56')).toBe(1234.56);
  });
});

describe('detectDecimalSeparator', () => {
  it('deve detectar vírgula como separador decimal', () => {
    expect(detectDecimalSeparator('1.234,56')).toBe(',');
  });

  it('deve detectar ponto como separador decimal', () => {
    expect(detectDecimalSeparator('1,234.56')).toBe('.');
  });

  it('deve assumir vírgula quando apenas um separador (vírgula)', () => {
    expect(detectDecimalSeparator('1234,56')).toBe(',');
  });

  it('deve assumir ponto quando apenas um separador (ponto)', () => {
    expect(detectDecimalSeparator('1234.56')).toBe('.');
  });

  it('deve retornar ponto como padrão quando sem separadores', () => {
    // The function returns '.' when no separator is found
    expect(detectDecimalSeparator('1234')).toBe('.');
  });

  it('deve usar último separador quando ambíguos', () => {
    // lastIndexOf('.') > lastIndexOf(','), so it returns '.'
    expect(detectDecimalSeparator('1.234.56')).toBe('.');
  });
});

describe('formatValueBR', () => {
  it('deve formatar valor para formato brasileiro com símbolo', () => {
    expect(formatValueBR(1234.56)).toBe('R$ 1.234,56');
  });

  it('deve formatar valor para formato brasileiro sem símbolo', () => {
    expect(formatValueBR(1234.56, false)).toBe('1.234,56');
  });

  it('deve formatar valor negativo', () => {
    // formatValueBR formats negative values with sign after symbol
    expect(formatValueBR(-1234.56)).toBe('R$ -1.234,56');
  });

  it('deve formatar valor inteiro', () => {
    expect(formatValueBR(1234)).toBe('R$ 1.234,00');
  });

  it('deve formatar valor com muitos dígitos', () => {
    expect(formatValueBR(1234567.89)).toBe('R$ 1.234.567,89');
  });

  it('deve formatar zero', () => {
    expect(formatValueBR(0)).toBe('R$ 0,00');
  });

  it('deve formatar centavos', () => {
    expect(formatValueBR(0.99)).toBe('R$ 0,99');
  });
});

describe('isMonetaryValue', () => {
  it('deve identificar valor monetário brasileiro com R$', () => {
    expect(isMonetaryValue('R$ 123,45')).toBe(true);
    expect(isMonetaryValue('R$123,45')).toBe(true);
  });

  it('deve identificar valor com 2 casas decimais', () => {
    expect(isMonetaryValue('123,45')).toBe(true);
    expect(isMonetaryValue('123.45')).toBe(true);
  });

  it('deve identificar valor negativo com formato correto', () => {
    expect(isMonetaryValue('-R$ 123,45')).toBe(true);
    expect(isMonetaryValue('(R$ 123,45)')).toBe(true);
  });

  it('deve rejeitar valores não monetários', () => {
    expect(isMonetaryValue('abc')).toBe(false);
    expect(isMonetaryValue('')).toBe(false);
    expect(isMonetaryValue('123abc')).toBe(false);
  });

  it('deve aceitar valores com separadores de milhar e decimais', () => {
    expect(isMonetaryValue('1.234,56')).toBe(true);
    expect(isMonetaryValue('1,234.56')).toBe(true);
  });
});

// removeNonNumeric is not exported from value.ts
// It's used internally but not part of the public API
