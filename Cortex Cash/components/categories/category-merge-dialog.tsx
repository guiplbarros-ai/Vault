"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Categoria } from "@/lib/types";
import { categoriaService } from "@/lib/services/categoria.service";
import { AlertCircle, Merge } from "lucide-react";
import { toast } from "sonner";

export interface CategoryMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoriaOrigem?: Categoria;
  todasCategorias: Categoria[];
  onSuccess: () => void;
}

export function CategoryMergeDialog({
  open,
  onOpenChange,
  categoriaOrigem,
  todasCategorias,
  onSuccess,
}: CategoryMergeDialogProps) {
  const [categoriaDestinoId, setCategoriaDestinoId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    transacoes: number;
    orcamentos: number;
    regras: number;
  } | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setCategoriaDestinoId("");
      setPreview(null);
    }
  }, [open]);

  // Carregar preview quando selecionar destino
  useEffect(() => {
    async function loadPreview() {
      if (!categoriaOrigem || !categoriaDestinoId) {
        setPreview(null);
        return;
      }

      try {
        const count = await categoriaService.contarTransacoesPorCategoria(
          categoriaOrigem.id
        );
        setPreview({
          transacoes: count,
          orcamentos: 0, // TODO: adicionar contagem de orçamentos
          regras: 0, // TODO: adicionar contagem de regras
        });
      } catch (error) {
        console.error("Erro ao carregar preview:", error);
      }
    }

    loadPreview();
  }, [categoriaOrigem, categoriaDestinoId]);

  const categoriasCompativeis = todasCategorias.filter((cat) => {
    if (!categoriaOrigem) return false;
    // Não pode mesclar consigo mesma
    if (cat.id === categoriaOrigem.id) return false;
    // Deve ser do mesmo tipo
    if (cat.tipo !== categoriaOrigem.tipo) return false;
    // Deve estar ativa
    if (!cat.ativa) return false;
    return true;
  });

  const handlePreMerge = () => {
    if (!categoriaDestinoId) {
      toast.error("Selecione uma categoria de destino");
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleMerge = async () => {
    if (!categoriaOrigem || !categoriaDestinoId) return;

    try {
      setLoading(true);
      await categoriaService.mesclarCategorias(
        categoriaOrigem.id,
        categoriaDestinoId
      );
      toast.success("Categorias mescladas com sucesso");
      setConfirmDialogOpen(false);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao mesclar categorias");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const categoriaDestino = categoriasCompativeis.find(
    (c) => c.id === categoriaDestinoId
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Mesclar Categorias
            </DialogTitle>
            <DialogDescription>
              Todas as transações e dados da categoria origem serão
              transferidos para a categoria destino. A categoria origem será
              desativada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Categoria Origem */}
            <div className="space-y-2">
              <Label>Categoria Origem</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <span className="text-lg">{categoriaOrigem?.icone || "📁"}</span>
                <div className="flex-1">
                  <p className="font-medium">{categoriaOrigem?.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    Será desativada após a mesclagem
                  </p>
                </div>
              </div>
            </div>

            {/* Categoria Destino */}
            <div className="space-y-2">
              <Label htmlFor="destino">
                Categoria Destino <span className="text-destructive">*</span>
              </Label>
              <Select value={categoriaDestinoId} onValueChange={setCategoriaDestinoId}>
                <SelectTrigger id="destino">
                  <SelectValue placeholder="Selecione a categoria de destino" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasCompativeis.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Nenhuma categoria compatível encontrada
                    </div>
                  ) : (
                    categoriasCompativeis.map((cat) => {
                      // Formatar com hierarquia
                      const pai = cat.pai_id
                        ? todasCategorias.find((c) => c.id === cat.pai_id)
                        : null;
                      const label = pai ? `${pai.nome} > ${cat.nome}` : cat.nome;

                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <span>{cat.icone || "📁"}</span>
                            <span>{label}</span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {preview && categoriaDestino && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Dados que serão migrados:</p>
                  <ul className="text-sm space-y-1">
                    <li>• {preview.transacoes} transações</li>
                    {preview.orcamentos > 0 && (
                      <li>• {preview.orcamentos} orçamentos</li>
                    )}
                    {preview.regras > 0 && (
                      <li>• {preview.regras} regras de classificação</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Validação */}
            {categoriaOrigem && categoriaDestino && categoriaOrigem.tipo !== categoriaDestino.tipo && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  As categorias devem ser do mesmo tipo para mesclar
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handlePreMerge}
              disabled={!categoriaDestinoId || loading}
            >
              Mesclar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Mesclagem</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja mesclar{" "}
              <strong>{categoriaOrigem?.nome}</strong> com{" "}
              <strong>{categoriaDestino?.nome}</strong>?
              <br />
              <br />
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Transferir {preview?.transacoes || 0} transações</li>
                <li>Desativar a categoria "{categoriaOrigem?.nome}"</li>
                <li>Não poderá ser desfeita</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMerge}
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Mesclando..." : "Confirmar Mesclagem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
