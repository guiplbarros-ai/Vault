/**
 * Testes de Detecção de Separador
 * Agent DATA: Owner
 */

import { describe, it, expect } from 'vitest';
import { detectSeparator, validateSeparator } from '@/lib/import/detectors/separator';

describe('Separator Detector', () => {
  it('deve detectar ponto-e-vírgula (;)', () => {
    const csv = `Data;Descrição;Valor
01/01/2024;Compra 1;100,00
02/01/2024;Compra 2;200,00`;

    expect(detectSeparator(csv)).toBe(';');
  });

  it('deve detectar vírgula (,)', () => {
    const csv = `Date,Description,Value
2024-01-01,Purchase 1,100.00
2024-01-02,Purchase 2,200.00`;

    expect(detectSeparator(csv)).toBe(',');
  });

  it('deve detectar tab (\\t)', () => {
    const csv = `Data\tDescrição\tValor
01/01/2024\tCompra 1\t100,00
02/01/2024\tCompra 2\t200,00`;

    expect(detectSeparator(csv)).toBe('\t');
  });

  it('deve detectar pipe (|)', () => {
    const csv = `Data|Descrição|Valor
01/01/2024|Compra 1|100,00
02/01/2024|Compra 2|200,00`;

    expect(detectSeparator(csv)).toBe('|');
  });

  it('deve escolher separador mais consistente', () => {
    // CSV com vírgula dentro de descrição (entre aspas)
    const csv = `Data;Descrição;Valor
01/01/2024;"Compra 1, teste";100,00
02/01/2024;"Compra 2, outro";200,00`;

    // Deve detectar ; pois tem consistência (3 por linha)
    expect(detectSeparator(csv)).toBe(';');
  });

  it('deve ter fallback para ; quando incerto', () => {
    const csv = `linha sem separador claro`;
    expect(detectSeparator(csv)).toBe(';');
  });

  it('deve validar separador correto', () => {
    const csv = `A;B;C
1;2;3
4;5;6`;

    expect(validateSeparator(csv, ';')).toBe(true);
    expect(validateSeparator(csv, ',')).toBe(false);
  });
});
