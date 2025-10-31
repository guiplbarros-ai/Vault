"use client";

import * as React from "react";
import { ChevronRight, ChevronDown, MoreVertical, Edit, Trash2, Merge, Plus } from "lucide-react";
import { Categoria } from "@/lib/types";
import { CategoriaComSubcategorias } from "@/lib/services/categoria.service";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface CategoryTreeProps {
  categorias: CategoriaComSubcategorias[];
  onEdit?: (categoria: Categoria) => void;
  onDelete?: (categoria: Categoria) => void;
  onMerge?: (categoria: Categoria) => void;
  onAddSubcategoria?: (categoriaPai: Categoria) => void;
  onSelect?: (categoria: Categoria) => void;
  selectedId?: string;
}

export function CategoryTree({
  categorias,
  onEdit,
  onDelete,
  onMerge,
  onAddSubcategoria,
  onSelect,
  selectedId,
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderCategoria = (categoria: CategoriaComSubcategorias, level = 0) => {
    const hasSubcategorias = categoria.subcategorias && categoria.subcategorias.length > 0;
    const isExpanded = expandedIds.has(categoria.id);
    const isSelected = selectedId === categoria.id;

    return (
      <div key={categoria.id} className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md hover:bg-accent transition-colors cursor-pointer group",
            isSelected && "bg-accent",
            level > 0 && "ml-6"
          )}
          onClick={() => onSelect?.(categoria)}
        >
          {/* Expand/Collapse */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasSubcategorias) {
                toggleExpand(categoria.id);
              }
            }}
            className={cn(
              "p-0.5 hover:bg-background rounded transition-colors",
              !hasSubcategorias && "invisible"
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Ícone */}
          <div className="flex items-center justify-center w-8 h-8 rounded text-lg">
            {categoria.icone || "📁"}
          </div>

          {/* Nome e Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{categoria.nome}</span>
              {categoria.cor && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoria.cor }}
                />
              )}
            </div>
            {categoria.grupo && (
              <p className="text-xs text-muted-foreground truncate">
                {categoria.grupo}
              </p>
            )}
          </div>

          {/* Tipo Badge */}
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded",
              categoria.tipo === "receita" && "bg-green-500/10 text-green-600",
              categoria.tipo === "despesa" && "bg-red-500/10 text-red-600",
              categoria.tipo === "transferencia" && "bg-blue-500/10 text-blue-600"
            )}
          >
            {categoria.tipo === "receita" && "Receita"}
            {categoria.tipo === "despesa" && "Despesa"}
            {categoria.tipo === "transferencia" && "Transf"}
          </span>

          {/* Menu Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(categoria);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {onAddSubcategoria && !categoria.pai_id && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddSubcategoria(categoria);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Subcategoria
                </DropdownMenuItem>
              )}
              {onMerge && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onMerge(categoria);
                  }}
                >
                  <Merge className="mr-2 h-4 w-4" />
                  Mesclar com...
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(categoria);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Desativar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Subcategorias */}
        {hasSubcategorias && isExpanded && (
          <div className="mt-1">
            {categoria.subcategorias.map((sub) =>
              renderCategoria(
                { ...sub, subcategorias: [] } as CategoriaComSubcategorias,
                level + 1
              )
            )}
          </div>
        )}
      </div>
    );
  };

  if (categorias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">📁</div>
        <h3 className="font-semibold text-lg mb-2">Nenhuma categoria encontrada</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Comece criando sua primeira categoria de receita ou despesa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {categorias.map((categoria) => renderCategoria(categoria))}
    </div>
  );
}
