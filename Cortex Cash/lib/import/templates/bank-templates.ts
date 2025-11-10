/**
 * Templates pré-configurados para bancos brasileiros
 * Agent IMPORT: Bank Templates
 *
 * Estes templates são baseados nos formatos reais de exportação
 * dos principais bancos brasileiros (atualizado em 2024/2025)
 */

import type { TemplateImportacao } from '@/lib/types';

/**
 * Template para Nubank
 * Formato: CSV com vírgula, UTF-8
 * Colunas: Data,Categoria,Título,Valor
 */
export const NUBANK_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'Nubank - Extrato de Conta',
  tipo_arquivo: 'csv',
  separador: ',',
  encoding: 'utf-8',
  pular_linhas: 1, // Pular header
  mapeamento_colunas: JSON.stringify({
    data: 0,        // Coluna "Data"
    categoria: 1,   // Coluna "Categoria" (opcional)
    descricao: 2,   // Coluna "Título"
    valor: 3,       // Coluna "Valor"
  }),
  formato_data: 'yyyy-MM-dd', // Nubank usa ISO
  separador_decimal: '.',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Template para Inter
 * Formato: CSV com ponto-e-vírgula, UTF-8
 * Colunas: Data;Descrição;Valor;Saldo
 */
export const INTER_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'Inter - Extrato de Conta',
  tipo_arquivo: 'csv',
  separador: ';',
  encoding: 'utf-8',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,        // Coluna "Data"
    descricao: 1,   // Coluna "Descrição"
    valor: 2,       // Coluna "Valor"
    // Saldo na coluna 3 (ignorado)
  }),
  formato_data: 'dd/MM/yyyy',
  separador_decimal: ',',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Template para Bradesco
 * Formato: CSV com ponto-e-vírgula, ISO-8859-1
 * Colunas: Data;Histórico;Número do Documento;Valor;Saldo
 */
export const BRADESCO_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'Bradesco - Extrato de Conta Corrente',
  tipo_arquivo: 'csv',
  separador: ';',
  encoding: 'iso-8859-1',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,        // Coluna "Data"
    descricao: 1,   // Coluna "Histórico"
    // Número do Documento na coluna 2 (ignorado)
    valor: 3,       // Coluna "Valor"
    // Saldo na coluna 4 (ignorado)
  }),
  formato_data: 'dd/MM/yyyy',
  separador_decimal: ',',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Template para Itaú
 * Formato: CSV com vírgula, ISO-8859-1
 * Colunas: data,lançamento,ag.,conta,valor
 */
export const ITAU_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'Itaú - Extrato de Conta Corrente',
  tipo_arquivo: 'csv',
  separador: ',',
  encoding: 'iso-8859-1',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,        // Coluna "data"
    descricao: 1,   // Coluna "lançamento"
    // ag. na coluna 2 (ignorado)
    // conta na coluna 3 (ignorado)
    valor: 4,       // Coluna "valor"
  }),
  formato_data: 'dd/MM/yyyy',
  separador_decimal: ',',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Template para Santander
 * Formato: CSV com ponto-e-vírgula, ISO-8859-1
 * Colunas: Data;Descrição;Número;Agência;Valor;Saldo
 */
export const SANTANDER_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'Santander - Extrato de Conta',
  tipo_arquivo: 'csv',
  separador: ';',
  encoding: 'iso-8859-1',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,        // Coluna "Data"
    descricao: 1,   // Coluna "Descrição"
    // Número na coluna 2 (ignorado)
    // Agência na coluna 3 (ignorado)
    valor: 4,       // Coluna "Valor"
    // Saldo na coluna 5 (ignorado)
  }),
  formato_data: 'dd/MM/yyyy',
  separador_decimal: ',',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Template para Banco do Brasil
 * Formato: CSV com ponto-e-vírgula, ISO-8859-1
 * Colunas: Data;Histórico;DocIdentificador;ValorTransacao;SaldoContaCorrente
 */
