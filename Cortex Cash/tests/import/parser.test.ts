/**
 * Testes do Parser CSV
 * Agent DATA: Owner
 */

import { describe, it, expect } from 'vitest';
import { parseCSV } from '@/lib/import/parsers/csv';

describe('CSV Parser', () => {
  it('deve parsear CSV básico com header', async () => {
    const csv = `Data,Descrição,Valor
01/01/2024,Compra 1,100.00
02/01/2024,Compra 2,200.00`;

    const result = await parseCSV(csv, { hasHeader: true });

    expect(result.transactions).toHaveLength(2);
    expect(result.metadata.totalRows).toBe(2);
    expect(result.metadata.validRows).toBe(2);
    expect(result.metadata.invalidRows).toBe(0);
  });

  it('deve detectar separador automaticamente', async () => {
    const csv = `Data;Descrição;Valor
01/01/2024;Compra 1;100,00`;

    const result = await parseCSV(csv);

    expect(result.metadata.separator).toBe(';');
    expect(result.transactions).toHaveLength(1);
  });

  it('deve normalizar datas e valores', async () => {
    const csv = `Data,Descrição,Valor
01/01/2024,Compra,"R$ 1.234,56"`;

    const result = await parseCSV(csv);

    expect(result.transactions[0].data).toBe('2024-01-01');
    expect(result.transactions[0].valor).toBe(1234.56);
  });

  it('deve aplicar mapeamento de colunas customizado', async () => {
    const csv = `Valor,Descrição,Data
100.00,Compra 1,01/01/2024`;

    const result = await parseCSV(csv, {
      hasHeader: true,
      columnMapping: {
        date: 2,        // Terceira coluna
        description: 1, // Segunda coluna
        value: 0,       // Primeira coluna
      },
    });

    expect(result.transactions[0].data).toBe('2024-01-01');
    expect(result.transactions[0].descricao).toBe('Compra 1');
    expect(result.transactions[0].valor).toBe(100);
  });

  it('deve detectar tipo de transação', async () => {
    const csv = `Data,Descrição,Valor
01/01/2024,Compra,-100.00
02/01/2024,Receita,500.00`;

    const result = await parseCSV(csv);

    expect(result.transactions[0].tipo).toBe('despesa');
    expect(result.transactions[1].tipo).toBe('receita');
  });

  it('deve registrar erros para linhas inválidas', async () => {
    const csv = `Data,Descrição,Valor
invalido,Compra 1,100
01/01/2024,Compra 2,abc
02/01/2024,Compra 3,200`;

    const result = await parseCSV(csv);

    expect(result.metadata.validRows).toBe(1);
    expect(result.metadata.invalidRows).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].message).toContain('Data inválida');
    expect(result.errors[1].message).toContain('Valor inválido');
  });

  it('deve pular linhas vazias', async () => {
    const csv = `Data,Descrição,Valor
01/01/2024,Compra 1,100

02/01/2024,Compra 2,200`;

    const result = await parseCSV(csv);

    expect(result.transactions).toHaveLength(2);
  });

  it('deve lidar com descrições com vírgulas (entre aspas)', async () => {
    const csv = `Data,Descrição,Valor
01/01/2024,"Compra 1, teste",100`;

    const result = await parseCSV(csv);

    expect(result.transactions[0].descricao).toBe('Compra 1, teste');
  });

  it('deve retornar erro para arquivo vazio', async () => {
    await expect(parseCSV('')).rejects.toThrow('Arquivo vazio');
  });

  it('deve incluir raw data para debug', async () => {
    const csv = `Data,Descrição,Valor,Extra
01/01/2024,Compra,100,ABC`;

    const result = await parseCSV(csv);

    expect(result.transactions[0].rawData).toBeDefined();
    expect(result.transactions[0].rawData?.col_3).toBe('ABC');
  });
});
