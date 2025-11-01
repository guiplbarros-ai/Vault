'use client';

/**
 * Componente para classificação em massa de transações
 * Agent FINANCE: v0.2 - Classificação Manual
 *
 * Permite selecionar uma categoria e aplicar a múltiplas transações simultaneamente
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoriaService } from '@/lib/services/categoria.service';
import { transacaoService } from '@/lib/services/transacao.service';
import type { Categoria } from '@/lib/types';
import { toast } from 'sonner';
import { Tag, Loader2 } from 'lucide-react';

interface BulkCategoryAssignProps {
  selectedTransactionIds: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BulkCategoryAssign({
  selectedTransactionIds,
  onSuccess,
  onCancel
}: BulkCategoryAssignProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    try {
      setLoadingCategorias(true);
      const data = await categoriaService.listCategorias({
        ativas: true,
        sortBy: 'nome',
        sortOrder: 'asc',
      });
      setCategorias(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleApply = async () => {
    if (!categoriaId) {
      toast.error('Selecione uma categoria');
      return;
    }

    try {
      setLoading(true);

      const count = await transacaoService.bulkUpdateCategoria(
        selectedTransactionIds,
        categoriaId
      );

      toast.success(`${count} transações classificadas com sucesso!`, {
        description: 'As transações foram atualizadas com a categoria selecionada',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao classificar transações:', error);
      toast.error('Erro ao classificar transações', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  // Agrupa categorias por tipo
  const categoriasPorTipo = categorias.reduce((acc, categoria) => {
    const tipo = categoria.tipo;
    if (!acc[tipo]) {
      acc[tipo] = [];
    }
    acc[tipo].push(categoria);
    return acc;
  }, {} as Record<string, Categoria[]>);

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      receita: 'Receitas',
      despesa: 'Despesas',
      transferencia: 'Transferências',
    };
    return labels[tipo] || tipo;
  };

  if (selectedTransactionIds.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: 'rgb(15, 23, 42)',
        borderColor: 'rgb(30, 41, 59)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-500" />
          <span className="text-white font-medium">
            {selectedTransactionIds.length} {selectedTransactionIds.length === 1 ? 'transação selecionada' : 'transações selecionadas'}
          </span>
        </div>

        <div className="flex-1">
          <Select
            value={categoriaId}
            onValueChange={setCategoriaId}
            disabled={loadingCategorias || loading}
          >
            <SelectTrigger
              style={{
                backgroundColor: 'rgb(30, 41, 59)',
                borderColor: 'rgb(51, 65, 85)',
                color: 'white',
              }}
            >
              <SelectValue placeholder="Selecione uma categoria..." />
            </SelectTrigger>
            <SelectContent
              style={{
                backgroundColor: 'rgb(30, 41, 59)',
                borderColor: 'rgb(51, 65, 85)',
              }}
            >
              {loadingCategorias ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : (
                Object.entries(categoriasPorTipo).map(([tipo, cats]) => (
                  <SelectGroup key={tipo}>
                    <SelectLabel
                      style={{
                        color: 'rgb(148, 163, 184)',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                      }}
                    >
                      {getTipoLabel(tipo)}
                    </SelectLabel>
                    {cats.map((categoria) => (
                      <SelectItem
                        key={categoria.id}
                        value={categoria.id}
                        style={{
                          color: 'white',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {categoria.icone && <span>{categoria.icone}</span>}
                          <span>{categoria.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleApply}
            disabled={!categoriaId || loading}
            style={{
              backgroundColor: 'rgb(59, 130, 246)',
              color: 'white',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              'Aplicar Categoria'
            )}
          </Button>

          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={loading}
              style={{
                borderColor: 'rgb(71, 85, 105)',
                color: 'white',
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
