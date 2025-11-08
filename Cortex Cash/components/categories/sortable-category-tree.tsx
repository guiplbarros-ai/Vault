"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Categoria } from "@/lib/types";
import { CategoriaComSubcategorias } from "@/lib/services/categoria.service";
import { SortableCategoryItem } from "./sortable-category-item";

export interface SortableCategoryTreeProps {
  categorias: CategoriaComSubcategorias[];
  onEdit?: (categoria: Categoria) => void;
  onDelete?: (categoria: Categoria) => void;
  onMerge?: (categoria: Categoria) => void;
  onAddSubcategoria?: (categoriaPai: Categoria) => void;
  onSelect?: (categoria: Categoria) => void;
  selectedId?: string;
  onReorder?: (reordenacao: { id: string; novaOrdem: number }[]) => void;
}

export function SortableCategoryTree({
  categorias: initialCategorias,
  onEdit,
  onDelete,
  onMerge,
  onAddSubcategoria,
  onSelect,
  selectedId,
  onReorder,
}: SortableCategoryTreeProps) {
  const [categorias, setCategorias] = React.useState(initialCategorias);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  // Atualiza quando props mudam
  React.useEffect(() => {
    setCategorias(initialCategorias);
  }, [initialCategorias]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Evita ativar drag em cliques simples
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Verifica se está arrastando sobre uma categoria (para virar subcategoria)
    const targetCategoria = categorias.find((c) => c.id === over.id);
    const sourceCategoria = categorias.find((c) => c.id === active.id);

    // Se não encontrou a categoria na lista principal, pode ser uma subcategoria
    let sourceSubcategoria: Categoria | undefined;
    let sourceParentId: string | undefined;
    if (!sourceCategoria) {
      for (const cat of categorias) {
        const sub = cat.subcategorias.find(s => s.id === active.id);
        if (sub) {
          sourceSubcategoria = sub;
          sourceParentId = cat.id;
          break;
        }
      }
    }

    const draggedItem = sourceCategoria || sourceSubcategoria;

    // CASO 1: Arrastar subcategoria para área principal (remover pai)
    if (sourceSubcategoria && sourceParentId && targetCategoria && !expandedIds.has(targetCategoria.id)) {
      // Se é uma subcategoria e está sendo arrastada para uma categoria não-expandida,
      // remove o pai para torná-la categoria principal
      const { categoriaService } = await import("@/lib/services/categoria.service");
      const { toast } = await import("sonner");

      try {
        await categoriaService.updateCategoria(sourceSubcategoria.id, {
          pai_id: undefined,
        });

        toast.success(`"${sourceSubcategoria.nome}" agora é uma categoria principal`);
        window.location.reload();
      } catch (error) {
        console.error('Erro ao mover categoria:', error);
        toast.error('Erro ao mover categoria');
      }
      return;
    }

    // CASO 2: Arrastar sobre uma categoria EXPANDIDA para transformar em subcategoria
    // Só transforma em subcategoria se:
    // 1. A categoria alvo está expandida (mostrando intenção de adicionar subcategoria)
    // 2. O item arrastado não é já subcategoria da mesma categoria
    if (
      targetCategoria &&
      draggedItem &&
      targetCategoria.id !== draggedItem.id &&
      expandedIds.has(targetCategoria.id) &&
      sourceParentId !== targetCategoria.id
    ) {
      // Importar categoriaService
      const { categoriaService } = await import("@/lib/services/categoria.service");
      const { toast } = await import("sonner");

      try {
        // Atualiza o pai_id para transformar em subcategoria
        await categoriaService.updateCategoria(draggedItem.id, {
          pai_id: targetCategoria.id,
        });

        toast.success(`"${draggedItem.nome}" agora é subcategoria de "${targetCategoria.nome}"`);

        // Recarrega as categorias
        window.location.reload();
      } catch (error) {
        console.error('Erro ao mover categoria:', error);
        toast.error('Erro ao mover categoria');
      }
      return;
    }

    // CASO 3: Reordenação normal entre categorias do mesmo nível
    const oldIndex = categorias.findIndex((c) => c.id === active.id);
    const newIndex = categorias.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Reordena localmente
    const newCategorias = arrayMove(categorias, oldIndex, newIndex);
    setCategorias(newCategorias);

    // Gera array de reordenação para o backend
    const reordenacao = newCategorias.map((cat, index) => ({
      id: cat.id,
      novaOrdem: index + 1,
    }));

    // Chama callback de reordenação
    onReorder?.(reordenacao);
  };

  if (categorias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">📁</div>
        <h3 className="font-semibold text-lg mb-2 text-white">Nenhuma categoria encontrada</h3>
        <p className="text-sm text-white/70 max-w-sm">
          Comece criando sua primeira categoria de receita ou despesa.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={categorias.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {categorias.map((categoria) => (
            <div key={categoria.id} className="w-full">
              <SortableCategoryItem
                categoria={categoria}
                subcategorias={categoria.subcategorias}
                isExpanded={expandedIds.has(categoria.id)}
                isSelected={selectedId === categoria.id}
                onToggle={() => toggleExpand(categoria.id)}
                onEdit={onEdit}
                onDelete={onDelete}
                onMerge={onMerge}
                onAddSubcategoria={onAddSubcategoria}
                onSelect={onSelect}
              />

              {/* Subcategorias */}
              {expandedIds.has(categoria.id) && categoria.subcategorias.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {categoria.subcategorias.map((sub) => (
                    <SortableCategoryItem
                      key={sub.id}
                      categoria={sub}
                      subcategorias={[]}
                      isSelected={selectedId === sub.id}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onMerge={onMerge}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
