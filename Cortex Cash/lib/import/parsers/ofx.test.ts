/**
 * Testes para parser OFX
 * Agent IMPORT: Tests
 */

import { describe, it, expect } from 'vitest';
import { parseOFX, validateOFX } from './ofx';

describe('parseOFX', () => {
  it('deve fazer parse de OFX 1.x básico', async () => {
    const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<BANKTRANLIST>
<CURDEF>BRL
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240116
<TRNAMT>5000.00
<FITID>123457
<MEMO>SALARIO
</STMTTRN>
</BANKTRANLIST>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
    `;

    const result = await parseOFX(ofxContent);

    expect(result.success).toBe(true);
    expect(result.transacoes).toHaveLength(2);
    expect(result.transacoes[0].tipo).toBe('despesa');
    expect(result.transacoes[1].tipo).toBe('receita');
  });

  it('deve extrair descrição do campo MEMO', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX ASSINATURA
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.transacoes[0].descricao).toContain('NETFLIX');
  });

  it('deve extrair descrição do campo NAME quando MEMO não existe', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>123456
<NAME>NETFLIX
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.transacoes[0].descricao).toContain('NETFLIX');
  });

  it('deve fazer parse de data no formato YYYYMMDD', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    const data = result.transacoes[0].data;

    expect(data.getFullYear()).toBe(2024);
    expect(data.getMonth()).toBe(0); // Janeiro
    expect(data.getDate()).toBe(15);
  });

  it('deve fazer parse de data com timestamp YYYYMMDDHHMMSS', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115123456
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    const data = result.transacoes[0].data;

    expect(data.getFullYear()).toBe(2024);
    expect(data.getMonth()).toBe(0);
    expect(data.getDate()).toBe(15);
  });

  it('deve fazer parse de data com timezone', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115[-3:GMT]
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.transacoes[0].data).toBeInstanceOf(Date);
  });

  it('deve detectar tipo DEBIT como despesa', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.transacoes[0].tipo).toBe('despesa');
  });

  it('deve detectar tipo CREDIT como receita', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>5000.00
<FITID>123456
<MEMO>SALARIO
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.transacoes[0].tipo).toBe('receita');
  });

  it('deve detectar tipo XFER como transferência', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>XFER
<DTPOSTED>20240115
<TRNAMT>1000.00
<FITID>123456
<MEMO>TRANSFERENCIA
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.transacoes[0].tipo).toBe('transferencia');
  });

  it('deve incluir FITID nas observações', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>ABC123456
<MEMO>NETFLIX
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.transacoes[0].observacoes).toContain('ABC123456');
  });

  it('deve reportar erros para datas inválidas', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>INVALID
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].campo).toBe('data');
  });

  it('deve reportar erros para valores inválidos', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>INVALID
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].campo).toBe('valor');
  });

  it('deve retornar valores sempre positivos', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.transacoes[0].valor).toBe(50.00);
  });

  it('deve retornar resumo correto', async () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-50.00
<FITID>123456
<MEMO>NETFLIX
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240116
<TRNAMT>5000.00
<FITID>123457
<MEMO>SALARIO
</STMTTRN>
</OFX>
    `;

    const result = await parseOFX(ofxContent);
    expect(result.resumo.total_linhas).toBe(2);
    expect(result.resumo.linhas_validas).toBe(2);
    expect(result.resumo.linhas_invalidas).toBe(0);
  });

  it('deve retornar transações vazias para OFX sem transações válidas', async () => {
    const result = await parseOFX('INVALID CONTENT');
    // May return success: false or success: true with 0 transactions
    expect(result.transacoes).toHaveLength(0);
  });
});

describe('validateOFX', () => {
  it('deve validar OFX 1.x com OFXHEADER', () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
</STMTTRN>
</OFX>
    `;

    const result = validateOFX(ofxContent);
    expect(result.valid).toBe(true);
  });

  it('deve validar OFX 2.x com XML header', () => {
    const ofxContent = `
<?xml version="1.0"?>
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
</STMTTRN>
</OFX>
    `;

    const result = validateOFX(ofxContent);
    expect(result.valid).toBe(true);
  });

  it('deve validar OFX com tag <OFX>', () => {
    const ofxContent = `
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
</STMTTRN>
</OFX>
    `;

    const result = validateOFX(ofxContent);
    expect(result.valid).toBe(true);
  });

  it('deve rejeitar conteúdo vazio', () => {
    const result = validateOFX('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Arquivo OFX vazio');
  });

  it('deve rejeitar arquivo sem assinatura OFX', () => {
    const result = validateOFX('some random content');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('não parece ser um OFX válido');
  });

  it('deve rejeitar OFX sem transações', () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
</OFX>
    `;

    const result = validateOFX(ofxContent);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('não contém transações');
  });

  it('deve validar com tag STMTTRN', () => {
    const ofxContent = `
OFXHEADER:100
<OFX>
<STMTTRN>
</STMTTRN>
</OFX>
    `;

    const result = validateOFX(ofxContent);
    expect(result.valid).toBe(true);
  });
});
