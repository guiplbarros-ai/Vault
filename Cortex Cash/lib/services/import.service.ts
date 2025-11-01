/**
 * Serviço de Importação
 * Agent IMPORT: Owner
 *
 * Gerencia importação de transações de diferentes formatos (CSV, OFX, Excel)
 */

import { getDB } from '../db/client';
import type {
  ParseConfig,
  ParseResult,
  ParsedTransacao,
  ParseError,
  DedupeResult,
  MapeamentoColunas,
  FileFormat,
  TemplateImportacao,
  Transacao,
} from '../types';
import { generateHash } from '../utils/format';
import { transacaoService } from './transacao.service';
import { DatabaseError, ValidationError } from '../errors';

export class ImportService {
  /**
   * Detecta o formato do arquivo baseado no conteúdo
   */
  async detectFormat(fileContent: string): Promise<FileFormat> {
    const lines = fileContent.split('\n').slice(0, 5); // Primeiras 5 linhas
    const firstLine = lines[0]?.trim() || '';

    // Detectar OFX
    if (firstLine.includes('<?OFX') || firstLine.includes('<OFX>')) {
      return {
        tipo: 'ofx',
        confianca: 0.99,
        detectado: {
          encoding: 'utf-8',
        },
      };
    }

    // Detectar CSV
    const separadores = [',', ';', '\t', '|'];
    let melhorSeparador = ',';
    let maxColunas = 0;

    for (const sep of separadores) {
      const colunas = firstLine.split(sep).length;
      if (colunas > maxColunas) {
        maxColunas = colunas;
        melhorSeparador = sep;
      }
    }

    if (maxColunas >= 3) {
      const headers = firstLine.split(melhorSeparador).map(h => h.trim());

      return {
        tipo: 'csv',
        confianca: 0.85,
        detectado: {
          separador: melhorSeparador,
          encoding: 'utf-8',
          headers,
        },
      };
    }

    // Detectar Excel (por extensão, já que conteúdo binário)
    return {
      tipo: 'excel',
      confianca: 0.5,
      detectado: {
        encoding: 'utf-8',
      },
    };
  }

