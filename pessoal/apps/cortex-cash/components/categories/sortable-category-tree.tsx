'use client'

import type { CategoriaComSubcategorias } from '@/lib/services/categoria.service'
import type { Categoria } from '@/lib/types'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import * as React from 'react'
import { SortableCategoryItem } from './sortable-category-item'

// Componente para área de drop vazia
function DropZoneArea({ categoriaId }: { categoriaId: string }) {
  const dropzoneId = `dropzone-${categoriaId}`
  const { setNodeRef, isOver } = useSortable({ id: dropzoneId })

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
        {isOver
          ? '✨ Solte aqui para criar subcategoria'
          : 'Arraste uma categoria aqui para criar subcategoria'}
      </p>
    </div>
  )
}

export interface SortableCategoryTreeProps {
  categorias: CategoriaComSubcategorias[]
  onEdit?: (categoria: Categoria) => void
  onDelete?: (categoria: Categoria) => void
  onMerge?: (categoria: Categoria) => void
  onAddSubcategoria?: (categoriaPai: Categoria) => void
  onSelect?: (categoria: Categoria) => void
  selectedId?: string
  onReorder?: (reordenacao: { id: string; novaOrdem: number }[]) => void
  onViewAnalytics?: (categoria: Categoria) => void
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
  const [categorias, setCategorias] = React.useState(initialCategorias)

