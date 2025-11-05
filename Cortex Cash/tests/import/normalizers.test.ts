/**
 * Testes de Normalização
 * Agent DATA: Owner
 */

import { describe, it, expect } from 'vitest';
import { normalizeDate } from '@/lib/import/normalizers/date';
import { normalizeValue } from '@/lib/import/normalizers/value';

describe('Date Normalizer', () => {
  it('deve normalizar DD/MM/YYYY', () => {
    expect(normalizeDate('01/01/2024')).toBe('2024-01-01');
    expect(normalizeDate('31/12/2024')).toBe('2024-12-31');
    expect(normalizeDate('15/06/2023')).toBe('2023-06-15');
  });

  it('deve normalizar DD-MM-YYYY', () => {
    expect(normalizeDate('01-01-2024')).toBe('2024-01-01');
    expect(normalizeDate('31-12-2024')).toBe('2024-12-31');
  });

  it('deve normalizar DD/MM/YY', () => {
    expect(normalizeDate('01/01/24')).toBe('2024-01-01');
    expect(normalizeDate('31/12/99')).toBe('1999-12-31');
    expect(normalizeDate('15/06/49')).toBe('2049-06-15');
  });

  it('deve normalizar YYYY-MM-DD (ISO)', () => {
    expect(normalizeDate('2024-01-01')).toBe('2024-01-01');
    expect(normalizeDate('2024-12-31')).toBe('2024-12-31');
  });

  it('deve normalizar DD.MM.YYYY', () => {
    expect(normalizeDate('01.01.2024')).toBe('2024-01-01');
    expect(normalizeDate('31.12.2024')).toBe('2024-12-31');
  });

  it('deve retornar null para datas inválidas', () => {
    expect(normalizeDate('32/01/2024')).toBe(null);
    expect(normalizeDate('00/01/2024')).toBe(null);
    expect(normalizeDate('31/02/2024')).toBe(null);
    expect(normalizeDate('abc')).toBe(null);
    expect(normalizeDate('')).toBe(null);
  });

  it('deve lidar com anos bissextos', () => {
    expect(normalizeDate('29/02/2024')).toBe('2024-02-29'); // Bissexto
    expect(normalizeDate('29/02/2023')).toBe(null);         // Não bissexto
  });
});

describe('Value Normalizer', () => {
  it('deve normalizar valores brasileiros (vírgula decimal)', () => {
    expect(normalizeValue('1.234,56')).toBe(1234.56);
    expect(normalizeValue('10.000,00')).toBe(10000.00);
    expect(normalizeValue('99,90')).toBe(99.90);
  });

  it('deve normalizar valores americanos (ponto decimal)', () => {
    expect(normalizeValue('1,234.56')).toBe(1234.56);
    expect(normalizeValue('10,000.00')).toBe(10000.00);
    expect(normalizeValue('99.90')).toBe(99.90);
  });

  it('deve normalizar valores simples', () => {
    expect(normalizeValue('1234.56')).toBe(1234.56);
    expect(normalizeValue('1234,56')).toBe(1234.56);
    expect(normalizeValue('100')).toBe(100);
  });

  it('deve remover símbolos de moeda', () => {
    expect(normalizeValue('R$ 1.234,56')).toBe(1234.56);
    expect(normalizeValue('USD 1,234.56')).toBe(1234.56);
    expect(normalizeValue('EUR 99.90')).toBe(99.90);
  });

  it('deve lidar com valores negativos', () => {
    expect(normalizeValue('-1.234,56')).toBe(-1234.56);
    expect(normalizeValue('-100')).toBe(-100);
    expect(normalizeValue('R$ -99,90')).toBe(-99.90);
  });

  it('deve lidar com números já parseados', () => {
    expect(normalizeValue(1234.56)).toBe(1234.56);
    expect(normalizeValue(100)).toBe(100);
    expect(normalizeValue(-99.90)).toBe(-99.90);
  });

  it('deve retornar null para valores inválidos', () => {
    expect(normalizeValue('abc')).toBe(null);
    expect(normalizeValue('')).toBe(null);
    expect(normalizeValue('R$')).toBe(null);
  });

  it('deve lidar com espaços extras', () => {
    expect(normalizeValue(' R$ 1.234,56 ')).toBe(1234.56);
    expect(normalizeValue('  100  ')).toBe(100);
  });
});
