/**
 * Testes Unitários - InstituicaoService
 * Agent CORE: Implementador
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InstituicaoService } from './instituicao.service';
import { getDB } from '../db/client';
import { NotFoundError, ValidationError } from '../errors';
import type { CreateInstituicaoDTO } from '../types';

describe('InstituicaoService', () => {
  let service: InstituicaoService;

  beforeEach(async () => {
    service = new InstituicaoService();

    // Limpar database antes de cada teste
    const db = getDB();
    await db.instituicoes.clear();
    await db.contas.clear();
  });

  describe('createInstituicao', () => {
    it('deve criar uma nova instituição com sucesso', async () => {
      const novaInstituicao: CreateInstituicaoDTO = {
        nome: 'Banco do Brasil',
        codigo: '001',
        logo_url: 'https://example.com/bb.png',
        cor: '#FFDD00',
      };

      const result = await service.createInstituicao(novaInstituicao);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Banco do Brasil');
      expect(result.codigo).toBe('001');
      expect(result.logo_url).toBe('https://example.com/bb.png');
      expect(result.cor).toBe('#FFDD00');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('deve criar instituição sem campos opcionais', async () => {
      const novaInstituicao: CreateInstituicaoDTO = {
        nome: 'Nubank',
      };

      const result = await service.createInstituicao(novaInstituicao);

      expect(result.nome).toBe('Nubank');
      expect(result.codigo).toBeUndefined();
      expect(result.logo_url).toBeUndefined();
      expect(result.cor).toBeUndefined();
    });

    it('deve validar nome obrigatório', async () => {
      const instituicaoInvalida = {
        codigo: '001',
      } as CreateInstituicaoDTO;

      await expect(
        service.createInstituicao(instituicaoInvalida)
      ).rejects.toThrow(ValidationError);
    });

    it('deve validar tamanho máximo do nome', async () => {
      const instituicaoInvalida: CreateInstituicaoDTO = {
        nome: 'A'.repeat(101), // 101 caracteres (máximo é 100)
      };

      await expect(
        service.createInstituicao(instituicaoInvalida)
      ).rejects.toThrow(ValidationError);
    });

    it('deve validar formato de cor hexadecimal', async () => {
      const instituicaoInvalida: CreateInstituicaoDTO = {
        nome: 'Banco Teste',
        cor: 'azul', // Formato inválido
      };

      await expect(
        service.createInstituicao(instituicaoInvalida)
      ).rejects.toThrow(ValidationError);
    });

    it('deve validar URL de logo', async () => {
      const instituicaoInvalida: CreateInstituicaoDTO = {
        nome: 'Banco Teste',
        logo_url: 'not-a-url',
      };

      await expect(
        service.createInstituicao(instituicaoInvalida)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('listInstituicoes', () => {
    beforeEach(async () => {
      await service.createInstituicao({ nome: 'Banco do Brasil', codigo: '001' });
      await service.createInstituicao({ nome: 'Itaú', codigo: '341' });
      await service.createInstituicao({ nome: 'Bradesco', codigo: '237' });
    });

    it('deve listar todas as instituições', async () => {
      const result = await service.listInstituicoes();

      expect(result).toHaveLength(3);
    });

    it('deve ordenar por nome por padrão', async () => {
      const result = await service.listInstituicoes();

      expect(result[0].nome).toBe('Banco do Brasil');
      expect(result[1].nome).toBe('Bradesco');
      expect(result[2].nome).toBe('Itaú');
    });

    it('deve ordenar por código ascendente', async () => {
      const result = await service.listInstituicoes({ sortBy: 'codigo', sortOrder: 'asc' });

      expect(result[0].codigo).toBe('001');
      expect(result[1].codigo).toBe('237');
      expect(result[2].codigo).toBe('341');
    });

    it('deve ordenar por nome descendente', async () => {
      const result = await service.listInstituicoes({ sortBy: 'nome', sortOrder: 'desc' });

      expect(result[0].nome).toBe('Itaú');
      expect(result[1].nome).toBe('Bradesco');
      expect(result[2].nome).toBe('Banco do Brasil');
    });

    it('deve aplicar paginação', async () => {
      const result = await service.listInstituicoes({ limit: 2 });

      expect(result).toHaveLength(2);
    });

    it('deve aplicar offset', async () => {
      const all = await service.listInstituicoes();
      const withOffset = await service.listInstituicoes({ offset: 1 });

      expect(withOffset).toHaveLength(all.length - 1);
      expect(withOffset[0].nome).toBe(all[1].nome);
    });

    it('deve combinar paginação e ordenação', async () => {
      const result = await service.listInstituicoes({
        sortBy: 'nome',
        sortOrder: 'desc',
        limit: 2,
      });

      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('Itaú');
      expect(result[1].nome).toBe('Bradesco');
    });
  });

  describe('getInstituicaoById', () => {
    it('deve retornar instituição existente', async () => {
      const created = await service.createInstituicao({ nome: 'Nubank' });

      const result = await service.getInstituicaoById(created.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.nome).toBe('Nubank');
    });

    it('deve retornar null para instituição inexistente', async () => {
      const result = await service.getInstituicaoById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('getInstituicaoByCodigo', () => {
    it('deve retornar instituição por código', async () => {
      await service.createInstituicao({ nome: 'Banco do Brasil', codigo: '001' });

      const result = await service.getInstituicaoByCodigo('001');

      expect(result).toBeDefined();
      expect(result?.codigo).toBe('001');
      expect(result?.nome).toBe('Banco do Brasil');
    });

    it('deve retornar null para código inexistente', async () => {
      const result = await service.getInstituicaoByCodigo('999');

      expect(result).toBeNull();
    });
  });

  describe('updateInstituicao', () => {
    it('deve atualizar instituição existente', async () => {
      const created = await service.createInstituicao({ nome: 'Banco Original' });

      const result = await service.updateInstituicao(created.id, {
        nome: 'Banco Atualizado',
        codigo: '212',
      });

      expect(result.nome).toBe('Banco Atualizado');
      expect(result.codigo).toBe('212');
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      const created = await service.createInstituicao({
        nome: 'Nubank',
        codigo: '260',
        cor: '#8A05BE',
      });

      const result = await service.updateInstituicao(created.id, {
        nome: 'Nubank - Novo Nome',
      });

      expect(result.nome).toBe('Nubank - Novo Nome');
      expect(result.codigo).toBe('260'); // Não mudou
      expect(result.cor).toBe('#8A05BE'); // Não mudou
    });

    it('deve lançar NotFoundError para instituição inexistente', async () => {
      await expect(
        service.updateInstituicao('id-inexistente', { nome: 'Novo Nome' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteInstituicao', () => {
    it('deve deletar instituição permanentemente', async () => {
      const instituicao = await service.createInstituicao({ nome: 'Banco Para Deletar' });

      await service.deleteInstituicao(instituicao.id);

      const result = await service.getInstituicaoById(instituicao.id);
      expect(result).toBeNull();
    });

    it('deve lançar NotFoundError para instituição inexistente', async () => {
      await expect(
        service.deleteInstituicao('id-inexistente')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('searchInstituicoes', () => {
    beforeEach(async () => {
      await service.createInstituicao({ nome: 'Banco do Brasil', codigo: '001' });
      await service.createInstituicao({ nome: 'Bradesco', codigo: '237' });
      await service.createInstituicao({ nome: 'Itaú Unibanco', codigo: '341' });
      await service.createInstituicao({ nome: 'Nubank', codigo: '260' });
    });

    it('deve buscar por nome parcial', async () => {
      const result = await service.searchInstituicoes('banco');

      expect(result).toHaveLength(2);
      expect(result.some(i => i.nome === 'Banco do Brasil')).toBe(true);
      expect(result.some(i => i.nome === 'Itaú Unibanco')).toBe(true);
    });

    it('deve buscar por código', async () => {
      const result = await service.searchInstituicoes('001');

      expect(result).toHaveLength(1);
      expect(result[0].codigo).toBe('001');
    });

    it('deve ser case-insensitive', async () => {
      const result = await service.searchInstituicoes('NUBANK');

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Nubank');
    });

    it('deve retornar array vazio quando não encontrar', async () => {
      const result = await service.searchInstituicoes('xyz');

      expect(result).toHaveLength(0);
    });

    it('deve ordenar por nome', async () => {
      const result = await service.searchInstituicoes('a');

      // Deve encontrar "Banco do Brasil", "Bradesco", "Itaú Unibanco"
      expect(result.length).toBeGreaterThan(0);

      // Verificar se está ordenado por nome
      for (let i = 1; i < result.length; i++) {
        expect(
          result[i].nome.localeCompare(result[i - 1].nome)
        ).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getInstituicaoComContas', () => {
    it('deve retornar instituição com suas contas', async () => {
      const db = getDB();

      const instituicao = await service.createInstituicao({ nome: 'Nubank' });

      // Criar contas manualmente
      await db.contas.add({
        id: 'conta-1',
        instituicao_id: instituicao.id,
        nome: 'Conta Corrente',
        tipo: 'corrente',
        saldo_inicial: 1000,
      saldo_atual: 1000,
        ativa: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.contas.add({
        id: 'conta-2',
        instituicao_id: instituicao.id,
        nome: 'Conta Poupança',
        tipo: 'poupanca',
        saldo_inicial: 500,
      saldo_atual: 500,
        ativa: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.getInstituicaoComContas(instituicao.id);

      expect(result.instituicao.id).toBe(instituicao.id);
      expect(result.contas).toHaveLength(2);
      expect(result.contas[0].instituicao_id).toBe(instituicao.id);
      expect(result.contas[1].instituicao_id).toBe(instituicao.id);
    });

    it('deve retornar instituição com array vazio quando não tem contas', async () => {
      const instituicao = await service.createInstituicao({ nome: 'Banco Sem Contas' });

      const result = await service.getInstituicaoComContas(instituicao.id);

      expect(result.instituicao.id).toBe(instituicao.id);
      expect(result.contas).toHaveLength(0);
    });

    it('deve lançar NotFoundError para instituição inexistente', async () => {
      await expect(
        service.getInstituicaoComContas('id-inexistente')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('countContas', () => {
    it('deve contar contas de uma instituição', async () => {
      const db = getDB();
      const instituicao = await service.createInstituicao({ nome: 'Nubank' });

      await db.contas.add({
        id: 'conta-1',
        instituicao_id: instituicao.id,
        nome: 'Conta 1',
        tipo: 'corrente',
        saldo_inicial: 0,
      saldo_atual: 0,
        ativa: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.contas.add({
        id: 'conta-2',
        instituicao_id: instituicao.id,
        nome: 'Conta 2',
        tipo: 'poupanca',
        saldo_inicial: 0,
      saldo_atual: 0,
        ativa: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const count = await service.countContas(instituicao.id);

      expect(count).toBe(2);
    });

    it('deve retornar 0 quando não tem contas', async () => {
      const instituicao = await service.createInstituicao({ nome: 'Banco Vazio' });

      const count = await service.countContas(instituicao.id);

      expect(count).toBe(0);
    });
  });

  describe('hasContasAtivas', () => {
    it('deve retornar true quando tem contas ativas', async () => {
      const db = getDB();
      const instituicao = await service.createInstituicao({ nome: 'Nubank' });

      await db.contas.add({
        id: 'conta-1',
        instituicao_id: instituicao.id,
        nome: 'Conta Ativa',
        tipo: 'corrente',
        saldo_inicial: 0,
      saldo_atual: 0,
        ativa: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.hasContasAtivas(instituicao.id);

      expect(result).toBe(true);
    });

    it('deve retornar false quando todas as contas estão inativas', async () => {
      const db = getDB();
      const instituicao = await service.createInstituicao({ nome: 'Banco Inativo' });

      await db.contas.add({
        id: 'conta-1',
        instituicao_id: instituicao.id,
        nome: 'Conta Inativa',
        tipo: 'corrente',
        saldo_inicial: 0,
      saldo_atual: 0,
        ativa: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.hasContasAtivas(instituicao.id);

      expect(result).toBe(false);
    });

    it('deve retornar false quando não tem contas', async () => {
      const instituicao = await service.createInstituicao({ nome: 'Banco Vazio' });

      const result = await service.hasContasAtivas(instituicao.id);

      expect(result).toBe(false);
    });
  });
});
