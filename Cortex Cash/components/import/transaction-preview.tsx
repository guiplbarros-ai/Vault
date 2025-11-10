"use client";

/**
 * Componente de Preview de Transações Importadas
 * Agent IMPORT: Owner
 */

import { useState } from "react";
import { Check, X, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { ParsedTransacao } from "@/lib/types";

interface TransactionPreviewProps {
  transacoes: ParsedTransacao[];
  duplicadas?: ParsedTransacao[];
  onConfirm: (transacoes: ParsedTransacao[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function TransactionPreview({
  transacoes,
  duplicadas = [],
  onConfirm,
  onCancel,
  loading = false,
}: TransactionPreviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(transacoes.map((_, i) => i))
  );
  const [showDuplicates, setShowDuplicates] = useState(false);

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === transacoes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transacoes.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    const selecionadas = transacoes.filter((_, i) => selectedIds.has(i));
    onConfirm(selecionadas);
  };

  const totalReceitas = transacoes
    .filter((t) => t.tipo === "receita")
    .reduce((sum, t) => sum + t.valor, 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((sum, t) => sum + t.valor, 0);

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <Card className="p-6 bg-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Resumo da Importação</h3>
            <Badge variant="outline">
              {selectedIds.size} de {transacoes.length} selecionadas
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Transações</p>
              <p className="text-2xl font-bold">{transacoes.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                Receitas
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalReceitas)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
                Despesas
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDespesas)}
              </p>
            </div>
          </div>

          {duplicadas.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {duplicadas.length} transações duplicadas detectadas
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Essas transações já existem no sistema e foram filtradas automaticamente
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDuplicates(!showDuplicates)}
              >
                {showDuplicates ? "Ocultar" : "Ver"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Lista de Transações */}
      <Card className="p-6 bg-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === transacoes.length}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">Selecionar todas</span>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transacoes.map((transacao, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.has(index)}
                  onCheckedChange={() => toggleSelection(index)}
                />

                <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="text-sm font-medium">{formatDate(transacao.data)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium">{transacao.descricao}</p>
                    {transacao.observacoes && (
                      <p className="text-xs text-muted-foreground">
                        {transacao.observacoes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        transacao.tipo === "receita"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transacao.tipo === "receita" ? "+" : "-"}
                      {formatCurrency(transacao.valor)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Duplicadas (se solicitado) */}
      {showDuplicates && duplicadas.length > 0 && (
        <Card className="p-6 bg-card">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Transações Duplicadas
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {duplicadas.map((transacao, index) => (
                <div
                  key={`dup-${index}`}
                  className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transacao.data)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">
                        {transacao.descricao}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {transacao.tipo === "receita" ? "+" : "-"}
                        {formatCurrency(transacao.valor)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={selectedIds.size === 0 || loading}
        >
          {loading ? (
            "Importando..."
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Importar {selectedIds.size} Transações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