  /**
   * Parse CSV para transações
   */
  async parseCSV(
    fileContent: string,
    mapeamento: MapeamentoColunas,
    config: ParseConfig = {}
  ): Promise<ParseResult> {
    const erros: ParseError[] = [];
    const transacoes: ParsedTransacao[] = [];

    const {
      separador = ',',
      pular_linhas = 1,
      formato_data = 'dd/MM/yyyy',
      separador_decimal = ',',
    } = config;

    try {
      const lines = fileContent.split('\n');
      const linhasProcessar = lines.slice(pular_linhas);

      for (let i = 0; i < linhasProcessar.length; i++) {
        const linha = linhasProcessar[i].trim();
        const numeroLinha = i + pular_linhas + 1;

        if (!linha) continue;

        try {
          const colunas = this.parseCSVLine(linha, separador);

          const dataStr = colunas[mapeamento.data]?.trim();
          const descricao = colunas[mapeamento.descricao]?.trim();
          const valorStr = colunas[mapeamento.valor]?.trim();

          if (!dataStr || !descricao || !valorStr) {
            erros.push({
              linha: numeroLinha,
              mensagem: 'Campos obrigatórios faltando (data, descrição ou valor)',
              valor_original: linha,
            });
            continue;
          }

          // Parse data
          const data = this.parseDate(dataStr, formato_data);
          if (!data || isNaN(data.getTime())) {
            erros.push({
              linha: numeroLinha,
              campo: 'data',
              mensagem: `Data inválida: ${dataStr}`,
              valor_original: dataStr,
            });
            continue;
          }

          // Parse valor
          const valor = this.parseValor(valorStr, separador_decimal);
          if (isNaN(valor)) {
            erros.push({
              linha: numeroLinha,
              campo: 'valor',
              mensagem: `Valor inválido: ${valorStr}`,
              valor_original: valorStr,
            });
            continue;
          }

          // Determinar tipo baseado no valor
          const tipo = valor >= 0 ? 'receita' : 'despesa';

          // Observações (se mapeado)
          const observacoes = mapeamento.observacoes !== undefined
            ? colunas[mapeamento.observacoes]?.trim()
            : undefined;

          const transacao: ParsedTransacao = {
            data,
            descricao,
            valor: Math.abs(valor),
            tipo,
            observacoes,
            linha_original: numeroLinha,
          };

          transacoes.push(transacao);
        } catch (error) {
          erros.push({
            linha: numeroLinha,
            mensagem: error instanceof Error ? error.message : 'Erro desconhecido ao processar linha',
            valor_original: linha,
          });
        }
      }

      const linhasValidas = transacoes.length;
      const linhasInvalidas = erros.length;

      return {
        success: linhasInvalidas === 0,
        transacoes,
        erros,
        resumo: {
          total_linhas: linhasProcessar.length,
          linhas_validas: linhasValidas,
          linhas_invalidas: linhasInvalidas,
          duplicatas: 0,
        },
      };
    } catch (error) {
      throw new ValidationError(
        `Erro ao fazer parse do CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Parse OFX para transações
   */
  async parseOFX(fileContent: string): Promise<ParseResult> {
    const erros: ParseError[] = [];
    const transacoes: ParsedTransacao[] = [];

    try {
      // Extrair transações do OFX usando regex
      const transactionPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
      const matches = [...fileContent.matchAll(transactionPattern)];

      for (let i = 0; i < matches.length; i++) {
        const txnBlock = matches[i][1];
        const numeroLinha = i + 1;

        try {
          // Extrair campos
          const tipo = this.extractOFXTag(txnBlock, 'TRNTYPE');
          const data = this.extractOFXTag(txnBlock, 'DTPOSTED');
          const valor = this.extractOFXTag(txnBlock, 'TRNAMT');
          const descricao = this.extractOFXTag(txnBlock, 'MEMO') || this.extractOFXTag(txnBlock, 'NAME');

          if (!data || !valor || !descricao) {
            erros.push({
              linha: numeroLinha,
              mensagem: 'Campos obrigatórios faltando em transação OFX',
              valor_original: txnBlock.substring(0, 100),
            });
            continue;
          }

          // Parse data OFX (formato: YYYYMMDD ou YYYYMMDDHHMMSS)
          const dataParsed = this.parseOFXDate(data);
          if (!dataParsed || isNaN(dataParsed.getTime())) {
            erros.push({
              linha: numeroLinha,
              campo: 'data',
              mensagem: `Data OFX inválida: ${data}`,
              valor_original: data,
            });
            continue;
          }

          // Parse valor
          const valorNum = parseFloat(valor);
          if (isNaN(valorNum)) {
            erros.push({
              linha: numeroLinha,
              campo: 'valor',
              mensagem: `Valor inválido: ${valor}`,
              valor_original: valor,
            });
            continue;
          }

          // Determinar tipo
          const tipoTransacao = valorNum >= 0 ? 'receita' : 'despesa';

          const transacao: ParsedTransacao = {
            data: dataParsed,
            descricao: descricao.trim(),
            valor: Math.abs(valorNum),
            tipo: tipoTransacao,
            observacoes: tipo ? `Tipo OFX: ${tipo}` : undefined,
            linha_original: numeroLinha,
          };

          transacoes.push(transacao);
        } catch (error) {
          erros.push({
            linha: numeroLinha,
            mensagem: error instanceof Error ? error.message : 'Erro ao processar transação OFX',
            valor_original: txnBlock.substring(0, 100),
          });
        }
      }

      const linhasValidas = transacoes.length;
      const linhasInvalidas = erros.length;

      return {
        success: linhasInvalidas === 0,
        transacoes,
        erros,
        resumo: {
          total_linhas: matches.length,
          linhas_validas: linhasValidas,
          linhas_invalidas: linhasInvalidas,
          duplicatas: 0,
        },
      };
    } catch (error) {
      throw new ValidationError(
        `Erro ao fazer parse do OFX: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Deduplica transações baseado em hash
   */
  async deduplicateTransactions(
    contaId: string,
    transacoesParsed: ParsedTransacao[]
  ): Promise<DedupeResult> {
    const db = getDB();

    // Buscar transações existentes da conta
    const existentes = await db.transacoes
      .where('conta_id')
      .equals(contaId)
      .toArray();

    const hashesExistentes = new Set(
      existentes
        .filter((t) => t.hash)
        .map((t) => t.hash!)
    );

    const novas: ParsedTransacao[] = [];
    const duplicadas: ParsedTransacao[] = [];

    for (const transacao of transacoesParsed) {
      // Gerar hash
      const hashInput = `${contaId}-${transacao.data.toISOString()}-${transacao.descricao}-${transacao.valor}`;
      const hash = await generateHash(hashInput);
      transacao.hash = hash;

      // Verificar se já existe
      if (hashesExistentes.has(hash)) {
        duplicadas.push(transacao);
      } else {
        novas.push(transacao);
      }
    }

    return {
      total: transacoesParsed.length,
      duplicatas: duplicadas.length,
      novas: novas.length,
      transacoes_unicas: novas,
      transacoes_duplicadas: duplicadas,
    };
  }

  /**
   * Importa transações para o banco de dados
   */
  async importTransactions(
    contaId: string,
    transacoes: ParsedTransacao[]
  ): Promise<{ importadas: number; erros: ParseError[] }> {
    const erros: ParseError[] = [];
    let importadas = 0;

    try {
      for (const transacao of transacoes) {
        try {
          await transacaoService.createTransacao({
            conta_id: contaId,
            data: transacao.data,
            descricao: transacao.descricao,
            valor: transacao.tipo === 'despesa' ? -transacao.valor : transacao.valor,
            tipo: transacao.tipo || 'despesa', // Default to 'despesa' if undefined
            observacoes: transacao.observacoes,
          });
          importadas++;
        } catch (error) {
          erros.push({
            linha: transacao.linha_original,
            mensagem: error instanceof Error ? error.message : 'Erro ao importar transação',
            valor_original: transacao.descricao,
          });
        }
      }

      return { importadas, erros };
    } catch (error) {
      throw new DatabaseError(
        `Erro ao importar transações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error as Error
      );
    }
  }

  /**
   * Salva template de importação
   */
  async saveTemplate(template: Omit<TemplateImportacao, 'id' | 'created_at' | 'updated_at'>): Promise<TemplateImportacao> {
    const db = getDB();
    const now = new Date();

    const id = crypto.randomUUID();
    const novoTemplate: TemplateImportacao = {
      id,
      ...template,
      created_at: now,
      updated_at: now,
    };

    await db.templates_importacao.add(novoTemplate);
    return novoTemplate;
  }

  /**
   * Lista templates de importação
   * Ordenados por contador de uso (mais usados primeiro)
   */
  async listTemplates(instituicaoId?: string): Promise<TemplateImportacao[]> {
    const db = getDB();

    if (instituicaoId) {
      const templates = await db.templates_importacao
        .where('instituicao_id')
        .equals(instituicaoId)
        .toArray();

      // Ordenar por contador de uso (decrescente)
      return templates.sort((a, b) => b.contador_uso - a.contador_uso);
    }

    const allTemplates = await db.templates_importacao.toArray();
    // Ordenar por contador de uso (decrescente)
    return allTemplates.sort((a, b) => b.contador_uso - a.contador_uso);
  }

  /**
   * Busca template por ID
   */
  async getTemplateById(templateId: string): Promise<TemplateImportacao | undefined> {
    const db = getDB();
    return db.templates_importacao.get(templateId);
  }

  /**
   * Busca templates por nome (busca parcial)
   */
  async searchTemplates(query: string): Promise<TemplateImportacao[]> {
    const db = getDB();
    const allTemplates = await db.templates_importacao.toArray();

    const lowerQuery = query.toLowerCase();
    return allTemplates
      .filter(t => t.nome.toLowerCase().includes(lowerQuery))
      .sort((a, b) => b.contador_uso - a.contador_uso);
  }

  /**
   * Busca templates populares (top 5 mais usados)
   */
  async getPopularTemplates(limit = 5): Promise<TemplateImportacao[]> {
    const db = getDB();
    const allTemplates = await db.templates_importacao.toArray();

    return allTemplates
      .sort((a, b) => b.contador_uso - a.contador_uso)
      .slice(0, limit);
  }

  /**
   * Atualiza contador de uso de template
   */
  async incrementTemplateUsage(templateId: string): Promise<void> {
    const db = getDB();
    const template = await db.templates_importacao.get(templateId);

    if (template) {
      await db.templates_importacao.update(templateId, {
        contador_uso: template.contador_uso + 1,
        ultima_utilizacao: new Date(),
        updated_at: new Date(),
      });
    }
  }

  // ============================================================================
  // Métodos Auxiliares Privados
  // ============================================================================

  /**
   * Parse de linha CSV respeitando aspas
   */
  private parseCSVLine(line: string, separator: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map(s => s.trim().replace(/^"|"$/g, ''));
  }

  /**
   * Parse de data com múltiplos formatos
   */
  private parseDate(dateStr: string, formato: string): Date | null {
    try {
      // Formatos comuns brasileiros
      const formats = [
        /^(\d{2})\/(\d{2})\/(\d{4})$/, // dd/MM/yyyy
        /^(\d{4})-(\d{2})-(\d{2})$/,   // yyyy-MM-dd
        /^(\d{2})-(\d{2})-(\d{4})$/,   // dd-MM-yyyy
      ];

      for (const regex of formats) {
        const match = dateStr.match(regex);
        if (match) {
          if (formato === 'dd/MM/yyyy' || formato === 'dd-MM-yyyy') {
            const [, day, month, year] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            const [, year, month, day] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
        }
      }

      // Fallback: tentar parse direto
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Parse de valor com diferentes separadores decimais
   */
  private parseValor(valorStr: string, separadorDecimal: string): number {
    // Remove espaços, símbolos de moeda e pontos/vírgulas de milhar
    let cleanStr = valorStr
      .replace(/\s/g, '')
      .replace(/[R$]/g, '')
      .replace(/[()]/g, ''); // Remove parênteses (valores negativos)

    // Detectar se o valor original tinha parênteses (indica negativo)
    const isNegative = valorStr.includes('(') && valorStr.includes(')');

    // Substituir separador decimal por ponto
    if (separadorDecimal === ',') {
      // Remove pontos de milhar e substitui vírgula decimal por ponto
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      // Remove vírgulas de milhar
      cleanStr = cleanStr.replace(/,/g, '');
    }

    const valor = parseFloat(cleanStr);
    return isNegative ? -Math.abs(valor) : valor;
  }

  /**
   * Extrai tag de bloco OFX
   */
  private extractOFXTag(block: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<]+)`, 'i');
    const match = block.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Parse de data OFX (formato YYYYMMDD ou YYYYMMDDHHMMSS)
   */
  private parseOFXDate(dateStr: string): Date | null {
    try {
      // Remover timezone se presente
      const cleanDate = dateStr.split('[')[0];

      // Extrair componentes
      const year = parseInt(cleanDate.substring(0, 4));
      const month = parseInt(cleanDate.substring(4, 6));
      const day = parseInt(cleanDate.substring(6, 8));

      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
}

// Singleton instance
export const importService = new ImportService();