  // Inicia com todas as categorias que têm subcategorias expandidas
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
    const ids = new Set<string>()
    initialCategorias.forEach((cat) => {
      if (cat.subcategorias && cat.subcategorias.length > 0) {
        ids.add(cat.id)
      }
    })
    return ids
  })

  // Não sincroniza com props após mount - mantém estado local para updates otimistas
  // Se precisar recarregar do banco, o componente pai deve forçar unmount/remount

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Evita ativar drag em cliques simples
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  // Helper para update otimista: mover categoria para ser subcategoria
  const moveToSubcategory = (categoriaId: string, parentId: string) => {
    console.log('🔄 moveToSubcategory:', { categoriaId, parentId })

    setCategorias((prevCategorias) => {
      console.log(
        '📊 Categorias antes:',
        prevCategorias.map((c) => ({ id: c.id, nome: c.nome, subs: c.subcategorias.length }))
      )

      // Encontra a categoria sendo movida
      const categoriaMovida = prevCategorias.find((c) => c.id === categoriaId)

      if (!categoriaMovida) {
        console.warn('❌ Categoria não encontrada:', categoriaId)
        return prevCategorias
      }

      console.log('📦 Categoria movida:', { id: categoriaMovida.id, nome: categoriaMovida.nome })

      const newCategorias = prevCategorias
        .map((cat) => {
          // Se é a categoria a ser movida, remove da lista principal
          if (cat.id === categoriaId) {
            return null
          }

          // Se é a categoria pai que vai receber a subcategoria
          if (cat.id === parentId) {
            // Converte CategoriaComSubcategorias para Categoria (subcategoria não tem subcategorias)
            const novaSubcategoria: Categoria = {
              id: categoriaMovida.id,
              nome: categoriaMovida.nome,
              tipo: categoriaMovida.tipo,
              grupo: categoriaMovida.grupo,
              pai_id: parentId,
              icone: categoriaMovida.icone,
              cor: categoriaMovida.cor,
              ordem: categoriaMovida.ordem,
              ativa: categoriaMovida.ativa,
              is_sistema: categoriaMovida.is_sistema,
              usuario_id: categoriaMovida.usuario_id,
              created_at: categoriaMovida.created_at,
              updated_at: categoriaMovida.updated_at,
            }

            return {
              ...cat,
              subcategorias: [...cat.subcategorias, novaSubcategoria],
            }
          }

          // Remove a categoria das subcategorias de outras categorias (se estava lá)
          return {
            ...cat,
            subcategorias: cat.subcategorias.filter((sub) => sub.id !== categoriaId),
          }
        })
        .filter(Boolean) as CategoriaComSubcategorias[]

      console.log(
        '📊 Categorias depois:',
        newCategorias.map((c) => ({ id: c.id, nome: c.nome, subs: c.subcategorias.length }))
      )

      return newCategorias
    })
  }

  // Helper para update otimista: promover subcategoria a categoria principal
  const promoteToMainCategory = (categoriaId: string, currentParentId: string) => {
    console.log('⬆️ promoteToMainCategory:', { categoriaId, currentParentId })

    setCategorias((prevCategorias) => {
      console.log(
        '📊 Categorias antes:',
        prevCategorias.map((c) => ({ id: c.id, nome: c.nome, subs: c.subcategorias.length }))
      )

      let categoriaPromovida: Categoria | null = null

      const newCategorias = prevCategorias.map((cat) => {
        if (cat.id === currentParentId) {
          // Remove das subcategorias e guarda referência
          const subcategoriaRemovida = cat.subcategorias.find((sub) => sub.id === categoriaId)
          if (subcategoriaRemovida) {
            categoriaPromovida = {
              id: subcategoriaRemovida.id,
              nome: subcategoriaRemovida.nome,
              tipo: subcategoriaRemovida.tipo,
              grupo: subcategoriaRemovida.grupo,
              pai_id: undefined,
              icone: subcategoriaRemovida.icone,
              cor: subcategoriaRemovida.cor,
              ordem: subcategoriaRemovida.ordem,
              ativa: subcategoriaRemovida.ativa,
              is_sistema: subcategoriaRemovida.is_sistema,
              usuario_id: subcategoriaRemovida.usuario_id,
              created_at: subcategoriaRemovida.created_at,
              updated_at: subcategoriaRemovida.updated_at,
            }
            console.log('📦 Subcategoria encontrada:', {
              id: subcategoriaRemovida.id,
              nome: subcategoriaRemovida.nome,
            })
          }

          return {
            ...cat,
            subcategorias: cat.subcategorias.filter((sub) => sub.id !== categoriaId),
          }
        }
        return cat
      })

      // Adiciona a categoria promovida à lista principal
      if (categoriaPromovida !== null) {
        const catPromovida: Categoria = categoriaPromovida
        const novaCategoriaComSubs: CategoriaComSubcategorias = {
          id: catPromovida.id,
          nome: catPromovida.nome,
          tipo: catPromovida.tipo,
          grupo: catPromovida.grupo,
          pai_id: catPromovida.pai_id,
          icone: catPromovida.icone,
          cor: catPromovida.cor,
          ordem: catPromovida.ordem,
          ativa: catPromovida.ativa,
          is_sistema: catPromovida.is_sistema,
          usuario_id: catPromovida.usuario_id,
          created_at: catPromovida.created_at,
          updated_at: catPromovida.updated_at,
          subcategorias: [], // Nova categoria principal sem subcategorias
        }

        const result = [...newCategorias, novaCategoriaComSubs]
        console.log(
          '📊 Categorias depois:',
          result.map((c) => ({ id: c.id, nome: c.nome, subs: c.subcategorias.length }))
        )
        return result
      }

      console.warn('❌ Categoria promovida não encontrada')
      return newCategorias
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // Detecta se está arrastando sobre uma dropzone vazia
    const overIdStr = String(over.id)
    const isDropzone = overIdStr.startsWith('dropzone-')
    const dropzoneParentId = isDropzone ? overIdStr.replace('dropzone-', '') : null

    // Verifica se está arrastando sobre uma categoria (para virar subcategoria)
    let targetCategoria = categorias.find((c) => c.id === over.id)

    // Se está sobre uma dropzone, pega a categoria pai
    if (isDropzone && dropzoneParentId) {
      targetCategoria = categorias.find((c) => c.id === dropzoneParentId)
    }

    const sourceCategoria = categorias.find((c) => c.id === active.id)

    // Se não encontrou a categoria na lista principal, pode ser uma subcategoria
    let sourceSubcategoria: Categoria | undefined
    let sourceParentId: string | undefined
    if (!sourceCategoria) {
      for (const cat of categorias) {
        const sub = cat.subcategorias.find((s) => s.id === active.id)
        if (sub) {
          sourceSubcategoria = sub
          sourceParentId = cat.id
          break
        }
      }
    }

    const draggedItem = sourceCategoria || sourceSubcategoria

    // CASO 1: Arrastar subcategoria para área principal (remover pai)
    if (
      sourceSubcategoria &&
      sourceParentId &&
      targetCategoria &&
      !expandedIds.has(targetCategoria.id)
    ) {
      // Update otimista: atualiza UI imediatamente
      promoteToMainCategory(sourceSubcategoria.id, sourceParentId)

      const { categoriaService } = await import('@/lib/services/categoria.service')
      const { toast } = await import('sonner')

      try {
        // Atualiza no banco em background
        await categoriaService.updateCategoria(sourceSubcategoria.id, {
          pai_id: undefined,
        })

        toast.success(`"${sourceSubcategoria.nome}" agora é uma categoria principal`)
      } catch (error) {
        console.error('Erro ao mover categoria:', error)
        toast.error('Erro ao mover categoria. Recarregando...')
        // Se der erro, reverte carregando do banco
        setTimeout(() => window.location.reload(), 1500)
      }
      return
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
      sourceParentId !== targetCategoria.id

    if (shouldCreateSubcategory && targetCategoria && draggedItem) {
      // Update otimista: atualiza UI imediatamente
      moveToSubcategory(draggedItem.id, targetCategoria.id)

      const { categoriaService } = await import('@/lib/services/categoria.service')
      const { toast } = await import('sonner')

      try {
        // Atualiza no banco em background
        await categoriaService.updateCategoria(draggedItem.id, {
          pai_id: targetCategoria.id,
        })

        toast.success(`"${draggedItem.nome}" agora é subcategoria de "${targetCategoria.nome}"`)
      } catch (error) {
        console.error('Erro ao mover categoria:', error)
        toast.error('Erro ao mover categoria. Recarregando...')
        // Se der erro, reverte carregando do banco
        setTimeout(() => window.location.reload(), 1500)
      }
      return
    }

    // CASO 3: Reordenação normal entre categorias do mesmo nível
    const oldIndex = categorias.findIndex((c) => c.id === active.id)
    const newIndex = categorias.findIndex((c) => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Reordena localmente
    const newCategorias = arrayMove(categorias, oldIndex, newIndex)
    setCategorias(newCategorias)

    // Gera array de reordenação para o backend
    const reordenacao = newCategorias.map((cat, index) => ({
      id: cat.id,
      novaOrdem: index + 1,
    }))

    // Chama callback de reordenação
    onReorder?.(reordenacao)
  }

  if (categorias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">📁</div>
        <h3 className="font-semibold text-lg mb-2 text-white">Nenhuma categoria encontrada</h3>
        <p className="text-sm text-white/70 max-w-sm">
          Comece criando sua primeira categoria de receita ou despesa.
        </p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={[
          ...categorias.map((c) => c.id),
          // Adiciona IDs das subcategorias e drop zones vazias
          ...categorias.flatMap((c) => [
            ...c.subcategorias.map((sub) => sub.id),
            ...(expandedIds.has(c.id) && c.subcategorias.length === 0 ? [`dropzone-${c.id}`] : []),
          ]),
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
  )
}
