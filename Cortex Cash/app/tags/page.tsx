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
import { Plus, Hash } from "lucide-react"
import { TagBadge } from "@/components/ui/tag-badge"
import { TagForm } from "@/components/forms/tag-form"
import { tagService } from "@/lib/services/tag.service"
import type { Tag } from "@/lib/types"
import { toast } from "sonner"

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [tipoFiltro, setTipoFiltro] = useState<'todas' | 'sistema' | 'customizada'>('todas')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [tagEditando, setTagEditando] = useState<Tag | undefined>()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tagParaDeletar, setTagParaDeletar] = useState<Tag | undefined>()

  const [tagUsage, setTagUsage] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      setLoading(true)
      const tagsData = await tagService.listTags({ sortBy: 'nome' })
      setTags(tagsData)
      setFilteredTags(tagsData)

      // Carregar contagens de uso
      const usageMap = new Map<string, number>()
      for (const tag of tagsData) {
        const count = await tagService.contarTransacoesPorTag(tag.nome)
        usageMap.set(tag.id, count)
      }
      setTagUsage(usageMap)
    } catch (error) {
      console.error('Erro ao carregar tags:', error)
      toast.error('Erro ao carregar tags')
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros
  useEffect(() => {
    let filtered = tags

    // Filtrar por tipo
    if (tipoFiltro !== 'todas') {
      filtered = filtered.filter((t) => t.tipo === tipoFiltro)
    }

    setFilteredTags(filtered)
  }, [tags, tipoFiltro])

  const handleCreate = () => {
    setDialogMode("create")
    setTagEditando(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (tag: Tag) => {
    if (tag.tipo === 'sistema') {
      toast.error('Tags do sistema não podem ser editadas')
      return
    }
    setDialogMode("edit")
    setTagEditando(tag)
    setDialogOpen(true)
  }

  const handleDelete = (tag: Tag) => {
    if (tag.tipo === 'sistema') {
      toast.error('Tags do sistema não podem ser deletadas')
      return
    }
    setTagParaDeletar(tag)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!tagParaDeletar) return

    try {
      await tagService.deleteTag(tagParaDeletar.id)
      toast.success("Tag deletada com sucesso")
      await loadTags()
      setDeleteDialogOpen(false)
      setTagParaDeletar(undefined)
    } catch (error) {
      toast.error("Erro ao deletar tag")
      console.error(error)
    }
  }

  const handleFormSubmit = async (data: { nome: string; cor?: string }) => {
    try {
      if (dialogMode === "edit" && tagEditando) {
        await tagService.updateTag(tagEditando.id, data)
        toast.success("Tag atualizada com sucesso")
      } else {
        await tagService.createTag({ ...data, tipo: 'customizada' })
        toast.success("Tag criada com sucesso")
      }

      await loadTags()
      setDialogOpen(false)
      setTagEditando(undefined)
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar tag")
      throw error
    }
  }

  const totalTags = tags.length
  const totalSistema = tags.filter((t) => t.tipo === 'sistema').length
  const totalCustomizadas = tags.filter((t) => t.tipo === 'customizada').length

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando tags...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Tags"
          description="Gerencie tags para organizar e filtrar suas transações"
          actions={
            <Button
              onClick={handleCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Tag
            </Button>
          }
        />

        {/* Stats Cards - TEMA.md: KPI com shadow-2 e ícone em pill 36px */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-border shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <Hash className="h-4 w-4 text-primary" />
                </div>
                <CardDescription className="text-muted-foreground text-sm">Total de Tags</CardDescription>
              </div>
              <CardTitle className="text-3xl font-bold text-foreground">{totalTags}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card border-border shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <Hash className="h-4 w-4 text-secondary" />
                </div>
                <CardDescription className="text-muted-foreground text-sm">Tags do Sistema</CardDescription>
              </div>
              <CardTitle className="text-3xl font-bold text-secondary">
                {totalSistema}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card border-border shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <Hash className="h-4 w-4 text-gold" />
                </div>
                <CardDescription className="text-muted-foreground text-sm">Tags Customizadas</CardDescription>
              </div>
              <CardTitle className="text-3xl font-bold text-gold">
                {totalCustomizadas}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tags Grid */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-foreground">Lista de Tags</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Clique em uma tag para editá-la (apenas tags customizadas)
                </CardDescription>
              </div>
              <Tabs value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as any)} className="w-auto">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="todas">
                    Todas
                  </TabsTrigger>
                  <TabsTrigger value="sistema">
                    Sistema
                  </TabsTrigger>
                  <TabsTrigger value="customizada">
                    Customizadas
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Hash className="h-12 w-12 mb-4 text-secondary" />
                <h3 className="font-semibold text-lg mb-2 text-foreground">Nenhuma tag encontrada</h3>
                <p className="text-sm max-w-sm text-muted-foreground">
                  Crie sua primeira tag customizada para organizar suas transações.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTags.map((tag) => {
                  const usage = tagUsage.get(tag.id) || 0
                  const isSistema = tag.tipo === 'sistema'

                  return (
                    <Card
                      key={tag.id}
                      className={`cursor-pointer transition-all hover:shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)] bg-card border-border ${
                        isSistema ? '' : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleEdit(tag)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <TagBadge
                              label={tag.nome}
                              cor={tag.cor}
                              size="sm"
                            />
                            {isSistema && (
                              <span className="text-xs px-2 py-0.5 rounded-full border bg-secondary/20 text-secondary border-secondary/30">
                                Sistema
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {usage} {usage === 1 ? 'transação' : 'transações'}
                          </div>
                          {!isSistema && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs w-full mt-1 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(tag)
                              }}
                            >
                              Deletar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {dialogMode === "create" ? "Nova Tag" : "Editar Tag"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {dialogMode === "create"
                  ? "Crie uma nova tag customizada para organizar suas transações."
                  : "Atualize as informações da tag."}
              </DialogDescription>
            </DialogHeader>
            <TagForm
              tag={tagEditando}
              onSubmit={handleFormSubmit}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Deletar Tag</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Tem certeza que deseja deletar a tag{" "}
                <strong className="text-foreground">{tagParaDeletar?.nome}</strong>? Esta tag será removida
                de todas as transações associadas. Esta ação não pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-muted border-border text-foreground">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-[#0E0E0E]"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
