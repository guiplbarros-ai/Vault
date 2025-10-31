'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Download, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategoryTree } from "@/components/categories/category-tree"
import { SortableCategoryTree } from "@/components/categories/sortable-category-tree"
import { CategoryForm } from "@/components/categories/category-form"
import { CategoryMergeDialog } from "@/components/categories/category-merge-dialog"
import { categoriaService, CategoriaComSubcategorias } from "@/lib/services/categoria.service"
import type { Categoria, TipoTransacao } from "@/lib/types"
import { toast } from "sonner"

export default function CategoriesPage() {
  const [categorias, setCategorias] = useState<CategoriaComSubcategorias[]>([])
  const [filteredCategorias, setFilteredCategorias] = useState<CategoriaComSubcategorias[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState<TipoTransacao | "todas">("todas")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "subcategoria">("create")
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | undefined>()
  const [categoriaPai, setCategoriaPai] = useState<Categoria | undefined>()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoriaParaDeletar, setCategoriaParaDeletar] = useState<Categoria | undefined>()

  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [categoriaParaMesclar, setCategoriaParaMesclar] = useState<Categoria | undefined>()

  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>()

  useEffect(() => {
    loadCategorias()
  }, [])

  const loadCategorias = async () => {
    try {
      setLoading(true)
      const arvore = await categoriaService.getArvoreHierarquica()
      setCategorias(arvore)
      setFilteredCategorias(arvore)
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      toast.error('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros
  useEffect(() => {
    let filtered = categorias

    // Filtrar por tipo
    if (tipoFiltro !== "todas") {
      filtered = filtered.filter((c) => c.tipo === tipoFiltro)
    }

    // Filtrar por busca
    if (searchTerm) {
      const termo = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          c.subcategorias.some((sub) => sub.nome.toLowerCase().includes(termo))
      )
    }

    setFilteredCategorias(filtered)
  }, [categorias, tipoFiltro, searchTerm])

  const handleCreate = () => {
    setDialogMode("create")
    setCategoriaEditando(undefined)
    setCategoriaPai(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (categoria: Categoria) => {
    setDialogMode("edit")
    setCategoriaEditando(categoria)
    setCategoriaPai(undefined)
    setDialogOpen(true)
  }

  const handleAddSubcategoria = (categoriaPai: Categoria) => {
    setDialogMode("subcategoria")
    setCategoriaEditando(undefined)
    setCategoriaPai(categoriaPai)
    setDialogOpen(true)
  }

  const handleDelete = (categoria: Categoria) => {
    setCategoriaParaDeletar(categoria)
    setDeleteDialogOpen(true)
  }

  const handleMerge = (categoria: Categoria) => {
    setCategoriaParaMesclar(categoria)
    setMergeDialogOpen(true)
  }

  const handleReorder = async (reordenacao: { id: string; novaOrdem: number }[]) => {
    try {
      await categoriaService.reordenarCategorias(reordenacao)
      toast.success("Ordem atualizada com sucesso")
      // Recarrega para refletir nova ordem
      await loadCategorias()
    } catch (error) {
      toast.error("Erro ao reordenar categorias")
      console.error(error)
    }
  }

  const confirmDelete = async () => {
    if (!categoriaParaDeletar) return

    try {
      await categoriaService.deleteCategoria(categoriaParaDeletar.id)
      toast.success("Categoria desativada com sucesso")
      await loadCategorias()
      setDeleteDialogOpen(false)
      setCategoriaParaDeletar(undefined)
    } catch (error) {
      toast.error("Erro ao desativar categoria")
      console.error(error)
    }
  }

  const handleFormSubmit = async (data: {
    nome: string
    tipo: TipoTransacao
    grupo?: string
    pai_id?: string
    icone?: string
    cor?: string
  }) => {
    if (dialogMode === "edit" && categoriaEditando) {
      await categoriaService.updateCategoria(categoriaEditando.id, data)
    } else {
      await categoriaService.createCategoria(data)
    }

    await loadCategorias()
    setDialogOpen(false)
    setCategoriaEditando(undefined)
    setCategoriaPai(undefined)
  }

  const handleExport = async () => {
    try {
      const csv = await categoriaService.exportarPlanoDeContas()
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `plano-de-contas-${new Date().toISOString().split("T")[0]}.csv`
      link.click()
      toast.success("Plano de contas exportado!")
    } catch (error) {
      toast.error("Erro ao exportar")
      console.error(error)
    }
  }

  // Contar categorias e subcategorias ativas
  const countCategories = (cats: CategoriaComSubcategorias[]) => {
    let totalCategorias = 0
    let totalSubcategorias = 0

    cats.forEach((cat) => {
      if (cat.ativa) {
        totalCategorias++
        const subsAtivas = cat.subcategorias.filter((sub) => sub.ativa).length
        totalSubcategorias += subsAtivas
      }
    })

    return { categorias: totalCategorias, subcategorias: totalSubcategorias, total: totalCategorias + totalSubcategorias }
  }

  const statsGeral = countCategories(categorias)
  const statsReceitas = countCategories(categorias.filter((c) => c.tipo === "receita"))
  const statsDespesas = countCategories(categorias.filter((c) => c.tipo === "despesa"))

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando categorias...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Categorias"
          description="Organize suas transações em categorias e subcategorias"
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                className="border-0 text-white"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#ffffff'
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button
                onClick={handleCreate}
                className="text-white"
                style={{
                  backgroundColor: '#18B0A4',
                  color: '#ffffff'
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Categoria
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Total de Categorias</CardDescription>
              <CardTitle className="text-3xl text-white">{statsGeral.total}</CardTitle>
              <CardDescription className="text-white/60 text-sm mt-2">
                {statsGeral.categorias} categorias • {statsGeral.subcategorias} subcategorias
              </CardDescription>
            </CardHeader>
          </Card>
          <Card style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Categorias de Receita</CardDescription>
              <CardTitle className="text-3xl text-green-400">
                {statsReceitas.total}
              </CardTitle>
              <CardDescription className="text-green-300/70 text-sm mt-2">
                {statsReceitas.categorias} categorias • {statsReceitas.subcategorias} subcategorias
              </CardDescription>
            </CardHeader>
          </Card>
          <Card style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Categorias de Despesa</CardDescription>
              <CardTitle className="text-3xl text-red-400">
                {statsDespesas.total}
              </CardTitle>
              <CardDescription className="text-red-300/70 text-sm mt-2">
                {statsDespesas.categorias} categorias • {statsDespesas.subcategorias} subcategorias
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Categories Tree with Search and Filters */}
        <Card style={{
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563'
        }}>
          <CardHeader>
            <CardTitle className="text-white">Plano de Contas</CardTitle>
            <CardDescription className="text-white/70">
              Clique em uma categoria para selecioná-la ou use o menu para ações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  placeholder="Buscar categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 border-0 text-white placeholder:text-white/50"
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    height: '40px'
                  }}
                />
              </div>
              <Select
                value={tipoFiltro}
                onValueChange={(v) => setTipoFiltro(v as TipoTransacao | "todas")}
              >
                <SelectTrigger
                  className="w-full sm:w-[180px] border-0 text-white"
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    height: '40px'
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  style={{
                    backgroundColor: '#1f2937',
                    borderColor: '#374151'
                  }}
                >
                  <SelectItem value="todas" className="text-white hover:!bg-gray-700" style={{ color: '#ffffff' }}>Todas</SelectItem>
                  <SelectItem value="receita" className="text-white hover:!bg-gray-700" style={{ color: '#ffffff' }}>Receitas</SelectItem>
                  <SelectItem value="despesa" className="text-white hover:!bg-gray-700" style={{ color: '#ffffff' }}>Despesas</SelectItem>
                  <SelectItem value="transferencia" className="text-white hover:!bg-gray-700" style={{ color: '#ffffff' }}>Transferências</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Tree */}
            <SortableCategoryTree
              categorias={filteredCategorias}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMerge={handleMerge}
              onAddSubcategoria={handleAddSubcategoria}
              onSelect={(cat) => setSelectedCategoriaId(cat.id)}
              selectedId={selectedCategoriaId}
              onReorder={handleReorder}
            />
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#3B5563]">
            <DialogHeader>
              <DialogTitle className="text-white">
                {dialogMode === "create" && "Nova Categoria"}
                {dialogMode === "edit" && "Editar Categoria"}
                {dialogMode === "subcategoria" && "Nova Subcategoria"}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                {dialogMode === "create" &&
                  "Crie uma nova categoria para organizar suas transações."}
                {dialogMode === "edit" &&
                  "Atualize as informações da categoria."}
                {dialogMode === "subcategoria" &&
                  `Adicione uma subcategoria em ${categoriaPai?.nome}.`}
              </DialogDescription>
            </DialogHeader>
            <CategoryForm
              categoria={categoriaEditando}
              categoriaPai={categoriaPai}
              onSubmit={handleFormSubmit}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar Categoria</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja desativar a categoria{" "}
                <strong>{categoriaParaDeletar?.nome}</strong>? As transações
                associadas não serão excluídas, mas ficarão sem categoria. Esta
                ação pode ser revertida reativando a categoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Merge Dialog */}
        <CategoryMergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          categoriaOrigem={categoriaParaMesclar}
          todasCategorias={categorias.flatMap(c => [c, ...c.subcategorias])}
          onSuccess={loadCategorias}
        />
      </div>
    </DashboardLayout>
  )
}
