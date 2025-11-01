/**
 * Testes para parser CSV
 * Agent IMPORT: Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseCSV,
  suggestMapping,
  validateMapping,
  generateSample,
} from './csv';
import type { MapeamentoColunas, ParseConfig } from '@/lib/types';

describe('parseCSV', () => {
  it('deve fazer parse de CSV simples', async () => {
    const content = `Data,Descrição,Valor
15/01/2024,Netflix,-39.90
16/01/2024,Salário,5000.00`;

    const mapeamento: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
    };

    const result = await parseCSV(content, mapeamento, {
      separador: ',',
      pular_linhas: 1,
      separador_decimal: '.', // Specify decimal separator for US format
    });

    expect(result.success).toBe(true);
    expect(result.transacoes).toHaveLength(2);
    // normalizeDescription removes extra spaces and normalizes, but doesn't uppercase by default
    expect(result.transacoes[0].descricao.toLowerCase()).toContain('netflix');
    expect(result.transacoes[0].valor).toBe(39.90);
    expect(result.transacoes[0].tipo).toBe('despesa');
  });

  it('deve fazer parse com ponto-e-vírgula', async () => {
    const content = `Data;Descrição;Valor
15/01/2024;Netflix;-39,90`;

    const mapeamento: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
    };

    const result = await parseCSV(content, mapeamento, {
      separador: ';',
      pular_linhas: 1,
      separador_decimal: ',',
    });

    expect(result.transacoes[0].valor).toBe(39.90);
  });

  it('deve detectar tipo da transação (receita/despesa)', async () => {
    const content = `Data,Descrição,Valor
15/01/2024,Despesa,-100.00
16/01/2024,Receita,200.00`;

    const mapeamento: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
    };

    const result = await parseCSV(content, mapeamento, {
      pular_linhas: 1,
    });

    expect(result.transacoes[0].tipo).toBe('despesa');
    expect(result.transacoes[1].tipo).toBe('receita');
  });

  it('deve fazer parse de campos com aspas', async () => {
    const content = `Data,Descrição,Valor
15/01/2024,"Empresa, Inc.",-100.00`;

    const mapeamento: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
    };

    const result = await parseCSV(content, mapeamento, {
      pular_linhas: 1,
    });

    expect(result.transacoes[0].descricao).toContain('Empresa');
  });

  it('deve reportar erros para linhas inválidas', async () => {
    const content = `Data,Descrição,Valor
invalid,Netflix,-39.90
16/01/2024,Salário,5000.00`;

    const mapeamento: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
    };

    const result = await parseCSV(content, mapeamento, {
      pular_linhas: 1,
    });

    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].campo).toBe('data');
    expect(result.transacoes).toHaveLength(1); // Apenas linha válida
  });

  it('deve processar categoria opcional', async () => {
    const content = `Data,Descrição,Valor,Categoria
15/01/2024,Netflix,-39.90,Streaming`;

    const mapeamento: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
      categoria: 3,
    };

    const result = await parseCSV(content, mapeamento, {
      pular_linhas: 1,
    });

    expect(result.transacoes[0].categoria).toBe('Streaming');
  });

  it('deve processar observações opcionais', async () => {
    const content = `Data,Descrição,Valor,Obs
15/01/2024,Netflix,-39.90,Assinatura mensal`;

    const mapeamento: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
      observacoes: 3,
    };

    const result = await parseCSV(content, mapeamento, {
      pular_linhas: 1,
    });

    expect(result.transacoes[0].observacoes).toBe('Assinatura mensal');
  });

  it('deve incluir número da linha original', async () => {
    const content = `Data,Descrição,Valor
15/01/2024,Netflix,-39.90`;

    const mapeamento: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
    };

    const result = await parseCSV(content, mapeamento, {
      pular_linhas: 1,
    });

    expect(result.transacoes[0].linha_original).toBe(2); // Linha 2 (depois do header)
  });

  it('deve retornar resumo correto', async () => {
    const content = `Data,Descrição,Valor
15/01/2024,Netflix,-39.90
invalid,Erro,100
16/01/2024,Salário,5000.00`;

    const mapeamento: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
    };

    const result = await parseCSV(content, mapeamento, {
      pular_linhas: 1,
    });

    expect(result.resumo.total_linhas).toBe(3);
    expect(result.resumo.linhas_validas).toBe(2);
    expect(result.resumo.linhas_invalidas).toBe(1);
  });
});

describe('suggestMapping', () => {
  it('deve sugerir mapeamento para headers em português', () => {
    const headers = ['Data', 'Descrição', 'Valor'];
    const mapping = suggestMapping(headers);

    expect(mapping.data).toBe(0);
    expect(mapping.descricao).toBe(1);
    expect(mapping.valor).toBe(2);
  });

  it('deve sugerir mapeamento para headers em inglês', () => {
    const headers = ['Date', 'Description', 'Amount'];
    const mapping = suggestMapping(headers);

    expect(mapping.data).toBe(0);
    expect(mapping.descricao).toBe(1);
    expect(mapping.valor).toBe(2);
  });

  it('deve detectar coluna de tipo', () => {
    const headers = ['Data', 'Descrição', 'Valor', 'Tipo'];
    const mapping = suggestMapping(headers);

    expect(mapping.tipo).toBe(3);
  });

  it('deve detectar coluna de categoria', () => {
    const headers = ['Data', 'Descrição', 'Valor', 'Categoria'];
    const mapping = suggestMapping(headers);

    expect(mapping.categoria).toBe(3);
  });

  it('deve retornar -1 para campos não encontrados', () => {
    const headers = ['Coluna1', 'Coluna2'];
    const mapping = suggestMapping(headers);

    expect(mapping.data).toBe(-1);
    expect(mapping.descricao).toBe(-1);
    expect(mapping.valor).toBe(-1);
  });

  it('deve ser case-insensitive', () => {
    const headers = ['data', 'DESCRIÇÃO', 'VaLoR'];
    const mapping = suggestMapping(headers);

    expect(mapping.data).toBe(0);
    expect(mapping.descricao).toBe(1);
    expect(mapping.valor).toBe(2);
  });
});

describe('validateMapping', () => {
  it('deve validar mapeamento completo', () => {
    const mapping: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
    };

    const result = validateMapping(mapping);
    expect(result.valid).toBe(true);
    expect(result.missing).toBeUndefined();
  });

  it('deve invalidar mapeamento sem data', () => {
    const mapping: Partial<MapeamentoColunas> = {
      descricao: 1,
      valor: 2,
    };

    const result = validateMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('data');
  });

  it('deve invalidar mapeamento sem descrição', () => {
    const mapping: Partial<MapeamentoColunas> = {
      data: 0,
      valor: 2,
    };

    const result = validateMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('descricao');
  });

  it('deve invalidar mapeamento sem valor', () => {
    const mapping: Partial<MapeamentoColunas> = {
      data: 0,
      descricao: 1,
    };

    const result = validateMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('valor');
  });

  it('deve aceitar campos opcionais ausentes', () => {
    const mapping: MapeamentoColunas = {
      data: 0,
      descricao: 1,
      valor: 2,
      // categoria e observacoes não especificados
    };

    const result = validateMapping(mapping);
    expect(result.valid).toBe(true);
  });

  it('deve invalidar índices -1', () => {
    const mapping: MapeamentoColunas = {
      data: -1,
      descricao: 1,
      valor: 2,
    };

    const result = validateMapping(mapping);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('data');
  });
});

describe('generateSample', () => {
  it('deve gerar amostra de 5 linhas por padrão', () => {
    const content = `Data,Descrição,Valor
15/01/2024,Netflix,-39.90
16/01/2024,Spotify,-19.90
17/01/2024,Salário,5000.00
18/01/2024,Uber,-25.00
19/01/2024,iFood,-45.00
20/01/2024,Bonus,1000.00`;

    const sample = generateSample(content, ',');
    expect(sample).toHaveLength(5);
  });

  it('deve gerar amostra com número customizado de linhas', () => {
    const content = `Data,Descrição,Valor
15/01/2024,Netflix,-39.90
16/01/2024,Spotify,-19.90`;

    const sample = generateSample(content, ',', 2);
    expect(sample).toHaveLength(2);
  });

  it('deve fazer split corretamente com separador', () => {
    const content = `Data;Descrição;Valor
15/01/2024;Netflix;-39,90`;

    const sample = generateSample(content, ';', 2);
    expect(sample[0]).toEqual(['Data', 'Descrição', 'Valor']);
    expect(sample[1]).toEqual(['15/01/2024', 'Netflix', '-39,90']);
  });

  it('deve retornar menos linhas se arquivo for pequeno', () => {
    const content = `Data,Descrição,Valor
15/01/2024,Netflix,-39.90`;

    const sample = generateSample(content, ',', 10);
    expect(sample).toHaveLength(2);
  });
});
