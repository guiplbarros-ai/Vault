"use client";

/**
 * Classification Rules Page
 * Agent APP: Owner
 *
 * Página de gestão de regras de classificação automática
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  Power,
  GripVertical,
  AlertCircle,
  CheckCircle,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { regraClassificacaoService } from '@/lib/services/regra-classificacao.service';
import type { RegraClassificacao, TipoRegra } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RuleForm } from '@/components/classification/rule-form';

export default function ClassificationRulesPage() {
  const [regras, setRegras] = useState<RegraClassificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    ativas: number;
    inativas: number;
    total_aplicacoes: number;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtiva, setFilterAtiva] = useState<boolean | null>(null);

  // Estados dos modals
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RegraClassificacao | null>(null);
  const [deletingRule, setDeletingRule] = useState<RegraClassificacao | null>(null);
  const [previewRule, setPreviewRule] = useState<RegraClassificacao | null>(null);

  // Carrega regras e estatísticas
  const loadData = async () => {
    try {
      setLoading(true);
      const [regrasData, statsData] = await Promise.all([
        regraClassificacaoService.listRegras({
          sortBy: 'prioridade',
          sortOrder: 'desc',
        }),
        regraClassificacaoService.getRegrasStats(),
      ]);

      setRegras(regrasData);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
      toast.error('Erro ao carregar regras de classificação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtra regras
  const filteredRegras = regras.filter((regra) => {
    const matchesSearch =
      regra.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      regra.padrao.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterAtiva === null || regra.ativa === filterAtiva;

    return matchesSearch && matchesFilter;
  });

  // Toggle ativa/inativa
  const handleToggleRegra = async (id: string) => {
    try {
      await regraClassificacaoService.toggleRegra(id);
      await loadData();
      toast.success('Status da regra atualizado');
    } catch (error) {
      console.error('Erro ao alternar regra:', error);
      toast.error('Erro ao alterar status da regra');
    }
  };

  // Deletar regra
  const handleDeleteRegra = async () => {
    if (!deletingRule) return;

    try {
      await regraClassificacaoService.deleteRegra(deletingRule.id);
      await loadData();
      toast.success('Regra excluída com sucesso');
      setDeletingRule(null);
    } catch (error) {
      console.error('Erro ao deletar regra:', error);
      toast.error('Erro ao excluir regra');
    }
  };

  // Badges de tipo de regra
  const getTipoRegraLabel = (tipo: TipoRegra) => {
    const labels = {
      contains: 'Contém',
      starts_with: 'Começa com',
      ends_with: 'Termina com',
      regex: 'Regex',
    };
    return labels[tipo];
  };

  const getTipoRegraColor = (tipo: TipoRegra) => {
    const colors = {
      contains: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      starts_with: 'bg-green-500/20 text-green-300 border-green-500/30',
      ends_with: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      regex: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    };
    return colors[tipo];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Regras de Classificação</h1>
            <p className="text-white/70">
              Crie regras para classificar transações automaticamente
            </p>
          </div>

          <Button
            onClick={() => {
              setEditingRule(null);
              setShowRuleForm(true);
            }}
            className="gap-2"
            style={{
              background: 'linear-gradient(135deg, #18B0A4 0%, #16a89d 100%)',
              color: 'white',
            }}
          >
            <Plus className="w-4 h-4" />
            Nova Regra
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              className="p-4 rounded-lg border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <div className="text-white/60 text-sm font-medium">Total de Regras</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            </div>

            <div
              className="p-4 rounded-lg border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <div className="text-white/60 text-sm font-medium">Regras Ativas</div>
              <div className="text-2xl font-bold text-green-400 mt-1">{stats.ativas}</div>
            </div>

            <div
              className="p-4 rounded-lg border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <div className="text-white/60 text-sm font-medium">Regras Inativas</div>
              <div className="text-2xl font-bold text-white/50 mt-1">{stats.inativas}</div>
            </div>

            <div
              className="p-4 rounded-lg border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <div className="text-white/60 text-sm font-medium">Total de Aplicações</div>
              <div className="text-2xl font-bold" style={{ color: '#18B0A4' }}>
                {stats.total_aplicacoes}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Buscar regras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#18B0A4]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterAtiva === null ? 'default' : 'outline'}
              onClick={() => setFilterAtiva(null)}
              size="sm"
            >
              Todas
            </Button>
            <Button
              variant={filterAtiva === true ? 'default' : 'outline'}
              onClick={() => setFilterAtiva(true)}
              size="sm"
            >
              Ativas
            </Button>
            <Button
              variant={filterAtiva === false ? 'default' : 'outline'}
              onClick={() => setFilterAtiva(false)}
              size="sm"
            >
              Inativas
            </Button>
          </div>
        </div>

        {/* Rules List */}
        <div
          className="rounded-xl border border-white/20 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
          }}
        >
          {loading ? (
            <div className="p-12 text-center text-white/60">Carregando...</div>
          ) : filteredRegras.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60">Nenhuma regra encontrada</p>
              <p className="text-white/40 text-sm mt-2">
                {searchTerm || filterAtiva !== null
                  ? 'Tente ajustar os filtros'
                  : 'Crie sua primeira regra para começar'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredRegras.map((regra) => (
                <div
                  key={regra.id}
                  className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                >
                  {/* Drag Handle */}
                  <div className="text-white/30 cursor-move">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Priority Badge */}
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #18B0A4 0%, #16a89d 100%)',
                    }}
                  >
                    {regra.prioridade}
                  </div>

                  {/* Rule Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold truncate">{regra.nome}</h3>
                      <Badge className={cn('border', getTipoRegraColor(regra.tipo_regra))}>
                        {getTipoRegraLabel(regra.tipo_regra)}
                      </Badge>
                      {!regra.ativa && (
                        <Badge variant="outline" className="border-white/30 text-white/50">
                          Inativa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white/60">
                        Padrão: <span className="text-white/80 font-mono">{regra.padrao}</span>
                      </span>
                      {regra.total_aplicacoes > 0 && (
                        <span className="text-white/40">
                          {regra.total_aplicacoes} {regra.total_aplicacoes === 1 ? 'aplicação' : 'aplicações'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewRule(regra)}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRegra(regra.id)}
                      className={cn(
                        'hover:bg-white/10',
                        regra.ativa ? 'text-green-400' : 'text-white/40'
                      )}
                    >
                      <Power className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRule(regra);
                        setShowRuleForm(true);
                      }}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingRule(regra)}
                      className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Regra</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a regra <strong>{deletingRule?.nome}</strong>?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRegra} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rule Form Dialog */}
        <RuleForm
          open={showRuleForm}
          onOpenChange={setShowRuleForm}
          rule={editingRule}
          onSuccess={loadData}
        />
      </div>
    </DashboardLayout>
  );
}
