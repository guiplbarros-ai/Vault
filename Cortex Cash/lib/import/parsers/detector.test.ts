/**
 * Testes para detector de formato de arquivo
 * Agent IMPORT: Tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectFormat,
  detectSeparator,
  detectHeaders,
  validateFileSize,
  validateFileContent,
} from './detector';

describe('detectFormat', () => {
  it('deve detectar formato OFX', async () => {
    const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
    `;

    const format = await detectFormat(ofxContent);
    expect(format.tipo).toBe('ofx');
    expect(format.confianca).toBeGreaterThan(0.9);
  });

  it('deve detectar formato CSV com vírgula', async () => {
    const csvContent = `Data,Descrição,Valor
15/01/2024,Netflix,-39.90
16/01/2024,Salário,5000.00`;

    const format = await detectFormat(csvContent);
    expect(format.tipo).toBe('csv');
    expect(format.detectado?.separador).toBe(',');
  });

  it('deve detectar formato CSV com ponto-e-vírgula', async () => {
    const csvContent = `Data;Descrição;Valor
15/01/2024;Netflix;-39,90
16/01/2024;Salário;5000,00`;

    const format = await detectFormat(csvContent);
    expect(format.tipo).toBe('csv');
    expect(format.detectado?.separador).toBe(';');
  });

  it('deve detectar headers no CSV', async () => {
    const csvContent = `Data,Descrição,Valor
15/01/2024,Netflix,-39.90`;

    const format = await detectFormat(csvContent);
    expect(format.detectado?.headers).toEqual(['Data', 'Descrição', 'Valor']);
  });

  it('deve retornar baixa confiança para conteúdo ambíguo', async () => {
    const ambiguousContent = 'abc';
    const format = await detectFormat(ambiguousContent);
    expect(format.confianca).toBeLessThan(0.7);
  });
});

describe('detectSeparator', () => {
  it('deve detectar vírgula como separador', () => {
    const content = 'Data,Descrição,Valor\n15/01/2024,Netflix,-39.90';
    expect(detectSeparator(content)).toBe(',');
  });

  it('deve detectar ponto-e-vírgula como separador', () => {
    const content = 'Data;Descrição;Valor\n15/01/2024;Netflix;-39,90';
    expect(detectSeparator(content)).toBe(';');
  });

  it('deve detectar tab como separador', () => {
    const content = 'Data\tDescrição\tValor\n15/01/2024\tNetflix\t-39.90';
    expect(detectSeparator(content)).toBe('\t');
  });

  it('deve detectar pipe como separador', () => {
    const content = 'Data|Descrição|Valor\n15/01/2024|Netflix|-39.90';
    expect(detectSeparator(content)).toBe('|');
  });

  it('deve priorizar ponto-e-vírgula quando há mais ocorrências', () => {
    const content = 'Data;Descrição;Valor;Categoria\n15/01/2024;Netflix;-39,90;Streaming';
    expect(detectSeparator(content)).toBe(';');
  });

  it('deve retornar vírgula como padrão para conteúdo vazio', () => {
    expect(detectSeparator('')).toBe(',');
  });
});

describe('detectHeaders', () => {
  it('deve detectar headers quando primeira linha é texto', () => {
    const content = 'Data,Descrição,Valor\n15/01/2024,Netflix,-39.90';
    const headers = detectHeaders(content, ',');
    expect(headers).toEqual(['Data', 'Descrição', 'Valor']);
  });

  it('deve remover aspas dos headers', () => {
    const content = '"Data","Descrição","Valor"\n15/01/2024,Netflix,-39.90';
    const headers = detectHeaders(content, ',');
    expect(headers).toEqual(['Data', 'Descrição', 'Valor']);
  });

  it('deve retornar undefined quando primeira linha tem números', () => {
    const content = '15/01/2024,Netflix,-39.90\n16/01/2024,Spotify,-19.90';
    const headers = detectHeaders(content, ',');
    expect(headers).toBeUndefined();
  });

  it('deve retornar undefined para conteúdo vazio', () => {
    const headers = detectHeaders('', ',');
    expect(headers).toBeUndefined();
  });

  it('deve detectar headers com espaços', () => {
    const content = '  Data  ,  Descrição  ,  Valor  \n15/01/2024,Netflix,-39.90';
    const headers = detectHeaders(content, ',');
    expect(headers).toEqual(['Data', 'Descrição', 'Valor']);
  });
});

describe('validateFileSize', () => {
  it('deve validar arquivo pequeno', () => {
    const result = validateFileSize(1024); // 1KB
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('deve validar arquivo médio', () => {
    const result = validateFileSize(5 * 1024 * 1024); // 5MB
    expect(result.valid).toBe(true);
  });

  it('deve rejeitar arquivo muito grande', () => {
    const result = validateFileSize(15 * 1024 * 1024); // 15MB
    expect(result.valid).toBe(false);
    expect(result.message).toContain('muito grande');
  });

  it('deve aceitar arquivo no limite (10MB)', () => {
    const result = validateFileSize(10 * 1024 * 1024); // 10MB exato
    expect(result.valid).toBe(true);
  });
});

describe('validateFileContent', () => {
  it('deve validar conteúdo com múltiplas linhas', () => {
    const content = 'Data,Descrição,Valor\n15/01/2024,Netflix,-39.90';
    const result = validateFileContent(content);
    expect(result.valid).toBe(true);
  });

  it('deve rejeitar conteúdo vazio', () => {
    const result = validateFileContent('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Arquivo vazio');
  });

  it('deve rejeitar conteúdo apenas com espaços', () => {
    const result = validateFileContent('   \n   \n   ');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Arquivo vazio');
  });

  it('deve rejeitar arquivo com apenas uma linha', () => {
    const result = validateFileContent('Data,Descrição,Valor');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('pelo menos 2 linhas');
  });

  it('deve validar arquivo com linhas vazias entre dados', () => {
    const content = 'Data,Descrição,Valor\n\n15/01/2024,Netflix,-39.90\n\n';
    const result = validateFileContent(content);
    expect(result.valid).toBe(true);
  });
});
