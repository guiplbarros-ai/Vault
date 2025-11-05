/**
 * Parser CSV Genérico
 * Agent DATA: Owner
 */

import { detectSeparator } from '../detectors/separator';
import { normalizeDate } from '../normalizers/date';
import { normalizeValue } from '../normalizers/value';

export interface CSVParseOptions {
  separator?: ',' | ';' | '\t' | '|';
  hasHeader?: boolean;
  encoding?: 'UTF-8' | 'ISO-8859-1';
  skipRows?: number;
  columnMapping?: {
    date: number | string;
    description: number | string;
    value: number | string;
    type?: number | string;
  };
}

export interface ParsedTransaction {
  data: string;
  descricao: string;
  valor: number;
  tipo?: 'receita' | 'despesa';
  rawData?: Record<string, string>;
}

export interface CSVParseResult {
  transactions: ParsedTransaction[];
  metadata: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    separator: string;
    format: string;
    hasHeader: boolean;
  };
  errors: Array<{ row: number; message: string }>;
}

export async function parseCSV(
  file: File | string,
  options: CSVParseOptions = {}
): Promise<CSVParseResult> {
  const content = typeof file === 'string' ? file : await file.text();
  const lines = content.split('\n').filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('Arquivo vazio');
  }

  const separator = options.separator || detectSeparator(content);
  const hasHeader = options.hasHeader ?? true;
  const skipRows = options.skipRows ?? 0;

  const startRow = skipRows + (hasHeader ? 1 : 0);
  const dataLines = lines.slice(startRow);

  const transactions: ParsedTransaction[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let validRows = 0;
  let invalidRows = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const rowNumber = startRow + i + 1;

    try {
      const columns = line.split(separator).map(col => col.trim().replace(/^"|"$/g, ''));

      // Aplica mapeamento de colunas (se fornecido)
      let dateStr: string = '';
      let description: string = '';
      let valueStr: string = '';
      let typeStr: string = '';

      if (options.columnMapping) {
        const { date, description: desc, value, type } = options.columnMapping;
        dateStr = columns[typeof date === 'number' ? date : columns.indexOf(date)] || '';
        description = columns[typeof desc === 'number' ? desc : columns.indexOf(desc)] || '';
        valueStr = columns[typeof value === 'number' ? value : columns.indexOf(value)] || '';
        if (type !== undefined) {
          typeStr = columns[typeof type === 'number' ? type : columns.indexOf(type)] || '';
        }
      } else {
        // Tenta inferir (assume primeira coluna = data, segunda = descrição, terceira = valor)
        dateStr = columns[0] || '';
        description = columns[1] || '';
        valueStr = columns[2] || '';
      }

      // Normaliza dados
      const data = normalizeDate(dateStr);
      const valor = normalizeValue(valueStr);

      if (!data) {
        throw new Error(`Data inválida: "${dateStr}"`);
      }
      if (valor === null) {
        throw new Error(`Valor inválido: "${valueStr}"`);
      }
      if (!description) {
        throw new Error('Descrição vazia');
      }

      // Detecta tipo (receita/despesa)
      let tipo: 'receita' | 'despesa' | undefined;
      if (typeStr) {
        const lower = typeStr.toLowerCase();
        if (lower.includes('receita') || lower.includes('credit')) tipo = 'receita';
        else if (lower.includes('despesa') || lower.includes('debit')) tipo = 'despesa';
      } else {
        tipo = valor >= 0 ? 'receita' : 'despesa';
      }

      transactions.push({
        data,
        descricao: description,
        valor: Math.abs(valor),
        tipo,
        rawData: columns.reduce((acc, col, idx) => {
          acc[`col_${idx}`] = col;
          return acc;
        }, {} as Record<string, string>),
      });

      validRows++;
    } catch (error) {
      invalidRows++;
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  return {
    transactions,
    metadata: {
      totalRows: dataLines.length,
      validRows,
      invalidRows,
      separator,
      format: 'CSV',
      hasHeader,
    },
    errors,
  };
}
