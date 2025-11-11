/**
 * Testes Unitários - ImportService
 * Agent IMPORT: Owner
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ImportService } from './import.service';
import { getDB } from '../db/client';
import { generateTransactionHash } from '../import/dedupe';
import type { MapeamentoColunas, ParseConfig, TemplateImportacao } from '../types';

describe('ImportService', () => {
  let service: ImportService;
  let contaId: string;

  beforeEach(async () => {
    service = new ImportService();

    // Limpar database antes de cada teste
    const db = getDB();
    await db.transacoes.clear();
    await db.contas.clear();
    await db.instituicoes.clear();
    await db.templates_importacao.clear();

    // Criar instituição e conta de teste
    const instituicaoId = crypto.randomUUID();
    await db.instituicoes.add({
      id: instituicaoId,
      nome: 'Banco Teste',
      created_at: new Date(),
      updated_at: new Date(),
    });

    contaId = crypto.randomUUID();
    await db.contas.add({
      id: contaId,
      instituicao_id: instituicaoId,
      nome: 'Conta Teste',
      tipo: 'corrente',
      saldo_referencia: 1000,
      data_referencia: new Date(),
      saldo_atual: 1000,
      ativa: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  describe('detectFormat', () => {
    it('deve detectar formato CSV com vírgula', async () => {
      const content = 'Data,Descrição,Valor\n01/01/2024,Compra,100.00';
      const formato = await service.detectFormat(content);

      expect(formato.tipo).toBe('csv');
      expect(formato.detectado.separador).toBe(',');
      expect(formato.confianca).toBeGreaterThan(0.8);
    });

    it('deve detectar formato CSV com ponto-e-vírgula', async () => {
      const content = 'Data;Descrição;Valor\n01/01/2024;Compra;100,00';
      const formato = await service.detectFormat(content);

      expect(formato.tipo).toBe('csv');
      expect(formato.detectado.separador).toBe(';');
      expect(formato.confianca).toBeGreaterThan(0.8);
    });

    it('deve detectar formato OFX', async () => {
      const content = '<?OFX VERSION="1.0"?>\n<OFX>...</OFX>';
      const formato = await service.detectFormat(content);

      expect(formato.tipo).toBe('ofx');
      expect(formato.confianca).toBeGreaterThan(0.9);
    });

    it('deve detectar formato CSV com tab', async () => {
      const content = 'Data\tDescrição\tValor\n01/01/2024\tCompra\t100.00';
      const formato = await service.detectFormat(content);

      expect(formato.tipo).toBe('csv');
      expect(formato.detectado.separador).toBe('\t');
    });
  });

  describe('parseCSV', () => {
    it('deve fazer parse de CSV simples', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,Salário,5000.00
02/01/2024,Mercado,-150.50
03/01/2024,Netflix,-49.90`;

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      };

      const config: ParseConfig = {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      };

      const result = await service.parseCSV(content, mapeamento, config);

      expect(result.success).toBe(true);
      expect(result.transacoes).toHaveLength(3);
      expect(result.erros).toHaveLength(0);

      // Verificar primeira transação
      expect(result.transacoes[0].descricao).toBe('Salário');
      expect(result.transacoes[0].valor).toBe(5000);
      expect(result.transacoes[0].tipo).toBe('receita');
      expect(result.transacoes[0].data.getDate()).toBe(1);
      expect(result.transacoes[0].data.getMonth()).toBe(0); // Janeiro = 0
    });

    it('deve detectar receitas e despesas baseado no valor', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,Receita,100.00
02/01/2024,Despesa,-50.00`;

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      };

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      });

      expect(result.transacoes[0].tipo).toBe('receita');
      expect(result.transacoes[0].valor).toBe(100);

      expect(result.transacoes[1].tipo).toBe('despesa');
      expect(result.transacoes[1].valor).toBe(50); // valor absoluto
    });

    it('deve tratar separador decimal vírgula', async () => {
      const content = `Data;Descrição;Valor
01/01/2024;Compra;1.250,75`;

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      };

      const result = await service.parseCSV(content, mapeamento, {
        separador: ';',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: ',',
      });

      expect(result.transacoes[0].valor).toBe(1250.75);
    });

    it('deve registrar erros de linhas inválidas', async () => {
      const content = `Data,Descrição,Valor
data_invalida,Compra,100
02/01/2024,Compra,valor_invalido
03/01/2024,Compra válida,50.00`;

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      };

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      });

      expect(result.success).toBe(false);
      expect(result.erros.length).toBeGreaterThan(0);
      expect(result.transacoes).toHaveLength(1); // Apenas a linha válida
      expect(result.transacoes[0].descricao).toBe('Compra válida');
    });

    it('deve ignorar linhas vazias', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,Compra,100

02/01/2024,Compra2,200

`;

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      };

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
      });

      expect(result.transacoes).toHaveLength(2);
    });

    it('deve fazer parse de campos entre aspas', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,"Compra com vírgula, teste",100.00
02/01/2024,"Compra ""especial""",200.00`;

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      };

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      });

      expect(result.transacoes).toHaveLength(2);
      expect(result.transacoes[0].descricao).toContain('vírgula');
    });

    it('deve mapear campo de observações quando fornecido', async () => {
      const content = `Data,Descrição,Valor,Obs
01/01/2024,Compra,100.00,Nota fiscal 123`;

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
        observacoes: 3,
      };

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      });

      expect(result.transacoes[0].observacoes).toBe('Nota fiscal 123');
    });
  });

  describe('parseOFX', () => {
    it('deve fazer parse de arquivo OFX básico', async () => {
      const content = `<?OFX VERSION="1.0"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20240101</DTPOSTED>
            <TRNAMT>-150.50</TRNAMT>
            <MEMO>Mercado</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20240102</DTPOSTED>
            <TRNAMT>5000.00</TRNAMT>
            <NAME>Salário</NAME>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

      const result = await service.parseOFX(content);

      expect(result.success).toBe(true);
      expect(result.transacoes).toHaveLength(2);

      // Verificar transação de débito
      expect(result.transacoes[0].tipo).toBe('despesa');
      expect(result.transacoes[0].valor).toBe(150.5);
      expect(result.transacoes[0].descricao).toBe('Mercado');

      // Verificar transação de crédito
      expect(result.transacoes[1].tipo).toBe('receita');
      expect(result.transacoes[1].valor).toBe(5000);
      expect(result.transacoes[1].descricao).toBe('Salário');
    });

    it('deve fazer parse de data OFX completa (YYYYMMDDHHMMSS)', async () => {
      const content = `<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20240101120000</DTPOSTED>
<TRNAMT>-100.00</TRNAMT>
<MEMO>Teste</MEMO>
</STMTTRN>`;

      const result = await service.parseOFX(content);

      expect(result.transacoes).toHaveLength(1);
      expect(result.transacoes[0].data.getFullYear()).toBe(2024);
      expect(result.transacoes[0].data.getMonth()).toBe(0);
      expect(result.transacoes[0].data.getDate()).toBe(1);
    });
  });

  describe('deduplicateTransactions', () => {
    it('deve detectar duplicatas baseado em hash', async () => {
      // Inserir transação existente
      const db = getDB();
      const dataExistente = new Date('2024-01-01');

      const hash = await generateTransactionHash(
        { data: dataExistente, descricao: 'Compra Mercado', valor: 150.5 },
        contaId
      );

      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: dataExistente,
        descricao: 'Compra Mercado',
        valor: -150.5,
        tipo: 'despesa',
        hash,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Tentar importar duplicata
      const transacoesParsed = [
        {
          data: new Date('2024-01-01'),
          descricao: 'Compra Mercado',
          valor: 150.5,
          tipo: 'despesa' as const,
          linha_original: 1,
        },
        {
          data: new Date('2024-01-02'),
          descricao: 'Compra Nova',
          valor: 200,
          tipo: 'despesa' as const,
          linha_original: 2,
        },
      ];

      const result = await service.deduplicateTransactions(
        contaId,
        transacoesParsed
      );

      expect(result.total).toBe(2);
      expect(result.duplicatas).toBe(1);
      expect(result.novas).toBe(1);
      expect(result.transacoes_unicas).toHaveLength(1);
      expect(result.transacoes_duplicadas).toHaveLength(1);
      expect(result.transacoes_unicas[0].descricao).toBe('Compra Nova');
    });

    it('deve permitir transações idênticas em contas diferentes', async () => {
      // Criar segunda conta
      const db = getDB();
      const conta2Id = crypto.randomUUID();
      await db.contas.add({
        id: conta2Id,
        instituicao_id: (await db.contas.get(contaId))!.instituicao_id,
        nome: 'Conta Teste 2',
        tipo: 'poupanca',
        saldo_inicial: 500,
        saldo_atual: 500,
        ativa: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const dataTransacao = new Date('2024-01-01');

      // Inserir transação na conta 1
      await db.transacoes.add({
        id: crypto.randomUUID(),
        conta_id: contaId,
        data: dataTransacao,
        descricao: 'Compra',
        valor: -100,
        tipo: 'despesa',
        hash: 'hash-conta-1',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Tentar importar mesma transação na conta 2
      const transacoesParsed = [
        {
          data: dataTransacao,
          descricao: 'Compra',
          valor: 100,
          tipo: 'despesa' as const,
          linha_original: 1,
        },
      ];

      const result = await service.deduplicateTransactions(
        conta2Id,
        transacoesParsed
      );

      // Não deve considerar duplicata porque é conta diferente
      expect(result.duplicatas).toBe(0);
      expect(result.novas).toBe(1);
    });
  });

  describe('importTransactions', () => {
    it('deve importar transações com sucesso', async () => {
      const transacoes = [
        {
          data: new Date('2024-01-01'),
          descricao: 'Salário',
          valor: 5000,
          tipo: 'receita' as const,
          linha_original: 1,
        },
        {
          data: new Date('2024-01-02'),
          descricao: 'Mercado',
          valor: 150,
          tipo: 'despesa' as const,
          linha_original: 2,
        },
      ];

      const result = await service.importTransactions(contaId, transacoes);

      expect(result.importadas).toBeGreaterThanOrEqual(1);
      expect(result.erros.length).toBeLessThanOrEqual(1);

      // Verificar se foram criadas no banco
      const db = getDB();
      const transacoesDB = await db.transacoes
        .where('conta_id')
        .equals(contaId)
        .toArray();

      expect(transacoesDB.length).toBeGreaterThanOrEqual(1);
    });

    it('deve registrar erros de transações que falharam', async () => {
      const transacoes = [
        {
          data: new Date('2024-01-01'),
          descricao: 'Válida',
          valor: 100,
          tipo: 'despesa' as const,
          linha_original: 1,
        },
        {
          data: new Date('invalid'),
          descricao: 'Inválida',
          valor: 200,
          tipo: 'despesa' as const,
          linha_original: 2,
        },
      ];

      const result = await service.importTransactions(contaId, transacoes);

      // A transação com data inválida vai falhar
      expect(result.importadas + result.erros.length).toBe(2);
      // Pode ter erros na transação inválida
    });
  });

  describe('Template Management', () => {
    it('deve salvar template de importação', async () => {
      const template = {
        nome: 'Nubank Teste',
        tipo_arquivo: 'csv' as const,
        separador: ',',
        encoding: 'utf-8',
        pular_linhas: 1,
        mapeamento_colunas: JSON.stringify({
          data: 0,
          descricao: 1,
          valor: 2,
        }),
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
        contador_uso: 0,
      };

      const saved = await service.saveTemplate(template);

      expect(saved.id).toBeDefined();
      expect(saved.nome).toBe('Nubank Teste');
      expect(saved.created_at).toBeInstanceOf(Date);
    });

    it('deve listar templates', async () => {
      // Criar templates
      await service.saveTemplate({
        nome: 'Template 1',
        tipo_arquivo: 'csv',
        separador: ',',
        encoding: 'utf-8',
        pular_linhas: 1,
        mapeamento_colunas: '{}',
        contador_uso: 5,
      });

      await service.saveTemplate({
        nome: 'Template 2',
        tipo_arquivo: 'csv',
        separador: ';',
        encoding: 'utf-8',
        pular_linhas: 1,
        mapeamento_colunas: '{}',
        contador_uso: 10,
      });

      const templates = await service.listTemplates();

      expect(templates).toHaveLength(2);
      // Deve estar ordenado por contador_uso (decrescente)
      expect(templates[0].contador_uso).toBeGreaterThan(
        templates[1].contador_uso
      );
    });

    it('deve buscar template por ID', async () => {
      const saved = await service.saveTemplate({
        nome: 'Template Busca',
        tipo_arquivo: 'csv',
        separador: ',',
        encoding: 'utf-8',
        pular_linhas: 1,
        mapeamento_colunas: '{}',
        contador_uso: 0,
      });

      const found = await service.getTemplateById(saved.id);

      expect(found).toBeDefined();
      expect(found?.nome).toBe('Template Busca');
    });

    it('deve buscar templates por nome', async () => {
      await service.saveTemplate({
        nome: 'Nubank - Extrato',
        tipo_arquivo: 'csv',
        separador: ',',
        encoding: 'utf-8',
        pular_linhas: 1,
        mapeamento_colunas: '{}',
        contador_uso: 0,
      });

      await service.saveTemplate({
        nome: 'Inter - Extrato',
        tipo_arquivo: 'csv',
        separador: ';',
        encoding: 'utf-8',
        pular_linhas: 1,
        mapeamento_colunas: '{}',
        contador_uso: 0,
      });

      const results = await service.searchTemplates('nubank');

      expect(results).toHaveLength(1);
      expect(results[0].nome).toContain('Nubank');
    });

    it('deve retornar templates populares', async () => {
      // Criar 10 templates com diferentes contadores
      for (let i = 0; i < 10; i++) {
        await service.saveTemplate({
          nome: `Template ${i}`,
          tipo_arquivo: 'csv',
          separador: ',',
          encoding: 'utf-8',
          pular_linhas: 1,
          mapeamento_colunas: '{}',
          contador_uso: i * 10,
        });
      }

      const popular = await service.getPopularTemplates(5);

      expect(popular).toHaveLength(5);
      // Deve estar ordenado por uso (decrescente)
      expect(popular[0].contador_uso).toBeGreaterThan(
        popular[4].contador_uso
      );
    });

    it('deve incrementar contador de uso', async () => {
      const saved = await service.saveTemplate({
        nome: 'Template Contador',
        tipo_arquivo: 'csv',
        separador: ',',
        encoding: 'utf-8',
        pular_linhas: 1,
        mapeamento_colunas: '{}',
        contador_uso: 0,
      });

      await service.incrementTemplateUsage(saved.id);
      await service.incrementTemplateUsage(saved.id);

      const updated = await service.getTemplateById(saved.id);

      expect(updated?.contador_uso).toBe(2);
      expect(updated?.ultima_utilizacao).toBeDefined();
      expect(typeof updated?.ultima_utilizacao === 'object' || typeof updated?.ultima_utilizacao === 'string').toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('deve tratar CSV vazio', async () => {
      const content = 'Data,Descrição,Valor\n';

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      };

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
      });

      expect(result.transacoes).toHaveLength(0);
      expect(result.erros).toHaveLength(0);
    });

    it('deve tratar valores com parênteses (negativos)', async () => {
      const content = `Data,Descrição,Valor
01/01/2024,Compra,(150.00)`;

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      };

      const result = await service.parseCSV(content, mapeamento, {
        separador: ',',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: '.',
      });

      expect(result.transacoes[0].valor).toBe(150);
      expect(result.transacoes[0].tipo).toBe('despesa');
    });

    it('deve tratar valores com símbolo de moeda', async () => {
      const content = `Data;Descrição;Valor
01/01/2024;Compra;R$ 150,50`;

      const mapeamento: MapeamentoColunas = {
        data: 0,
        descricao: 1,
        valor: 2,
      };

      const result = await service.parseCSV(content, mapeamento, {
        separador: ';',
        pular_linhas: 1,
        formato_data: 'dd/MM/yyyy',
        separador_decimal: ',',
      });

      expect(result.transacoes[0].valor).toBe(150.5);
    });

    it('deve tratar múltiplos formatos de data', async () => {
      const formats = [
        { date: '01/01/2024', format: 'dd/MM/yyyy' },
        { date: '2024-01-01', format: 'yyyy-MM-dd' },
        { date: '01-01-2024', format: 'dd-MM-yyyy' },
      ];

      for (const { date, format } of formats) {
        const content = `Data,Descrição,Valor\n${date},Teste,100`;

        const mapeamento: MapeamentoColunas = {
          data: 0,
          descricao: 1,
          valor: 2,
        };

        const result = await service.parseCSV(content, mapeamento, {
          separador: ',',
          pular_linhas: 1,
          formato_data: format,
          separador_decimal: '.',
        });

        expect(result.transacoes).toHaveLength(1);
        expect(result.transacoes[0].data.getDate()).toBe(1);
        expect(result.transacoes[0].data.getMonth()).toBe(0);
        expect(result.transacoes[0].data.getFullYear()).toBe(2024);
      }
    });
  });
});
