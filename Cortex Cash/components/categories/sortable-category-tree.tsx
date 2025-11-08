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
  useSortable,
} from "@dnd-kit/sortable";
import { Categoria } from "@/lib/types";
import { CategoriaComSubcategorias } from "@/lib/services/categoria.service";
import { SortableCategoryItem } from "./sortable-category-item";

// Componente para área de drop vazia
function DropZoneArea({ categoriaId }: { categoriaId: string }) {
  const dropzoneId = `dropzone-${categoriaId}`;
  const { setNodeRef, isOver } = useSortable({ id: dropzoneId });

  return (
    <div
      ref={setNodeRef}
      className="flex items-center justify-center py-4 px-4 rounded-lg border-2 border-dashed transition-colors"
      style={{
        borderColor: isOver ? 'rgba(96, 165, 250, 0.5)' : 'rgba(255, 255, 255, 0.2)',
        backgroundColor: isOver ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255, 255, 255, 0.03)',
      }}
    >
      <p className="text-sm text-white/50 text-center">
        {isOver ? '✨ Solte aqui para criar subcategoria' : 'Arraste uma categoria aqui para criar subcategoria'}
      </p>
    </div>
  );
}

export interface SortableCategoryTreeProps {
  categorias: CategoriaComSubcategorias[];
  onEdit?: (categoria: Categoria) => void;
  onDelete?: (categoria: Categoria) => void;
  onMerge?: (categoria: Categoria) => void;
  onAddSubcategoria?: (categoriaPai: Categoria) => void;
  onSelect?: (categoria: Categoria) => void;
  selectedId?: string;
  onReorder?: (reordenacao: { id: string; novaOrdem: number }[]) => void;
  onViewAnalytics?: (categoria: Categoria) => void;
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
  onViewAnalytics,
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

    console.log('🎯 DragEnd Event:', {
      activeId: active.id,
      overId: over?.id,
      expandedIds: Array.from(expandedIds)
    });

    if (!over || active.id === over.id) {
      return;
    }

    // Detecta se está arrastando sobre uma dropzone vazia
    const overIdStr = String(over.id);
    const isDropzone = overIdStr.startsWith('dropzone-');
    const dropzoneParentId = isDropzone ? overIdStr.replace('dropzone-', '') : null;

    console.log('🎯 Dropzone detection:', {
      overIdStr,
      isDropzone,
      dropzoneParentId
    });

    // Verifica se está arrastando sobre uma categoria (para virar subcategoria)
    let targetCategoria = categorias.find((c) => c.id === over.id);

    // Se está sobre uma dropzone, pega a categoria pai
    if (isDropzone && dropzoneParentId) {
      targetCategoria = categorias.find((c) => c.id === dropzoneParentId);
      console.log('📦 Dropzone detectada para categoria:', targetCategoria?.nome);
    }

    const sourceCategoria = categorias.find((c) => c.id === active.id);

    console.log('🔍 Categorias encontradas:', {
      targetCategoria: targetCategoria?.nome,
      sourceCategoria: sourceCategoria?.nome,
      targetExpandida: targetCategoria ? expandedIds.has(targetCategoria.id) : false
    });

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

    // CASO 2: Arrastar sobre uma categoria EXPANDIDA ou DROPZONE para transformar em subcategoria
    // Só transforma em subcategoria se:
    // 1. A categoria alvo está expandida (mostrando intenção de adicionar subcategoria) OU é uma dropzone
    // 2. O item arrastado não é já subcategoria da mesma categoria
    const shouldCreateSubcategory =
      targetCategoria &&
      draggedItem &&
      targetCategoria.id !== draggedItem.id &&
      (expandedIds.has(targetCategoria.id) || isDropzone) && // Aceita dropzone OU categoria expandida
      sourceParentId !== targetCategoria.id;

    console.log('🧩 Verificação CASO 2 (criar subcategoria):', {
      hasTarget: !!targetCategoria,
      hasDragged: !!draggedItem,
      differentIds: targetCategoria && draggedItem && targetCategoria.id !== draggedItem.id,
      isExpanded: targetCategoria && expandedIds.has(targetCategoria.id),
      isDropzone: isDropzone,
      notAlreadyChild: sourceParentId !== targetCategoria?.id,
      shouldCreateSubcategory
    });

    if (shouldCreateSubcategory) {
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
        items={[
          ...categorias.map((c) => c.id),
          // Adiciona IDs das subcategorias e drop zones vazias
          ...categorias.flatMap(c => [
            ...c.subcategorias.map(sub => sub.id),
            ...(expandedIds.has(c.id) && c.subcategorias.length === 0 ? [`dropzone-${c.id}`] : [])
          ])
        ]}
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
                onViewAnalytics={onViewAnalytics}
              />

              {/* Subcategorias ou área de drop vazia */}
              {expandedIds.has(categoria.id) && (
                <div className="ml-6 mt-1 space-y-1">
                  {categoria.subcategorias.length > 0 ? (
                    // Renderiza subcategorias existentes
                    categoria.subcategorias.map((sub) => (
                      <SortableCategoryItem
                        key={sub.id}
                        categoria={sub}
                        subcategorias={[]}
                        isSelected={selectedId === sub.id}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onMerge={onMerge}
                        onSelect={onSelect}
                        onViewAnalytics={onViewAnalytics}
                      />
                    ))
                  ) : (
                    // Área vazia para drop quando não há subcategorias
                    <DropZoneArea categoriaId={categoria.id} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
