/**
 * Parser OFX (Open Financial Exchange)
 * Agent IMPORT: Parse arquivos OFX 1.x e 2.x
 *
 * OFX é usado por bancos brasileiros como Bradesco, Itaú, Santander, etc.
 */

import type {
  ParseConfig,
  ParseResult,
  ParsedTransacao,
  ParseError,
  TipoTransacao,
} from '@/lib/types';
import { normalizeDate } from '../normalizers/date';
import { normalizeDescription } from '../normalizers/description';

/**
 * Faz parse de um arquivo OFX
 *
 * @param content Conteúdo do arquivo OFX
 * @param config Configurações opcionais
 * @returns Resultado do parse com transações e erros
 *
 * @example
 * const result = await parseOFX(ofxContent)
 * console.log(result.transacoes.length)
 */
export async function parseOFX(
  content: string,
  config: ParseConfig = {}
): Promise<ParseResult> {
  const transacoes: ParsedTransacao[] = [];
  const erros: ParseError[] = [];

  try {
    // Detectar versão OFX
    const version = detectOFXVersion(content);

    // Parse baseado na versão
    let statements: OFXStatement[];

    if (version === 2) {
      statements = parseOFXv2(content);
    } else {
      statements = parseOFXv1(content);
    }

    // Converter statements em transações
    let lineNumber = 0;

    for (const stmt of statements) {
      for (const txn of stmt.transactions) {
        lineNumber++;

        try {
          // Parse data (formato OFX: YYYYMMDD ou YYYYMMDDHHMMSS)
          const data = parseDateOFX(txn.DTPOSTED);

          if (!data) {
            erros.push({
              linha: lineNumber,
              campo: 'data',
              mensagem: `Data inválida no OFX: ${txn.DTPOSTED}`,
              valor_original: txn.DTPOSTED,
            });
            continue;
          }

          // Parse valor
          const valor = parseFloat(txn.TRNAMT);

          if (isNaN(valor)) {
            erros.push({
              linha: lineNumber,
              campo: 'valor',
              mensagem: `Valor inválido no OFX: ${txn.TRNAMT}`,
              valor_original: txn.TRNAMT,
            });
            continue;
          }

          // Determinar tipo (OFX usa TRNTYPE: DEBIT, CREDIT, etc)
          const tipo = detectTipoOFX(txn.TRNTYPE, valor);

          // Descrição (pode vir em MEMO ou NAME)
          const descricao = normalizeDescription(txn.MEMO || txn.NAME || 'Transação OFX');

          const transacao: ParsedTransacao = {
            data,
            descricao,
            valor: Math.abs(valor),
            tipo,
            observacoes: txn.FITID ? `ID: ${txn.FITID}` : undefined,
            linha_original: lineNumber,
          };

          transacoes.push(transacao);
        } catch (error) {
          erros.push({
            linha: lineNumber,
            mensagem: error instanceof Error ? error.message : 'Erro ao processar transação OFX',
          });
        }
      }
    }

    return {
      success: erros.length < transacoes.length,
      transacoes,
      erros,
      resumo: {
        total_linhas: lineNumber,
        linhas_validas: transacoes.length,
        linhas_invalidas: erros.length,
        duplicatas: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      transacoes: [],
      erros: [
        {
          linha: 0,
          mensagem: error instanceof Error
            ? `Erro ao fazer parse do OFX: ${error.message}`
            : 'Erro desconhecido ao processar OFX',
        },
      ],
      resumo: {
        total_linhas: 0,
        linhas_validas: 0,
        linhas_invalidas: 1,
        duplicatas: 0,
      },
    };
  }
}

/**
 * Detecta versão do OFX (1.x ou 2.x)
 */
function detectOFXVersion(content: string): number {
  // OFX 2.x usa XML (<OFX> tag)
  if (content.includes('<?xml') || content.includes('<OFX xmlns')) {
    return 2;
  }

  // OFX 1.x usa SGML (tags sem fechar)
  return 1;
}

/**
 * Interface para transação OFX
 */
interface OFXTransaction {
  TRNTYPE: string;   // DEBIT, CREDIT, etc
  DTPOSTED: string;  // YYYYMMDD
  TRNAMT: string;    // Valor
  FITID: string;     // ID único
  MEMO?: string;     // Descrição
  NAME?: string;     // Nome alternativo
  CHECKNUM?: string; // Número do cheque
}

/**
 * Interface para statement OFX
 */
interface OFXStatement {
  CURDEF: string;    // Moeda (BRL, USD, etc)
  BANKID?: string;   // ID do banco
  ACCTID?: string;   // ID da conta
  transactions: OFXTransaction[];
}

/**
 * Parse OFX versão 1.x (SGML-like)
 */
function parseOFXv1(content: string): OFXStatement[] {
  const statements: OFXStatement[] = [];

  // Extrair blocos <STMTTRN>...</STMTTRN>
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  const matches = content.matchAll(stmtTrnRegex);

  const transactions: OFXTransaction[] = [];

  for (const match of matches) {
    const block = match[1];

    const txn: OFXTransaction = {
      TRNTYPE: extractTag(block, 'TRNTYPE') || 'OTHER',
      DTPOSTED: extractTag(block, 'DTPOSTED') || '',
      TRNAMT: extractTag(block, 'TRNAMT') || '0',
      FITID: extractTag(block, 'FITID') || '',
      MEMO: extractTag(block, 'MEMO'),
      NAME: extractTag(block, 'NAME'),
      CHECKNUM: extractTag(block, 'CHECKNUM'),
    };

    transactions.push(txn);
  }

  // Extrair informações da conta
  const curdef = extractTag(content, 'CURDEF') || 'BRL';
  const bankid = extractTag(content, 'BANKID');
  const acctid = extractTag(content, 'ACCTID');

  statements.push({
    CURDEF: curdef,
    BANKID: bankid,
    ACCTID: acctid,
    transactions,
  });

  return statements;
}

/**
 * Parse OFX versão 2.x (XML)
 */
function parseOFXv2(content: string): OFXStatement[] {
  // OFX 2.x é XML válido, mas vamos usar regex por simplicidade
  // Em produção, usar DOMParser seria melhor
  return parseOFXv1(content); // Usar mesmo parser por enquanto
}

/**
 * Extrai valor de uma tag OFX (formato SGML: <TAG>valor)
 */
function extractTag(content: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}>([^<]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * Parse data no formato OFX (YYYYMMDD ou YYYYMMDDHHMMSS)
 */
function parseDateOFX(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Remover timezone se houver (ex: 20240115[-3:GMT])
  const cleaned = dateStr.split('[')[0].trim();

  // Extrair componentes YYYYMMDD
  const year = cleaned.substring(0, 4);
  const month = cleaned.substring(4, 6);
  const day = cleaned.substring(6, 8);

  if (!year || !month || !day) return null;

  // Criar data ISO
  const isoDate = `${year}-${month}-${day}`;
  const date = normalizeDate(isoDate);

  return date;
}

/**
 * Detecta tipo de transação baseado em TRNTYPE do OFX
 */
function detectTipoOFX(trnType: string, valor: number): TipoTransacao {
  const upper = trnType.toUpperCase();

  // CREDIT = Receita
  if (upper.includes('CREDIT') || upper.includes('DEP')) {
    return 'receita';
  }

  // DEBIT = Despesa
  if (upper.includes('DEBIT') || upper.includes('PAYMENT')) {
    return 'despesa';
  }

  // XFER = Transferência
  if (upper.includes('XFER') || upper.includes('TRANSFER')) {
    return 'transferencia';
  }

  // Fallback: usar valor
  return valor < 0 ? 'despesa' : 'receita';
}

/**
 * Valida estrutura básica do OFX
 */
export function validateOFX(content: string): {
  valid: boolean;
  message?: string;
} {
  if (!content || content.trim().length === 0) {
    return {
      valid: false,
      message: 'Arquivo OFX vazio',
    };
  }

  // Verificar assinaturas OFX
  const hasOFXHeader =
    content.includes('OFXHEADER:') ||
    content.includes('<OFX>') ||
    content.includes('<?xml');

  if (!hasOFXHeader) {
    return {
      valid: false,
      message: 'Arquivo não parece ser um OFX válido',
    };
  }

  // Verificar se tem transações
  const hasTransactions = content.includes('<STMTTRN>') || content.includes('STMTTRN');

  if (!hasTransactions) {
    return {
      valid: false,
      message: 'Arquivo OFX não contém transações',
    };
  }

  return { valid: true };
}
