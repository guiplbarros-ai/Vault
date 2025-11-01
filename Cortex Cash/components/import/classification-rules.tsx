"use client";

/**
 * Componente de Gerenciamento de Regras de Classificação
 * Permite criar, editar e gerenciar regras automáticas de classificação
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Power, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { regraClassificacaoService } from '@/lib/services/regra-classificacao.service';
import { categoriaService } from '@/lib/services/categoria.service';
import type { RegraClassificacao, TipoRegra, Categoria } from '@/lib/types';
import { FormInput, FormSelect } from '@/components/forms';
import { FormProvider, useForm } from 'react-hook-form';

const TIPO_REGRA_OPTIONS = [
  { value: 'contains', label: 'Contém' },
  { value: 'starts_with', label: 'Começa com' },
  { value: 'ends_with', label: 'Termina com' },
  { value: 'regex', label: 'Expressão Regular (Regex)' },
];

interface RuleFormData {
  nome: string;
  tipo_regra: TipoRegra;
  padrao: string;
  categoria_id: string;
  prioridade: number;
  ativa: boolean;
}

export function ClassificationRules() {
  const [regras, setRegras] = useState<RegraClassificacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RegraClassificacao | null>(null);

  const methods = useForm<RuleFormData>({
    defaultValues: {
      nome: '',
      tipo_regra: 'contains',
      padrao: '',
      categoria_id: '',
      prioridade: 5,
      ativa: true,
    },
  });

  useEffect(() => {
    loadRegras();
    loadCategorias();
  }, []);

  const loadRegras = async () => {
    try {
      const data = await regraClassificacaoService.listRegras({
        sortBy: 'prioridade',
        sortOrder: 'desc',
      });
      setRegras(data);
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
      toast.error('Erro ao carregar regras');
    }
  };

  const loadCategorias = async () => {
    try {
      const data = await categoriaService.listCategorias({
        ativas: true,
      });
      setCategorias(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleNew = () => {
    setEditingRule(null);
    methods.reset({
      nome: '',
      tipo_regra: 'contains',
      padrao: '',
      categoria_id: '',
      prioridade: 5,
      ativa: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (regra: RegraClassificacao) => {
    setEditingRule(regra);
    methods.reset({
      nome: regra.nome,
      tipo_regra: regra.tipo_regra,
      padrao: regra.padrao,
      categoria_id: regra.categoria_id,
      prioridade: regra.prioridade,
      ativa: regra.ativa,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (data: RuleFormData) => {
    setLoading(true);
    try {
      if (editingRule) {
        await regraClassificacaoService.updateRegra(editingRule.id, data);
        toast.success('Regra atualizada com sucesso!');
      } else {
        await regraClassificacaoService.createRegra(data);
        toast.success('Regra criada com sucesso!');
      }

      await loadRegras();
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar regra:', error);
      toast.error('Erro ao salvar regra');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (regra: RegraClassificacao) => {
    try {
      await regraClassificacaoService.toggleRegra(regra.id);
      await loadRegras();
      toast.success(`Regra ${regra.ativa ? 'desativada' : 'ativada'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alternar regra:', error);
      toast.error('Erro ao alternar regra');
    }
  };

  const handleDelete = async (regra: RegraClassificacao) => {
    if (!confirm(`Tem certeza que deseja excluir a regra "${regra.nome}"?`)) {
      return;
    }

    try {
      await regraClassificacaoService.deleteRegra(regra.id);
      await loadRegras();
      toast.success('Regra excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir regra:', error);
      toast.error('Erro ao excluir regra');
    }
  };

  const getCategoriaName = (categoriaId: string) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    return categoria?.nome || 'Desconhecida';
  };

  const getTipoRegraLabel = (tipo: TipoRegra) => {
    const option = TIPO_REGRA_OPTIONS.find(o => o.value === tipo);
    return option?.label || tipo;
  };

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
        backgroundColor: '#3B5563'
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Regras de Classificação Automática
            </CardTitle>
            <CardDescription className="text-white/70">
              Configure regras para classificar automaticamente suas transações. Regras são aplicadas antes da IA.
            </CardDescription>
          </div>
          <Button
            onClick={handleNew}
            className="text-white"
            style={{
              backgroundColor: '#18B0A4',
              color: '#ffffff'
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {regras.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70 mb-4">
              Nenhuma regra configurada ainda.
            </p>
            <p className="text-sm text-white/60">
              Crie regras para classificar automaticamente transações com base na descrição.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-white/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="text-white">Prioridade</TableHead>
                  <TableHead className="text-white">Nome</TableHead>
                  <TableHead className="text-white">Tipo</TableHead>
                  <TableHead className="text-white">Padrão</TableHead>
                  <TableHead className="text-white">Categoria</TableHead>
                  <TableHead className="text-white">Aplicações</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((regra) => (
                  <TableRow key={regra.id} className="border-white/20">
                    <TableCell className="text-white font-medium">
                      {regra.prioridade}
                    </TableCell>
                    <TableCell className="text-white">{regra.nome}</TableCell>
                    <TableCell className="text-white/70">
                      {getTipoRegraLabel(regra.tipo_regra)}
                    </TableCell>
                    <TableCell className="text-white/70 font-mono text-sm">
                      {regra.padrao}
                    </TableCell>
                    <TableCell className="text-white/70">
                      {getCategoriaName(regra.categoria_id)}
                    </TableCell>
                    <TableCell className="text-white/70">
                      {regra.total_aplicacoes}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: regra.ativa ? '#18B0A4' : 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff'
                        }}
                      >
                        {regra.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(regra)}
                          className="text-white hover:bg-white/10"
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(regra)}
                          className="text-white hover:bg-white/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(regra)}
                          className="text-red-400 hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl"
          style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563',
            borderColor: 'rgba(255, 255, 255, 0.2)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingRule ? 'Editar Regra' : 'Nova Regra'}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Configure os parâmetros da regra de classificação automática.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="form-dark-input">
                <FormInput
                  name="nome"
                  label="Nome da Regra"
                  placeholder="Ex: Supermercado Pão de Açúcar"
                  required
                  className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
                />
              </div>

              <div className="form-dark-select">
                <FormSelect
                  name="tipo_regra"
                  label="Tipo de Regra"
                  placeholder="Selecione o tipo"
                  options={TIPO_REGRA_OPTIONS}
                  required
                />
              </div>

              <div className="form-dark-input">
                <FormInput
                  name="padrao"
                  label="Padrão de Busca"
                  placeholder="Ex: pao de acucar, mercado, supermercado"
                  required
                  className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
                />
                <p className="text-xs text-white/60 mt-1">
                  Insira o texto ou expressão que identifica a transação
                </p>
              </div>

              <div className="form-dark-select">
                <FormSelect
                  name="categoria_id"
                  label="Categoria"
                  placeholder="Selecione a categoria"
                  options={categorias.map(c => ({
                    value: c.id,
                    label: c.nome,
                  }))}
                  required
                />
              </div>

              <div className="form-dark-input">
                <FormInput
                  name="prioridade"
                  label="Prioridade"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="1-10"
                  required
                  className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
                />
                <p className="text-xs text-white/60 mt-1">
                  Regras com maior prioridade são aplicadas primeiro (1-10)
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="text-white"
                  style={{
                    backgroundColor: '#18B0A4',
                    color: '#ffffff'
                  }}
                >
                  {loading ? 'Salvando...' : editingRule ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
