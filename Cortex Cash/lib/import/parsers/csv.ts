/**
 * Parser CSV
 * Agent IMPORT: Parse arquivos CSV tolerante a variações
 */

import type {
  ParseConfig,
  ParseResult,
  ParsedTransacao,
  ParseError,
  MapeamentoColunas,
  TipoTransacao,
} from '@/lib/types';
import { normalizeDate } from '../normalizers/date';
import { normalizeValue } from '../normalizers/value';
import { normalizeDescription } from '../normalizers/description';

/**
 * Faz parse de um arquivo CSV
 *
 * @param content Conteúdo do arquivo CSV
 * @param mapeamento Mapeamento de colunas (índices)
 * @param config Configurações de parse
 * @returns Resultado do parse com transações e erros
 *
 * @example
 * const result = await parseCSV(csvContent, {
 *   data: 0,
 *   descricao: 1,
 *   valor: 2
 * }, {
 *   separador: ';',
 *   pular_linhas: 1
 * })
 */
export async function parseCSV(
  content: string,
  mapeamento: MapeamentoColunas,
  config: ParseConfig = {}
): Promise<ParseResult> {
  const {
    separador = ',',
    pular_linhas = 0,
    formato_data,
    separador_decimal = ',',
  } = config;

  const transacoes: ParsedTransacao[] = [];
  const erros: ParseError[] = [];

  // Split em linhas e remover vazias
  const lines = content.split('\n').filter((l) => l.trim());

  // Pular linhas iniciais (geralmente cabeçalho)
  const dataLines = lines.slice(pular_linhas);

  let totalLinhas = dataLines.length;
  let linhasValidas = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const lineNumber = i + pular_linhas + 1; // +1 para numerar a partir de 1
    const line = dataLines[i].trim();

    if (!line) continue;

    try {
      const cells = splitCSVLine(line, separador);

      // Extrair campos usando mapeamento
      const dataStr = cells[mapeamento.data]?.trim();
      const descricao = cells[mapeamento.descricao]?.trim();
      const valorStr = cells[mapeamento.valor]?.trim();

      // Validar campos obrigatórios
      if (!dataStr || !descricao || !valorStr) {
        erros.push({
          linha: lineNumber,
          mensagem: 'Campos obrigatórios faltando (data, descrição ou valor)',
        });
        continue;
      }

      // Parse data
      const data = normalizeDate(dataStr, formato_data);
      if (!data) {
        erros.push({
          linha: lineNumber,
          campo: 'data',
          mensagem: `Não foi possível fazer parse da data: "${dataStr}"`,
          valor_original: dataStr,
        });
        continue;
      }

      // Parse valor
      const valor = normalizeValue(
        valorStr,
        separador_decimal === ',' || separador_decimal === '.' ? separador_decimal : ','
      );
      if (valor === null) {
        erros.push({
          linha: lineNumber,
          campo: 'valor',
          mensagem: `Não foi possível fazer parse do valor: "${valorStr}"`,
          valor_original: valorStr,
        });
        continue;
      }

      // Detectar tipo da transação (receita/despesa)
      let tipo: TipoTransacao | undefined;
      if (mapeamento.tipo !== undefined && cells[mapeamento.tipo]) {
        tipo = detectTipo(cells[mapeamento.tipo].trim(), valor);
      } else {
        // Inferir do valor: negativo = despesa, positivo = receita
        tipo = valor < 0 ? 'despesa' : 'receita';
      }

      // Campos opcionais
      const categoria = mapeamento.categoria !== undefined
        ? cells[mapeamento.categoria]?.trim()
        : undefined;

      const observacoes = mapeamento.observacoes !== undefined
        ? cells[mapeamento.observacoes]?.trim()
        : undefined;

      // Criar transação parsed
      const transacao: ParsedTransacao = {
        data,
        descricao: normalizeDescription(descricao),
        valor: Math.abs(valor), // Sempre positivo
        tipo,
        categoria,
        observacoes,
        linha_original: lineNumber,
      };

      transacoes.push(transacao);
      linhasValidas++;
    } catch (error) {
      erros.push({
        linha: lineNumber,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido ao processar linha',
      });
    }
  }

  return {
    success: erros.length < totalLinhas / 2, // Sucesso se menos de 50% de erros
    transacoes,
    erros,
    resumo: {
      total_linhas: totalLinhas,
      linhas_validas: linhasValidas,
      linhas_invalidas: erros.length,
      duplicatas: 0, // Será calculado depois no dedupe
    },
  };
}