export const BB_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'Banco do Brasil - Extrato',
  tipo_arquivo: 'csv',
  separador: ';',
  encoding: 'iso-8859-1',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,        // Coluna "Data"
    descricao: 1,   // Coluna "Histórico"
    // DocIdentificador na coluna 2 (ignorado)
    valor: 3,       // Coluna "ValorTransacao"
    // SaldoContaCorrente na coluna 4 (ignorado)
  }),
  formato_data: 'dd/MM/yyyy',
  separador_decimal: ',',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Template para Caixa Econômica Federal
 * Formato: CSV com ponto-e-vírgula, ISO-8859-1
 * Colunas: Data;Descrição;Valor;Saldo
 */
export const CAIXA_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'Caixa Econômica - Extrato',
  tipo_arquivo: 'csv',
  separador: ';',
  encoding: 'iso-8859-1',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,        // Coluna "Data"
    descricao: 1,   // Coluna "Descrição"
    valor: 2,       // Coluna "Valor"
    // Saldo na coluna 3 (ignorado)
  }),
  formato_data: 'dd/MM/yyyy',
  separador_decimal: ',',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Template para C6 Bank
 * Formato: CSV com vírgula, UTF-8
 * Colunas: Data,Descrição,Valor,Categoria
 */
export const C6_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'C6 Bank - Extrato',
  tipo_arquivo: 'csv',
  separador: ',',
  encoding: 'utf-8',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,        // Coluna "Data"
    descricao: 1,   // Coluna "Descrição"
    valor: 2,       // Coluna "Valor"
    categoria: 3,   // Coluna "Categoria" (opcional)
  }),
  formato_data: 'dd/MM/yyyy',
  separador_decimal: '.',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Template para PicPay
 * Formato: CSV com vírgula, UTF-8
 * Colunas: Data,Hora,Tipo,Descrição,Valor,Saldo
 */
export const PICPAY_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'PicPay - Extrato',
  tipo_arquivo: 'csv',
  separador: ',',
  encoding: 'utf-8',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,        // Coluna "Data"
    // Hora na coluna 1 (ignorado)
    tipo: 2,        // Coluna "Tipo"
    descricao: 3,   // Coluna "Descrição"
    valor: 4,       // Coluna "Valor"
    // Saldo na coluna 5 (ignorado)
  }),
  formato_data: 'dd/MM/yyyy',
  separador_decimal: '.',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Template genérico brasileiro
 * Formato padrão: Data;Descrição;Valor
 */
export const GENERIC_BR_TEMPLATE: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> = {
  nome: 'Genérico - Formato Brasileiro',
  tipo_arquivo: 'csv',
  separador: ';',
  encoding: 'utf-8',
  pular_linhas: 1,
  mapeamento_colunas: JSON.stringify({
    data: 0,
    descricao: 1,
    valor: 2,
  }),
  formato_data: 'dd/MM/yyyy',
  separador_decimal: ',',
  contador_uso: 0,
  is_favorite: false,
  usuario_id: 'usuario-producao',
};

/**
 * Array com todos os templates disponíveis
 * Ordenados por popularidade/uso estimado
 */
export const ALL_BANK_TEMPLATES = [
  NUBANK_TEMPLATE,
  INTER_TEMPLATE,
  C6_TEMPLATE,
  PICPAY_TEMPLATE,
  BRADESCO_TEMPLATE,
  ITAU_TEMPLATE,
  SANTANDER_TEMPLATE,
  BB_TEMPLATE,
  CAIXA_TEMPLATE,
  GENERIC_BR_TEMPLATE,
];

/**
 * Helper para buscar template por nome
 */
export function getTemplateByName(nome: string): Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'> | undefined {
  return ALL_BANK_TEMPLATES.find(t =>
    t.nome.toLowerCase().includes(nome.toLowerCase())
  );
}

/**
 * Helper para buscar templates por instituição
 */
export function getTemplatesByInstitution(instituicaoNome: string): Array<Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'>> {
  return ALL_BANK_TEMPLATES.filter(t =>
    t.nome.toLowerCase().includes(instituicaoNome.toLowerCase())
  );
}
