'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, FolderOpen } from 'lucide-react'
import type { Categoria } from '@/lib/hooks/use-categorias'

interface CategoriasListProps {
  categoriasPorGrupo: Record<string, Categoria[]>
  onEdit: (categoria: Categoria) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, ativa: boolean) => void
}

export function CategoriasList({
  categoriasPorGrupo,
  onEdit,
  onDelete,
  onToggleActive,
}: CategoriasListProps) {
  const grupos = Object.keys(categoriasPorGrupo).sort()

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line/25 bg-surface p-12 text-center">
        <FolderOpen className="mb-4 h-12 w-12 text-muted" />
        <h3 className="mb-2 text-lg font-semibold text-text">Nenhuma categoria encontrada</h3>
        <p className="text-muted">
          Crie sua primeira categoria para começar a organizar suas transações.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => (
        <div key={grupo} className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-muted" />
            <h3 className="text-lg font-semibold text-text">{grupo}</h3>
            <Badge variant="neutral">{categoriasPorGrupo[grupo].length}</Badge>
          </div>

          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {categoriasPorGrupo[grupo].map((categoria) => (
              <div
                key={categoria.id}
                className="flex items-center justify-between rounded-2xl border border-line/25 bg-surface p-3"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleActive(categoria.id, !categoria.ativa)}
                    className={`h-4 w-4 rounded border-2 transition-colors ${
                      categoria.ativa
                        ? 'border-success bg-success'
                        : 'border-line/25 bg-transparent'
                    }`}
                  >
                    {categoria.ativa && (
                      <svg
                        className="h-full w-full text-white"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M13 4L6 11L3 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`font-medium ${
                      !categoria.ativa ? 'text-muted line-through' : 'text-text'
                    }`}
                  >
                    {categoria.nome}
                  </span>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(categoria)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir "${categoria.nome}"?`)) {
                        onDelete(categoria.id)
                      }
                    }}
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
