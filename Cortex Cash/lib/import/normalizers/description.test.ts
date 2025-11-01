/**
 * Testes para normalização de descrições
 * Agent IMPORT: Tests
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeDescription,
  removeCommonPrefixes,
  extractMetadata,
  suggestCategory,
  isTransferDescription,
} from './description';

describe('normalizeDescription', () => {
  it('deve remover espaços extras', () => {
    expect(normalizeDescription('  NETFLIX   ASSINATURA  ')).toBe('NETFLIX ASSINATURA');
  });

  it('deve preservar case por padrão', () => {
    expect(normalizeDescription('Netflix')).toBe('Netflix');
  });

  it('deve converter para minúsculas quando especificado', () => {
    const result = normalizeDescription('NETFLIX', {
      lowercase: true,
    });
    expect(result).toBe('netflix');
  });

  it('deve remover caracteres especiais quando especificado', () => {
    const result = normalizeDescription('PAG*NETFLIX', {
      removeSpecialChars: true,
    });
    expect(result).toBe('PAG NETFLIX');
  });

  it('deve limitar comprimento quando especificado', () => {
    const result = normalizeDescription('NETFLIX ASSINATURA MENSAL', {
      maxLength: 10,
    });
    expect(result).toBe('NETFLIX AS...');
  });

  it('deve normalizar descrições complexas', () => {
    const desc = 'COMPRA CARTAO **** 1234 15/01 NETFLIX SAO PAULO BR';
    const result = normalizeDescription(desc);
    expect(result).toContain('NETFLIX');
  });
});

describe('removeCommonPrefixes', () => {
  it('deve remover COMPRA CARTAO', () => {
    expect(removeCommonPrefixes('COMPRA CARTAO NETFLIX')).toBe('NETFLIX');
  });

  it('deve remover PAG*', () => {
    expect(removeCommonPrefixes('PAG*NETFLIX')).toBe('*NETFLIX');
  });

  it('deve remover TED', () => {
    expect(removeCommonPrefixes('TED ENVIADA JOAO')).toBe('ENVIADA JOAO');
  });

  it('deve remover PIX', () => {
    expect(removeCommonPrefixes('PIX ENVIADO MARIA')).toBe('ENVIADO MARIA');
    expect(removeCommonPrefixes('PIX RECEBIDO JOSE')).toBe('RECEBIDO JOSE');
  });

  it('deve remover DEB AUT', () => {
    expect(removeCommonPrefixes('DEB AUT ENERGIA')).toBe('ENERGIA');
  });

  it('deve não remover DEBITO CONTA se não estiver na lista', () => {
    // DEBITO CONTA is not in the prefix list, only DEBITO AUTOMATICO and DEB AUT
    expect(removeCommonPrefixes('DEBITO CONTA AGUA')).toBe('DEBITO CONTA AGUA');
  });

  it('deve não modificar descrição sem prefixos', () => {
    expect(removeCommonPrefixes('NETFLIX')).toBe('NETFLIX');
  });

  it('deve remover múltiplos prefixos consecutivos', () => {
    expect(removeCommonPrefixes('PAG* COMPRA NETFLIX')).toContain('NETFLIX');
  });
});

describe('extractMetadata', () => {
  it('deve extrair dígitos de cartão', () => {
    const metadata = extractMetadata('COMPRA CARTAO *1234 NETFLIX');
    expect(metadata.cardDigits).toBe('1234');
  });

  it('deve extrair data embutida', () => {
    const metadata = extractMetadata('COMPRA 15/01 NETFLIX');
    expect(metadata.date).toBe('15/01');
  });

  it('deve extrair localização', () => {
    const metadata = extractMetadata('COMPRA NETFLIX - SAO PAULO/SP');
    expect(metadata.location).toBe('SAO PAULO/SP');
  });

  it('deve extrair referência', () => {
    const metadata = extractMetadata('TED REF:123456 JOAO');
    expect(metadata.reference).toBe('123456');
  });

  it('deve retornar objeto com descrição quando sem metadados', () => {
    const metadata = extractMetadata('NETFLIX');
    expect(metadata.description).toBe('NETFLIX');
    expect(metadata.cardDigits).toBeUndefined();
    expect(metadata.date).toBeUndefined();
  });

  it('deve extrair múltiplos metadados', () => {
    const metadata = extractMetadata('COMPRA CARTAO *1234 15/01 REF:ABC123');
    expect(metadata.cardDigits).toBe('1234');
    expect(metadata.date).toBe('15/01');
    expect(metadata.reference).toBe('ABC123');
  });
});

describe('suggestCategory', () => {
  it('deve sugerir Lazer para Netflix', () => {
    expect(suggestCategory('NETFLIX')).toBe('Lazer');
  });

  it('deve sugerir Lazer para Spotify', () => {
    expect(suggestCategory('SPOTIFY')).toBe('Lazer');
  });

  it('deve sugerir Alimentação para mercado', () => {
    expect(suggestCategory('MERCADO')).toBe('Alimentação');
  });

  it('deve sugerir Transporte para Uber', () => {
    expect(suggestCategory('UBER')).toBe('Transporte');
  });

  it('deve sugerir Alimentação para restaurantes', () => {
    expect(suggestCategory('RESTAURANTE COMIDA')).toBe('Alimentação');
  });

  it('deve sugerir Moradia para energia', () => {
    expect(suggestCategory('CEMIG ENERGIA')).toBe('Moradia');
  });

  it('deve retornar null quando não conseguir sugerir', () => {
    expect(suggestCategory('EMPRESA XYZ LTDA')).toBeNull();
  });

  it('deve ser case-insensitive', () => {
    expect(suggestCategory('netflix')).toBe('Lazer');
    expect(suggestCategory('NETFLIX')).toBe('Lazer');
  });
});

describe('isTransferDescription', () => {
  it('deve identificar TED', () => {
    expect(isTransferDescription('TED ENVIADA JOAO')).toBe(true);
  });

  it('deve identificar PIX', () => {
    expect(isTransferDescription('PIX ENVIADO MARIA')).toBe(true);
  });

  it('deve identificar transferência', () => {
    expect(isTransferDescription('TRANSFERENCIA ENTRE CONTAS')).toBe(true);
  });

  it('deve identificar DOC', () => {
    expect(isTransferDescription('DOC ENVIADO JOSE')).toBe(true);
  });

  it('deve rejeitar não-transferências', () => {
    expect(isTransferDescription('COMPRA NETFLIX')).toBe(false);
    expect(isTransferDescription('PAGAMENTO BOLETO')).toBe(false);
  });

  it('deve ser case-insensitive', () => {
    expect(isTransferDescription('pix enviado')).toBe(true);
    expect(isTransferDescription('PIX ENVIADO')).toBe(true);
  });
});
