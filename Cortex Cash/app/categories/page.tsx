'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, MoreHorizontal, Pencil, Trash2, Tag, ChevronRight, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { cn } from "@/lib/utils"
import { CategoryForm } from "@/components/forms"
import type { CategoryFormData } from "@/lib/validations"
import { categoriaService } from "@/lib/services/categoria.service"
import { mapFormDataToCreateCategoria, mapDBCategoryTypeToFormType } from "@/lib/adapters"
import type { Categoria } from "@/lib/types"
import { toast } from "sonner"

export default function CategoriesPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadCategorias()
  }, [])

  const loadCategorias = async () => {
    try {
      setLoading(true)
      const data = await categoriaService.listCategorias()
      setCategorias(data)
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      toast.error('Erro ao carregar categorias', {
        description: 'Não foi possível carregar as categorias. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      await categoriaService.deleteCategoria(categoryToDelete)
      await loadCategorias()
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      toast.success('Categoria excluída', {
        description: 'A categoria foi excluída com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      toast.error('Erro ao excluir categoria', {
        description: 'Não foi possível excluir a categoria. Tente novamente.',
      })
    }
  }

  const handleSubmit = async (data: CategoryFormData) => {
    setFormLoading(true)
    try {
      const dto = mapFormDataToCreateCategoria(data)
      await categoriaService.createCategoria(dto)
      await loadCategorias()
      setFormDialogOpen(false)
      toast.success('Categoria criada', {
        description: 'A categoria foi criada com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      toast.error('Erro ao criar categoria', {
        description: 'Não foi possível criar a categoria. Verifique os dados e tente novamente.',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Organiza categorias em hierarquia (principais e filhas)
  const getHierarchicalCategories = (tipo: 'receita' | 'despesa') => {
    const categoriesOfType = categorias.filter(c => c.tipo === tipo && c.ativa)
    const mainCategories = categoriesOfType.filter(c => !c.grupo)

    return mainCategories.map(main => ({
      ...main,
      children: categoriesOfType.filter(c => c.grupo === main.nome),
    }))
  }

  const incomeCategories = categorias.filter(c => c.tipo === 'receita' && c.ativa)
  const expenseCategories = categorias.filter(c => c.tipo === 'despesa' && c.ativa)
  const hierarchicalIncome = getHierarchicalCategories('receita')
  const hierarchicalExpense = getHierarchicalCategories('despesa')

  const CategoryCard = ({ category, isSubcategory = false }: { category: Categoria & { children?: Categoria[] }; isSubcategory?: boolean }) => (
    <Card className={cn("relative overflow-hidden", isSubcategory && "ml-8")}>
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: category.cor || '#3B82F6' }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${category.cor || '#3B82F6'}20` }}
            >
              <Tag className="h-5 w-5" style={{ color: category.cor || '#3B82F6' }} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {category.nome}
                {category.children && category.children.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {category.children.length} subcategorias
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Categoria {category.tipo === 'receita' ? 'de receita' : 'de despesa'}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isSubcategory && (
                <>
                  <DropdownMenuItem>
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Adicionar Subcategoria
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setCategoryToDelete(category.id)
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <Badge variant={category.tipo === 'receita' ? 'default' : 'secondary'}>
            {category.tipo === 'receita' ? (
              <><ArrowUpCircle className="mr-1 h-3 w-3" /> Receita</>
            ) : (
              <><ArrowDownCircle className="mr-1 h-3 w-3" /> Despesa</>
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )

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
            <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Categoria</DialogTitle>
                  <DialogDescription>
                    Crie uma nova categoria para organizar suas transações.
                  </DialogDescription>
                </DialogHeader>
                <CategoryForm
                  onSubmit={handleSubmit}
                  onCancel={() => setFormDialogOpen(false)}
                  isLoading={formLoading}
                  submitLabel="Criar Categoria"
                />
              </DialogContent>
            </Dialog>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Categorias</CardDescription>
              <CardTitle className="text-3xl">
                {incomeCategories.length + expenseCategories.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Categorias de Receita</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {incomeCategories.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Categorias de Despesa</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {expenseCategories.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Categories Tabs */}
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="income">Receitas</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4 mt-6">
            {hierarchicalExpense.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma categoria de despesa cadastrada
                </CardContent>
              </Card>
            ) : (
              hierarchicalExpense.map((category) => (
                <div key={category.id} className="space-y-4">
                  <CategoryCard category={category} />
                  {category.children && category.children.map((subcategory) => (
                    <CategoryCard key={subcategory.id} category={subcategory} isSubcategory />
                  ))}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="income" className="space-y-4 mt-6">
            {hierarchicalIncome.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma categoria de receita cadastrada
                </CardContent>
              </Card>
            ) : (
              hierarchicalIncome.map((category) => (
                <div key={category.id} className="space-y-4">
                  <CategoryCard category={category} />
                  {category.children && category.children.map((subcategory) => (
                    <CategoryCard key={subcategory.id} category={subcategory} isSubcategory />
                  ))}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Categoria"
          description="Tem certeza que deseja excluir esta categoria? As transações associadas não serão excluídas, mas ficarão sem categoria. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  )
}
