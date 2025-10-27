'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, FolderClosed } from 'lucide-react'
import { useCategorias } from '@/lib/hooks/use-categorias'
import {
  useCreateCategoria,
  useUpdateCategoria,
  useDeleteCategoria,
} from '@/lib/hooks/use-categoria-mutations'
import { CategoriaDialog } from '@/components/categorias/categoria-dialog'
import { CategoriasList } from '@/components/categorias/categorias-list'
import type { Categoria } from '@/lib/hooks/use-categorias'

export default function CategoriasPage() {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  // Fetch categorias
  const { data: categorias = [], isLoading } = useCategorias(!showInactive)

  // Mutations
  const createMutation = useCreateCategoria()
  const updateMutation = useUpdateCategoria()
  const deleteMutation = useDeleteCategoria()

  // Get unique grupos
  const grupos = useMemo(() => {
    return [...new Set(categorias.map((c) => c.grupo))].sort()
  }, [categorias])

  // Filter categorias
  const filteredCategorias = useMemo(() => {
    if (!search) return categorias

    const searchLower = search.toLowerCase()
    return categorias.filter(
      (c) =>
        c.nome.toLowerCase().includes(searchLower) ||
        c.grupo.toLowerCase().includes(searchLower)
    )
  }, [categorias, search])

  // Group categorias
  const categoriasPorGrupo = useMemo(() => {
    return filteredCategorias.reduce((acc, cat) => {
      if (!acc[cat.grupo]) {
        acc[cat.grupo] = []
      }
      acc[cat.grupo].push(cat)
      return acc
    }, {} as Record<string, Categoria[]>)
  }, [filteredCategorias])

  const handleCreate = () => {
    setSelectedCategoria(null)
    setDialogOpen(true)
  }

  const handleEdit = (categoria: Categoria) => {
    setSelectedCategoria(categoria)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: { nome: string; grupo: string; ativa: boolean }) => {
    try {
      if (selectedCategoria) {
        await updateMutation.mutateAsync({
          id: selectedCategoria.id,
          ...data,
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      setDialogOpen(false)
      setSelectedCategoria(null)
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      alert('Erro ao salvar categoria. Tente novamente.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {
      console.error('Erro ao deletar categoria:', error)
      alert('Erro ao deletar categoria. Pode haver transações usando esta categoria.')
    }
  }

  const handleToggleActive = async (id: string, ativa: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, ativa })
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error)
      alert('Erro ao atualizar categoria. Tente novamente.')
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section card bg-hero-gadsden flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-sm text-muted">Gerencie e organize suas transações</p>
        </div>
        <Button onClick={handleCreate} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Stats */}
      <div className="section grid gap-4 md:grid-cols-3">
        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted">Total de Categorias</CardTitle>
            <FolderClosed className="h-4 w-4 text-muted" />
          </CardHeader>
          <CardContent>
            <div className="kpi">{categorias.length}</div>
            <p className="text-xs text-muted">
              {categorias.filter((c) => c.ativa).length} ativas
            </p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted">Grupos</CardTitle>
            <FolderClosed className="h-4 w-4 text-muted" />
          </CardHeader>
          <CardContent>
            <div className="kpi">{grupos.length}</div>
            <p className="text-xs text-muted">grupos diferentes</p>
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted">Filtro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <label htmlFor="showInactive" className="cursor-pointer text-sm">
                Mostrar inativas
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="section relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Buscar por nome ou grupo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      <Card className="card">
        <CardHeader>
          <CardTitle>Categorias por Grupo</CardTitle>
          <CardDescription>
            Clique no checkbox para ativar/desativar uma categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <CategoriasList
              categoriasPorGrupo={categoriasPorGrupo}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <CategoriaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categoria={selectedCategoria}
        grupos={grupos}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
}
