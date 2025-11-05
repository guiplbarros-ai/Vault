/**
 * Templates de Importação por Instituição
 * Agent DATA: Owner
 */

export interface ImportTemplate {
  id: string;
  nome: string;
  instituicao: string;
  descricao: string;
  formato: 'csv' | 'ofx';
  separador?: ',' | ';' | '\t';
  encoding?: 'UTF-8' | 'ISO-8859-1';
  hasHeader: boolean;
  skipRows?: number;
  columnMapping: {
    date: number | string;
    description: number | string;
    value: number | string;
    type?: number | string;
    balance?: number | string;
  };
  exemplo: string;
}

export const TEMPLATES: Record<string, ImportTemplate> = {
  bradesco: {
    id: 'bradesco',
    nome: 'Bradesco - Extrato Conta Corrente',
    instituicao: 'Bradesco',
    descricao: 'Formato padrão do extrato CSV do Bradesco',
    formato: 'csv',
    separador: ';',
    encoding: 'ISO-8859-1',
    hasHeader: true,
    skipRows: 0,
    columnMapping: {
      date: 0,        // Data
      description: 1, // Descrição
      type: 2,        // D/C (Débito/Crédito)
      value: 3,       // Valor
      balance: 4,     // Saldo
    },
    exemplo: `Data;Descrição;D/C;Valor;Saldo
01/01/2024;COMPRA CARTAO;D;150,00;2.850,00
02/01/2024;SALARIO;C;5.000,00;7.850,00`,
  },

  inter: {
    id: 'inter',
    nome: 'Inter - Extrato',
    instituicao: 'Banco Inter',
    descricao: 'Formato padrão do extrato CSV do Inter',
    formato: 'csv',
    separador: ',',
    encoding: 'UTF-8',
    hasHeader: true,
    skipRows: 0,
    columnMapping: {
      date: 0,
      description: 1,
      value: 2,
    },
    exemplo: `Data,Descrição,Valor
2024-01-01,PIX RECEBIDO,500.00
2024-01-02,COMPRA DEBITO,-150.00`,
  },

  nubank: {
    id: 'nubank',
    nome: 'Nubank - Fatura Cartão',
    instituicao: 'Nubank',
    descricao: 'Formato padrão da fatura CSV do Nubank',
    formato: 'csv',
    separador: ',',
    encoding: 'UTF-8',
    hasHeader: true,
    skipRows: 0,
    columnMapping: {
      date: 0,
      value: 1,
      description: 2,
    },
    exemplo: `date,amount,title
2024-01-15,150.00,Uber
2024-01-16,45.90,iFood`,
  },

  santander: {
    id: 'santander',
    nome: 'Santander - Extrato',
    instituicao: 'Santander',
    descricao: 'Formato padrão do extrato CSV do Santander',
    formato: 'csv',
    separador: ';',
    encoding: 'ISO-8859-1',
    hasHeader: true,
    skipRows: 0,
    columnMapping: {
      date: 0,
      description: 1,
      value: 2,
      balance: 3,
    },
    exemplo: `Data;Lançamento;Valor;Saldo
01/01/2024;COMPRA DEBITO;-100,00;5.900,00
02/01/2024;TED RECEBIDA;2.000,00;7.900,00`,
  },

  itau: {
    id: 'itau',
    nome: 'Itaú - Extrato',
    instituicao: 'Itaú',
    descricao: 'Formato padrão do extrato CSV do Itaú',
    formato: 'csv',
    separador: ',',
    encoding: 'ISO-8859-1',
    hasHeader: true,
    skipRows: 0,
    columnMapping: {
      date: 0,
      description: 1,
      value: 2,
    },
    exemplo: `data,lançamento,valor
01/01/2024,COMPRA CARTAO,-150.00
02/01/2024,SALARIO,5000.00`,
  },

  caixa: {
    id: 'caixa',
    nome: 'Caixa Econômica - Extrato',
    instituicao: 'Caixa Econômica Federal',
    descricao: 'Formato padrão do extrato CSV da Caixa',
    formato: 'csv',
    separador: ';',
    encoding: 'ISO-8859-1',
    hasHeader: true,
    skipRows: 0,
    columnMapping: {
      date: 0,
      description: 1,
      value: 2,
      type: 3,
    },
    exemplo: `Data;Histórico;Valor;Tipo
01/01/2024;SAQUE ATM;200,00;D
02/01/2024;DEPOSITO;1.000,00;C`,
  },

  generic: {
    id: 'generic',
    nome: 'Genérico - CSV Simples',
    instituicao: 'Qualquer banco',
    descricao: 'Template genérico para CSV com 3 colunas: Data, Descrição, Valor',
    formato: 'csv',
    separador: ',',
    encoding: 'UTF-8',
    hasHeader: true,
    skipRows: 0,
    columnMapping: {
      date: 0,
      description: 1,
      value: 2,
    },
    exemplo: `Data,Descrição,Valor
01/01/2024,Compra,150.00
02/01/2024,Salário,5000.00`,
  },
};

/**
 * Retorna template por ID
 */
export function getTemplate(id: string): ImportTemplate | null {
  return TEMPLATES[id] || null;
}

/**
 * Lista todos os templates disponíveis
 */
export function listTemplates(): ImportTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Busca templates por instituição
 */
export function searchTemplates(query: string): ImportTemplate[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(TEMPLATES).filter(
    t =>
      t.nome.toLowerCase().includes(lowerQuery) ||
      t.instituicao.toLowerCase().includes(lowerQuery)
  );
}
