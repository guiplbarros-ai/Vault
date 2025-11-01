/**
 * Testes para sistema de deduplicação
 * Agent IMPORT: Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateHash,
  addHashes,
  removeDuplicatesInArray,
  deduplicateTransactions,
  isDuplicate,
  calculateDuplicationRate,
  groupByHash,
  findDuplicateHashes,
} from './dedupe';
import type { ParsedTransacao } from '@/lib/types';
import { getDB } from '@/lib/db/client';

describe('generateHash', () => {
  it('deve gerar hash consistente para mesma transação', async () => {
    const transacao = {
      data: new Date(2024, 0, 15),
      descricao: 'NETFLIX',
      valor: 39.90,
    };

    const hash1 = await generateHash(transacao);
    const hash2 = await generateHash(transacao);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
  });

  it('deve gerar hashes diferentes para transações diferentes', async () => {
    const t1 = {
      data: new Date(2024, 0, 15),
      descricao: 'NETFLIX',
      valor: 39.90,
    };

    const t2 = {
      data: new Date(2024, 0, 16),
      descricao: 'SPOTIFY',
      valor: 19.90,
    };

    const hash1 = await generateHash(t1);
    const hash2 = await generateHash(t2);

    expect(hash1).not.toBe(hash2);
  });

  it('deve gerar hash diferente para mesma descrição em datas diferentes', async () => {
    const t1 = {
      data: new Date(2024, 0, 15),
      descricao: 'NETFLIX',
      valor: 39.90,
    };

    const t2 = {
      data: new Date(2024, 0, 16),
      descricao: 'NETFLIX',
      valor: 39.90,
    };

    const hash1 = await generateHash(t1);
    const hash2 = await generateHash(t2);

    expect(hash1).not.toBe(hash2);
  });

  it('deve ignorar case na descrição', async () => {
    const t1 = {
      data: new Date(2024, 0, 15),
      descricao: 'netflix',
      valor: 39.90,
    };

    const t2 = {
      data: new Date(2024, 0, 15),
      descricao: 'NETFLIX',
      valor: 39.90,
    };

    const hash1 = await generateHash(t1);
    const hash2 = await generateHash(t2);

    expect(hash1).toBe(hash2);
  });

  it('deve ignorar espaços extras na descrição', async () => {
    const t1 = {
      data: new Date(2024, 0, 15),
      descricao: '  NETFLIX  ',
      valor: 39.90,
    };

    const t2 = {
      data: new Date(2024, 0, 15),
      descricao: 'NETFLIX',
      valor: 39.90,
    };

    const hash1 = await generateHash(t1);
    const hash2 = await generateHash(t2);

    expect(hash1).toBe(hash2);
  });

  it('deve usar valor com 2 casas decimais', async () => {
    const t1 = {
      data: new Date(2024, 0, 15),
      descricao: 'NETFLIX',
      valor: 39.9,
    };

    const t2 = {
      data: new Date(2024, 0, 15),
      descricao: 'NETFLIX',
      valor: 39.90,
    };

    const hash1 = await generateHash(t1);
    const hash2 = await generateHash(t2);

    expect(hash1).toBe(hash2);
  });
});

describe('addHashes', () => {
  it('deve adicionar hash a todas as transações', async () => {
    const transacoes: ParsedTransacao[] = [
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 1,
      },
      {
        data: new Date(2024, 0, 16),
        descricao: 'SPOTIFY',
        valor: 19.90,
        tipo: 'despesa',
        linha_original: 2,
      },
    ];

    const withHashes = await addHashes(transacoes);

    expect(withHashes).toHaveLength(2);
    expect(withHashes[0].hash).toBeDefined();
    expect(withHashes[1].hash).toBeDefined();
    expect(withHashes[0].hash).toHaveLength(64);
  });

  it('deve preservar campos originais', async () => {
    const transacoes: ParsedTransacao[] = [
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        categoria: 'Streaming',
        observacoes: 'Teste',
        linha_original: 1,
      },
    ];

    const withHashes = await addHashes(transacoes);

    expect(withHashes[0].descricao).toBe('NETFLIX');
    expect(withHashes[0].categoria).toBe('Streaming');
    expect(withHashes[0].observacoes).toBe('Teste');
  });
});

describe('removeDuplicatesInArray', () => {
  it('deve remover duplicatas mantendo primeira ocorrência', async () => {
    const transacoes: ParsedTransacao[] = [
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 1,
      },
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 2,
      },
    ];

    const withHashes = await addHashes(transacoes);
    const unique = removeDuplicatesInArray(withHashes);

    expect(unique).toHaveLength(1);
    expect(unique[0].linha_original).toBe(1); // Primeira ocorrência
  });

  it('deve manter transações únicas', async () => {
    const transacoes: ParsedTransacao[] = [
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 1,
      },
      {
        data: new Date(2024, 0, 16),
        descricao: 'SPOTIFY',
        valor: 19.90,
        tipo: 'despesa',
        linha_original: 2,
      },
    ];

    const withHashes = await addHashes(transacoes);
    const unique = removeDuplicatesInArray(withHashes);

    expect(unique).toHaveLength(2);
  });

  it('deve ignorar transações sem hash', () => {
    const transacoes: ParsedTransacao[] = [
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 1,
        // Sem hash
      },
    ];

    const unique = removeDuplicatesInArray(transacoes);
    expect(unique).toHaveLength(0);
  });
});

describe('calculateDuplicationRate', () => {
  it('deve calcular taxa de duplicação correta', () => {
    const rate = calculateDuplicationRate(100, 80);
    expect(rate).toBe(20); // 20% de duplicação
  });

  it('deve retornar 0 quando não há duplicatas', () => {
    const rate = calculateDuplicationRate(100, 100);
    expect(rate).toBe(0);
  });

  it('deve retornar 100 quando todas são duplicatas', () => {
    const rate = calculateDuplicationRate(100, 0);
    expect(rate).toBe(100);
  });

  it('deve retornar 0 quando original é 0', () => {
    const rate = calculateDuplicationRate(0, 0);
    expect(rate).toBe(0);
  });

  it('deve calcular taxa decimal correta', () => {
    const rate = calculateDuplicationRate(100, 95);
    expect(rate).toBe(5);
  });
});

describe('groupByHash', () => {
  it('deve agrupar transações por hash', async () => {
    const transacoes: ParsedTransacao[] = [
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 1,
      },
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 2,
      },
      {
        data: new Date(2024, 0, 16),
        descricao: 'SPOTIFY',
        valor: 19.90,
        tipo: 'despesa',
        linha_original: 3,
      },
    ];

    const withHashes = await addHashes(transacoes);
    const groups = groupByHash(withHashes);

    expect(groups.size).toBe(2); // 2 hashes únicos

    const netflixHash = withHashes[0].hash!;
    const netflixGroup = groups.get(netflixHash);
    expect(netflixGroup).toHaveLength(2); // 2 transações Netflix
  });

  it('deve ignorar transações sem hash', () => {
    const transacoes: ParsedTransacao[] = [
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 1,
        // Sem hash
      },
    ];

    const groups = groupByHash(transacoes);
    expect(groups.size).toBe(0);
  });
});

describe('findDuplicateHashes', () => {
  it('deve encontrar hashes que aparecem mais de uma vez', async () => {
    const transacoes: ParsedTransacao[] = [
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 1,
      },
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 2,
      },
      {
        data: new Date(2024, 0, 16),
        descricao: 'SPOTIFY',
        valor: 19.90,
        tipo: 'despesa',
        linha_original: 3,
      },
    ];

    const withHashes = await addHashes(transacoes);
    const duplicates = findDuplicateHashes(withHashes);

    expect(duplicates).toHaveLength(1); // Apenas Netflix é duplicado
    expect(duplicates[0]).toBe(withHashes[0].hash);
  });

  it('deve retornar array vazio quando não há duplicatas', async () => {
    const transacoes: ParsedTransacao[] = [
      {
        data: new Date(2024, 0, 15),
        descricao: 'NETFLIX',
        valor: 39.90,
        tipo: 'despesa',
        linha_original: 1,
      },
      {
        data: new Date(2024, 0, 16),
        descricao: 'SPOTIFY',
        valor: 19.90,
        tipo: 'despesa',
        linha_original: 2,
      },
    ];

    const withHashes = await addHashes(transacoes);
    const duplicates = findDuplicateHashes(withHashes);

    expect(duplicates).toHaveLength(0);
  });
});
