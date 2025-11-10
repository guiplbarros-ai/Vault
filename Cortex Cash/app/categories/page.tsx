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
import { CategoryAnalyticsDashboard } from "@/components/categories/category-analytics-dashboard"
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
  const [selectedCategoriaForAnalytics, setSelectedCategoriaForAnalytics] = useState<Categoria | undefined>()
  const [activeTab, setActiveTab] = useState<string>("plan")

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

  const handleViewAnalytics = (categoria: Categoria) => {
    setSelectedCategoriaForAnalytics(categoria)
    setActiveTab("analytics")
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

  // Agrupamentos para segregação visual
  const categoriasReceita = filteredCategorias.filter((c) => c.tipo === "receita")
  const categoriasDespesa = filteredCategorias.filter((c) => c.tipo === "despesa")
  const categoriasTransferencia = filteredCategorias.filter((c) => c.tipo === "transferencia")

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-12 w-12 mx-auto mb-4"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'transparent',
                borderBottomColor: '#3A8F6E',
              }}
            ></div>
            <p style={{ color: '#B2BDB9' }}>Carregando categorias...</p>
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
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            style={{
              backgroundColor: '#18332C',
              borderColor: '#2A4942',
              borderWidth: '1px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription style={{ color: '#B2BDB9' }}>Total de Categorias</CardDescription>
              <CardTitle className="text-3xl" style={{ color: '#F2F7F5' }}>{statsGeral.total}</CardTitle>
              <CardDescription className="text-sm mt-2" style={{ color: '#8CA39C' }}>
                {statsGeral.categorias} categorias • {statsGeral.subcategorias} subcategorias
              </CardDescription>
            </CardHeader>
          </Card>
          <Card
            style={{
              backgroundColor: '#18332C',
              borderColor: '#2A4942',
              borderWidth: '1px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription style={{ color: '#B2BDB9' }}>Categorias de Receita</CardDescription>
              <CardTitle className="text-3xl" style={{ color: '#6CCB8C' }}>
                {statsReceitas.total}
              </CardTitle>
              <CardDescription className="text-sm mt-2" style={{ color: '#8CA39C' }}>
                {statsReceitas.categorias} categorias • {statsReceitas.subcategorias} subcategorias
              </CardDescription>
            </CardHeader>
          </Card>
          <Card
            style={{
              backgroundColor: '#18332C',
              borderColor: '#2A4942',
              borderWidth: '1px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription style={{ color: '#B2BDB9' }}>Categorias de Despesa</CardDescription>
              <CardTitle className="text-3xl" style={{ color: '#F07167' }}>
                {statsDespesas.total}
              </CardTitle>
              <CardDescription className="text-sm mt-2" style={{ color: '#8CA39C' }}>
                {statsDespesas.categorias} categorias • {statsDespesas.subcategorias} subcategorias
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs para Plano de Contas e Análise de Gastos */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList
            className="grid w-full grid-cols-2"
            style={{
              backgroundColor: '#142A25',
              borderColor: '#2A4942',
            }}
          >
            <TabsTrigger
              value="plan"
              style={{
                color: '#B2BDB9',
              }}
              className="data-[state=active]:text-white"
              data-active={activeTab === 'plan'}
            >
              Plano de Contas
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              style={{
                color: '#B2BDB9',
              }}
              className="data-[state=active]:text-white"
              data-active={activeTab === 'analytics'}
            >
              Análise de Gastos
            </TabsTrigger>
          </TabsList>

          {/* Tab: Plano de Contas */}
          <TabsContent value="plan" className="space-y-4">
            <Card
              style={{
                backgroundColor: '#18332C',
                borderColor: '#2A4942',
                borderWidth: '1px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-1)',
              }}
            >
              <CardHeader>
                <CardTitle style={{ color: '#F2F7F5' }}>Plano de Contas</CardTitle>
                <CardDescription style={{ color: '#B2BDB9' }}>
                  Clique em uma categoria para selecioná-la ou use o menu para ações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#8CA39C' }} />
                <Input
                  placeholder="Buscar categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  style={{
                    backgroundColor: '#142A25',
                    borderColor: '#2A4942',
                    color: '#F2F7F5',
                    height: '40px'
                  }}
                />
              </div>
              <Select
                value={tipoFiltro}
                onValueChange={(v) => setTipoFiltro(v as TipoTransacao | "todas")}
              >
                <SelectTrigger
                  className="w-full sm:w-[180px]"
                  style={{
                    backgroundColor: '#142A25',
                    borderColor: '#2A4942',
                    color: '#F2F7F5',
                    height: '40px'
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  style={{
                    backgroundColor: '#142A25',
                    borderColor: '#2A4942'
                  }}
                >
                  <SelectItem value="todas" style={{ color: '#F2F7F5' }}>Todas</SelectItem>
                  <SelectItem value="receita" style={{ color: '#F2F7F5' }}>Receitas</SelectItem>
                  <SelectItem value="despesa" style={{ color: '#F2F7F5' }}>Despesas</SelectItem>
                  <SelectItem value="transferencia" style={{ color: '#F2F7F5' }}>Transferências</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreate}
                className="w-full sm:w-auto"
                style={{
                  backgroundColor: '#3A8F6E',
                  color: '#F2F7F5',
                  height: '40px'
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Categoria
              </Button>
            </div>

            {/* Segregação visual: Receitas vs Despesas */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Coluna esquerda: Receitas em cima, Transferências embaixo */}
              <div className="space-y-6">
                {/* Receitas */}
                {categoriasReceita.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium uppercase tracking-wider" style={{ color: '#6CCB8C' }}>
                        Receitas
                      </h3>
                      <span className="text-xs" style={{ color: '#8CA39C' }}>
                        {categoriasReceita.length} categorias
                      </span>
                    </div>
                    <div
                      className="rounded-lg border"
                      style={{
                        borderColor: '#2A4942',
                        backgroundColor: '#142A25',
                      }}
                    >
                      <div className="p-2">
                        <SortableCategoryTree
                          categorias={categoriasReceita}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMerge={handleMerge}
                          onAddSubcategoria={handleAddSubcategoria}
                          onSelect={(cat) => setSelectedCategoriaId(cat.id)}
                          selectedId={selectedCategoriaId}
                          onReorder={handleReorder}
                          onViewAnalytics={handleViewAnalytics}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Transferências */}
                {categoriasTransferencia.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium uppercase tracking-wider" style={{ color: '#8FCDBD' }}>
                        Transferências
                      </h3>
                      <span className="text-xs" style={{ color: '#8CA39C' }}>
                        {categoriasTransferencia.length} categorias
                      </span>
                    </div>
                    <div
                      className="rounded-lg border"
                      style={{
                        borderColor: '#2A4942',
                        backgroundColor: '#142A25',
                      }}
                    >
                      <div className="p-2">
                        <SortableCategoryTree
                          categorias={categoriasTransferencia}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMerge={handleMerge}
                          onAddSubcategoria={handleAddSubcategoria}
                          onSelect={(cat) => setSelectedCategoriaId(cat.id)}
                          selectedId={selectedCategoriaId}
                          onReorder={handleReorder}
                          onViewAnalytics={handleViewAnalytics}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna direita: Despesas */}
              <div>
                {categoriasDespesa.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium uppercase tracking-wider" style={{ color: '#F07167' }}>
                        Despesas
                      </h3>
                      <span className="text-xs" style={{ color: '#8CA39C' }}>
                        {categoriasDespesa.length} categorias
                      </span>
                    </div>
                    <div
                      className="rounded-lg border"
                      style={{
                        borderColor: '#2A4942',
                        backgroundColor: '#142A25',
                      }}
                    >
                      <div className="p-2">
                        <SortableCategoryTree
                          categorias={categoriasDespesa}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMerge={handleMerge}
                          onAddSubcategoria={handleAddSubcategoria}
                          onSelect={(cat) => setSelectedCategoriaId(cat.id)}
                          selectedId={selectedCategoriaId}
                          onReorder={handleReorder}
                          onViewAnalytics={handleViewAnalytics}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Tab: Análise de Gastos */}
          <TabsContent value="analytics" className="space-y-4">
            <CategoryAnalyticsDashboard
              selectedCategoriaId={selectedCategoriaForAnalytics?.id}
              selectedCategoria={selectedCategoriaForAnalytics}
              onCategorySelect={(cat) => setSelectedCategoriaForAnalytics(cat)}
              onClearSelection={() => setSelectedCategoriaForAnalytics(undefined)}
            />
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: '#18332C',
              borderColor: '#2A4942',
              borderWidth: '1px',
              boxShadow: 'var(--shadow-2)',
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#F2F7F5' }}>
                {dialogMode === "create" && "Nova Categoria"}
                {dialogMode === "edit" && "Editar Categoria"}
                {dialogMode === "subcategoria" && "Nova Subcategoria"}
              </DialogTitle>
              <DialogDescription style={{ color: '#B2BDB9' }}>
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
          <AlertDialogContent
            style={{
              backgroundColor: '#18332C',
              borderColor: '#2A4942',
              borderWidth: '1px',
              boxShadow: 'var(--shadow-2)',
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: '#F2F7F5' }}>Desativar Categoria</AlertDialogTitle>
              <AlertDialogDescription style={{ color: '#B2BDB9' }}>
                Tem certeza que deseja desativar a categoria{" "}
                <strong>{categoriaParaDeletar?.nome}</strong>? As transações
                associadas não serão excluídas, mas ficarão sem categoria. Esta
                ação pode ser revertida reativando a categoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel style={{ color: '#F2F7F5' }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                style={{
                  backgroundColor: '#F07167',
                  color: '#F2F7F5',
                }}
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
