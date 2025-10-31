"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronRight, ChevronDown, MoreVertical, Edit, Trash2, Merge, Plus } from "lucide-react";
import { Categoria } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Função para derivar cor mais clara para subcategorias
function getDerivedColor(baseColor: string, isSubcategoria: boolean): string {
  if (!isSubcategoria) return baseColor;

  // Converte hex para RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Aumenta o brilho em 30%
  const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.3));

  const newR = lighten(r);
  const newG = lighten(g);
  const newB = lighten(b);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Função para dessaturar a cor e torná-la mais suave
function desaturateColor(color: string, isSubcategoria: boolean): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calcula luminosidade
  const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;

  // Mix com cinza médio-escuro para dessaturar (mais sutil)
  const mix = isSubcategoria ? 0.7 : 0.5; // Subcategorias ainda mais suaves
  const gray = 90; // Tom de cinza escuro

  const newR = Math.round(r * (1 - mix) + gray * mix);
  const newG = Math.round(g * (1 - mix) + gray * mix);
  const newB = Math.round(b * (1 - mix) + gray * mix);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

export interface SortableCategoryItemProps {
  categoria: Categoria;
  subcategorias?: Categoria[];
  isExpanded?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
  onEdit?: (categoria: Categoria) => void;
  onDelete?: (categoria: Categoria) => void;
  onMerge?: (categoria: Categoria) => void;
  onAddSubcategoria?: (categoria: Categoria) => void;
  onSelect?: (categoria: Categoria) => void;
}

export function SortableCategoryItem({
  categoria,
  subcategorias = [],
  isExpanded = false,
  isSelected = false,
  onToggle,
  onEdit,
  onDelete,
  onMerge,
  onAddSubcategoria,
  onSelect,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoria.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasSubcategorias = subcategorias.length > 0;
  const isSubcategoria = !!categoria.pai_id;
  const corBase = categoria.cor || '#6b7280';

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'relative'
      }}
      className={cn(
        "flex items-center gap-3 py-3 px-4 rounded-lg transition-all group",
        "bg-slate-700/50 backdrop-blur-sm",
        "hover:bg-slate-700/70",
        isSelected && "ring-2 ring-primary/50",
        isDragging && "opacity-50",
        isSubcategoria && "ml-0"
      )}
    >
      {/* Barra colorida lateral esquerda (todas as categorias) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: corBase }}
      />

      {/* Barra colorida inferior para categorias principais */}
      {!isSubcategoria && (
        <div
          className="absolute bottom-0 left-0 h-1 rounded-bl-lg"
          style={{
            backgroundColor: corBase,
            width: '25%'
          }}
        />
      )}
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/10 rounded transition-colors opacity-0 group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-white/70" />
      </button>

      {/* Expand/Collapse */}
      {!isSubcategoria && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasSubcategorias) {
              onToggle?.();
            }
          }}
          className={cn(
            "p-1 hover:bg-black/10 rounded transition-colors",
            !hasSubcategorias && "invisible"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-white" />
          ) : (
            <ChevronRight className="h-5 w-5 text-white" />
          )}
        </button>
      )}

      {/* Ícone */}
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-600/30 text-2xl">
        {categoria.icone || "📁"}
      </div>

      {/* Nome e Info */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onSelect?.(categoria)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate text-base">
            {categoria.nome}
          </span>
        </div>
        {categoria.grupo && (
          <p className="text-xs text-white/70 truncate mt-0.5">
            {categoria.grupo}
          </p>
        )}
      </div>

      {/* Tipo Badge */}
      <span
        className={cn(
          "text-xs font-medium px-3 py-1 rounded-full",
          categoria.tipo === "receita" && "bg-green-500/90 text-white",
          categoria.tipo === "despesa" && "bg-red-500/90 text-white",
          categoria.tipo === "transferencia" && "bg-blue-500/90 text-white"
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
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-slate-800 border-white/20"
          style={{
            backgroundColor: '#1e293b',
            borderColor: 'rgba(255, 255, 255, 0.2)'
          }}
        >
          {onEdit && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(categoria);
              }}
              className="text-white hover:!bg-white/10 focus:!bg-white/10 cursor-pointer"
              style={{ color: '#ffffff' }}
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
              className="text-white hover:!bg-white/10 focus:!bg-white/10 cursor-pointer"
              style={{ color: '#ffffff' }}
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
              className="text-white hover:!bg-white/10 focus:!bg-white/10 cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              <Merge className="mr-2 h-4 w-4" />
              Mesclar com...
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-white/20" />
          {onDelete && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(categoria);
              }}
              className="text-red-400 hover:!bg-red-500/20 focus:!bg-red-500/20 cursor-pointer"
              style={{ color: '#f87171' }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Desativar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