/**
 * Split de linha CSV respeitando aspas
 * Exemplo: "Empresa, Inc.",123,456 → ["Empresa, Inc.", "123", "456"]
 */
function splitCSVLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Toggle quotes
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      // Separador fora de aspas = fim da célula
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Adicionar última célula
  cells.push(current.trim());

  // Remover aspas das células
  return cells.map((cell) => cell.replace(/^"|"$/g, ''));
}

/**
 * Detecta o tipo de transação (receita/despesa/transferência)
 * baseado em uma coluna do CSV ou no valor
 */
function detectTipo(
  tipoStr: string,
  valor: number
): TipoTransacao {
  const lower = tipoStr.toLowerCase();

  // Palavras-chave para receita
  if (lower.includes('receita') || lower.includes('credito') || lower.includes('entrada')) {
    return 'receita';
  }

  // Palavras-chave para despesa
  if (lower.includes('despesa') || lower.includes('debito') || lower.includes('saida')) {
    return 'despesa';
  }

  // Palavras-chave para transferência
  if (lower.includes('transferencia') || lower.includes('transf')) {
    return 'transferencia';
  }

  // Fallback: inferir do valor
  return valor < 0 ? 'despesa' : 'receita';
}

/**
 * Sugere mapeamento automático baseado nos headers do CSV
 * Retorna índices sugeridos para cada campo
 *
 * @param headers Array com nomes das colunas
 * @returns Mapeamento sugerido
 *
 * @example
 * suggestMapping(['Data', 'Descrição', 'Valor'])
 * // { data: 0, descricao: 1, valor: 2 }
 */
export function suggestMapping(headers: string[]): Partial<MapeamentoColunas> {
  const mapping: Partial<MapeamentoColunas> = {};

  const lowerHeaders = headers.map((h) => h.toLowerCase());

  // Detectar coluna de data
  const dataKeywords = ['data', 'date', 'dia'];
  mapping.data = lowerHeaders.findIndex((h) =>
    dataKeywords.some((k) => h.includes(k))
  );

  // Detectar coluna de descrição
  const descKeywords = ['descricao', 'descrição', 'historico', 'description', 'desc'];
  mapping.descricao = lowerHeaders.findIndex((h) =>
    descKeywords.some((k) => h.includes(k))
  );

  // Detectar coluna de valor
  const valorKeywords = ['valor', 'value', 'amount', 'montante'];
  mapping.valor = lowerHeaders.findIndex((h) =>
    valorKeywords.some((k) => h.includes(k))
  );

  // Detectar coluna de tipo (opcional)
  const tipoKeywords = ['tipo', 'type', 'natureza'];
  const tipoIdx = lowerHeaders.findIndex((h) =>
    tipoKeywords.some((k) => h.includes(k))
  );
  if (tipoIdx !== -1) {
    mapping.tipo = tipoIdx;
  }

  // Detectar coluna de categoria (opcional)
  const catKeywords = ['categoria', 'category', 'cat'];
  const catIdx = lowerHeaders.findIndex((h) =>
    catKeywords.some((k) => h.includes(k))
  );
  if (catIdx !== -1) {
    mapping.categoria = catIdx;
  }

  // Detectar coluna de observações (opcional)
  const obsKeywords = ['observacoes', 'observações', 'obs', 'notes', 'memo'];
  const obsIdx = lowerHeaders.findIndex((h) =>
    obsKeywords.some((k) => h.includes(k))
  );
  if (obsIdx !== -1) {
    mapping.observacoes = obsIdx;
  }

  return mapping;
}

/**
 * Valida se o mapeamento tem os campos obrigatórios
 */
export function validateMapping(mapping: Partial<MapeamentoColunas>): {
  valid: boolean;
  missing?: string[];
} {
  const required: (keyof MapeamentoColunas)[] = ['data', 'descricao', 'valor'];
  const missing: string[] = [];

  for (const field of required) {
    if (mapping[field] === undefined || mapping[field] === -1) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
  };
}

/**
 * Gera amostra de dados do CSV para preview
 *
 * @param content Conteúdo do CSV
 * @param separator Separador
 * @param maxLines Número máximo de linhas (padrão: 5)
 * @returns Array de arrays com as células
 */
export function generateSample(
  content: string,
  separator: string,
  maxLines = 5
): string[][] {
  const lines = content.split('\n').filter((l) => l.trim());
  const sample = lines.slice(0, maxLines);

  return sample.map((line) => splitCSVLine(line, separator));
}
