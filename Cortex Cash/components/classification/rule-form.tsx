"use client";

/**
 * Rule Form Component
 * Agent APP: Owner
 *
 * Formulário para criar/editar regras de classificação
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { regraClassificacaoService } from '@/lib/services/regra-classificacao.service';
import { categoriaService } from '@/lib/services/categoria.service';
import type { RegraClassificacao, TipoRegra, Categoria } from '@/lib/types';
import { AlertCircle, HelpCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RegraClassificacao | null;
  onSuccess: () => void;
}

export function RuleForm({ open, onOpenChange, rule, onSuccess }: RuleFormProps) {
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    matches: number;
    examples: string[];
  } | null>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [tipoRegra, setTipoRegra] = useState<TipoRegra>('contains');
  const [padrao, setPadrao] = useState('');
  const [prioridade, setPrioridade] = useState(1);
  const [ativa, setAtiva] = useState(true);

  // Carrega categorias
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const cats = await categoriaService.listCategorias({ ativas: true });
        setCategorias(cats);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    };

    if (open) {
      loadCategorias();
    }
  }, [open]);

  // Popula form ao editar
  useEffect(() => {
    if (rule && open) {
      setNome(rule.nome);
      setCategoriaId(rule.categoria_id);
      setTipoRegra(rule.tipo_regra);
      setPadrao(rule.padrao);
      setPrioridade(rule.prioridade);
      setAtiva(rule.ativa);
    } else if (open) {
      // Reset form
      setNome('');
      setCategoriaId('');
      setTipoRegra('contains');
      setPadrao('');
      setPrioridade(1);
      setAtiva(true);
    }
  }, [rule, open]);

  // Preview da regra
  const handlePreview = async () => {
    if (!padrao.trim()) {
      toast.error('Digite um padrão para fazer o preview');
      return;
    }

    try {
      setLoading(true);
      const preview = await regraClassificacaoService.previewRegra(tipoRegra, padrao, 5);

      setPreviewData({
        matches: preview.total_matches,
        examples: preview.matches.map(m => m.descricao),
      });
      setShowPreview(true);
    } catch (error: any) {
      console.error('Erro no preview:', error);
      toast.error(error.message || 'Erro ao fazer preview da regra');
    } finally {
      setLoading(false);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error('Nome da regra é obrigatório');
      return;
    }

    if (!categoriaId) {
      toast.error('Selecione uma categoria');
      return;
    }

    if (!padrao.trim()) {
      toast.error('Padrão é obrigatório');
      return;
    }

    try {
      setLoading(true);

      if (rule) {
        // Editar
        await regraClassificacaoService.updateRegra(rule.id, {
          nome,
          categoria_id: categoriaId,
          tipo_regra: tipoRegra,
          padrao,
          prioridade,
          ativa,
        });
        toast.success('Regra atualizada com sucesso');
      } else {
        // Criar
        await regraClassificacaoService.createRegra({
          nome,
          categoria_id: categoriaId,
          tipo_regra: tipoRegra,
          padrao,
          prioridade,
          ativa,
        });
        toast.success('Regra criada com sucesso');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar regra:', error);
      toast.error(error.message || 'Erro ao salvar regra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar Regra' : 'Nova Regra de Classificação'}</DialogTitle>
          <DialogDescription>
            As regras são aplicadas por ordem de prioridade (maior primeiro) e param na primeira que casar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Regra *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Restaurantes Fast Food"
              disabled={loading}
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria *</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId} disabled={loading}>
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icone} {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Regra */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Regra *</Label>
            <Select
              value={tipoRegra}
              onValueChange={(value: TipoRegra) => setTipoRegra(value)}
              disabled={loading}
            >
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">
                  <div>
                    <div className="font-medium">Contém</div>
                    <div className="text-xs text-white/60">Descrição contém o padrão</div>
                  </div>
                </SelectItem>
                <SelectItem value="starts_with">
                  <div>
                    <div className="font-medium">Começa com</div>
                    <div className="text-xs text-white/60">Descrição começa com o padrão</div>
                  </div>
                </SelectItem>
                <SelectItem value="ends_with">
                  <div>
                    <div className="font-medium">Termina com</div>
                    <div className="text-xs text-white/60">Descrição termina com o padrão</div>
                  </div>
                </SelectItem>
                <SelectItem value="regex">
                  <div>
                    <div className="font-medium">Regex (Avançado)</div>
                    <div className="text-xs text-white/60">Expressão regular customizada</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Padrão */}
          <div className="space-y-2">
            <Label htmlFor="padrao">Padrão *</Label>
            <div className="flex gap-2">
              <Input
                id="padrao"
                value={padrao}
                onChange={(e) => setPadrao(e.target.value)}
                placeholder={
                  tipoRegra === 'regex'
                    ? 'Ex: ^(uber|99).*'
                    : 'Ex: subway'
                }
                className="font-mono"
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePreview}
                disabled={loading || !padrao.trim()}
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
            {tipoRegra === 'regex' && (
              <p className="text-xs text-yellow-500 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Use expressões regulares válidas. Flags: case-insensitive (i) aplicada automaticamente.
              </p>
            )}
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="prioridade">
              Prioridade
              <span className="ml-2 text-xs text-white/60">(maior = executada primeiro)</span>
            </Label>
            <Input
              id="prioridade"
              type="number"
              min={1}
              value={prioridade}
              onChange={(e) => setPrioridade(parseInt(e.target.value) || 1)}
              disabled={loading}
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativa"
              checked={ativa}
              onChange={(e) => setAtiva(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-white/20 bg-white/5"
            />
            <Label htmlFor="ativa" className="cursor-pointer">
              Regra ativa (será aplicada automaticamente)
            </Label>
          </div>

          {/* Preview Results */}
          {showPreview && previewData && (
            <div
              className="p-4 rounded-lg border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-5 h-5" style={{ color: '#18B0A4' }} />
                <h4 className="font-semibold text-white">Preview da Regra</h4>
              </div>

              <div className="space-y-2">
                <p className="text-white/80">
                  Esta regra casaria com{' '}
                  <Badge className="bg-[#18B0A4] text-white">{previewData.matches}</Badge>{' '}
                  {previewData.matches === 1 ? 'transação' : 'transações'} existentes
                </p>

                {previewData.examples.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/60 mb-2">Exemplos:</p>
                    <ul className="space-y-1">
                      {previewData.examples.map((ex, i) => (
                        <li key={i} className="text-sm text-white/70 font-mono">
                          → {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #18B0A4 0%, #16a89d 100%)',
              color: 'white',
            }}
          >
            {loading ? 'Salvando...' : rule ? 'Atualizar' : 'Criar Regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
