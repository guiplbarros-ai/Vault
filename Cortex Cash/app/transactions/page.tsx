'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { DateRange as DR } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { DataTable, DataTableColumn } from "@/components/data-table"
import { DataTableToolbar } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, ArrowUpCircle, ArrowDownCircle, MoreHorizontal, Pencil, Trash2, Calendar, Eye, Check, Brain } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { TransactionForm, TransactionFormProps } from "@/components/forms"
import { BulkCategoryAssign } from "@/components/categories/bulk-category-assign"
import { BulkAIClassify } from "@/components/classification/bulk-ai-classify"
import { ClassifyButton } from "@/components/classification/classify-button"
import { MonthPicker } from "@/components/ui/month-picker"
import { startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns'
import { TagBadge } from "@/components/ui/tag-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import type { TransactionFormData } from "@/lib/validations"
import { transacaoService } from "@/lib/services/transacao.service"
import { tagService } from "@/lib/services/tag.service"
import { categoriaService } from "@/lib/services/categoria.service"
import { contaService } from "@/lib/services/conta.service"
import { mapFormDataToDTO, mapDBTypeToFormType } from "@/lib/adapters"
import type { Transacao, Tag, Categoria, Conta } from "@/lib/types"
import { toast } from "sonner"
import { isDuplicate } from "@/lib/import/dedupe"
import { cn } from "@/lib/utils"
import { ClassificationRules } from "@/components/import/classification-rules"
import { RuleAssistant } from "@/components/classification/rule-assistant"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ImportWizard } from "@/components/import/import-wizard"
import { brandNavyAlpha } from "@/lib/constants/colors"

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<'filters' | 'ai' | 'import'>('filters')
  const [transactions, setTransactions] = useState<Transacao[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transacao[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DR>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [transactionToEdit, setTransactionToEdit] = useState<Transacao | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [transactionToView, setTransactionToView] = useState<Transacao | null>(null)
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([])

  // Modo claro removido: app opera somente em visual padrão (verde escuro)

  // Carrega transações, tags, categorias e contas do banco (limitando por período selecionado)
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const from = dateRange?.from ? new Date(dateRange.from) : startOfMonth(new Date())
        const to = dateRange?.to ? new Date(dateRange.to) : endOfMonth(new Date())
        const [transacoesData, tagsData, categoriasData, contasData] = await Promise.all([
          transacaoService.listTransacoes({ dataInicio: from, dataFim: to }),
          tagService.listTags(),
          categoriaService.listCategorias({ ativas: true }),
          contaService.listContas({ incluirInativas: false }),
        ])
        setTransactions(transacoesData)
        setTags(tagsData)
        setCategorias(categoriasData)
        setContas(contasData)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        toast.error('Erro ao carregar dados', {
          description: 'Não foi possível carregar as informações. Tente novamente.',
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [dateRange])

  const loadTransactions = async () => {
    try {
      const from = dateRange?.from ? new Date(dateRange.from) : startOfMonth(new Date())
      const to = dateRange?.to ? new Date(dateRange.to) : endOfMonth(new Date())
      const data = await transacaoService.listTransacoes({ dataInicio: from, dataFim: to })
      setTransactions(data)
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
      toast.error('Erro ao carregar transações', {
        description: 'Não foi possível carregar as transações. Tente novamente.',
      })
    }
  }

  // Helper para obter Tag object por nome
  const getTagByName = (tagName: string): Tag | undefined => {
    return tags.find((t) => t.nome === tagName)
  }

  // Helper para obter Categoria por ID
  const getCategoriaById = (categoriaId: string): Categoria | undefined => {
    return categorias.find((c) => c.id === categoriaId)
  }

  // Helper para obter Conta por ID
  const getContaById = (contaId: string): Conta | undefined => {
    return contas.find((c) => c.id === contaId)
  }

  // Filtrar transações por tags, categorias, subcategorias e período
  useEffect(() => {
    let filtered = transactions

    // Filtro por período (dateRange)
    const start = dateRange?.from ? new Date(dateRange.from) : undefined
    const end = dateRange?.to ? new Date(dateRange.to) : undefined
    filtered = filtered.filter((t) => {
      const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
      if (start && transactionDate < start) return false
      if (end) {
        // incluir final do dia
        const endOfDay = new Date(end)
        endOfDay.setHours(23, 59, 59, 999)
        if (transactionDate > endOfDay) return false
      }
      return true
    })

    // Filtro por tag selecionada
    if (selectedTag && selectedTag !== 'all') {
      filtered = filtered.filter((t) => {
        if (!t.tags) return false
        const tagArray = typeof t.tags === 'string' ? (() => { try { return JSON.parse(t.tags) } catch { return [] } })() : t.tags
        return Array.isArray(tagArray) && tagArray.includes(selectedTag)
      })
    }

    // Filtro por categoria selecionada (categoria pai)
    if (selectedCategory && selectedCategory !== 'all') {
      const categoriaById = new Map(categorias.map(c => [c.id, c]))
      filtered = filtered.filter((t) => {
        if (!t.categoria_id) return false
        const cat = categoriaById.get(t.categoria_id)
        if (!cat) return false
        // Se a transação já está na categoria pai selecionada
        if (t.categoria_id === selectedCategory) return true
        // Se a transação está em uma subcategoria cujo pai é o selecionado
        return cat.pai_id === selectedCategory
      })
    }

    // Filtro por subcategoria selecionada (prioritário)
    if (selectedSubcategory && selectedSubcategory !== 'all') {
      filtered = filtered.filter((t) => t.categoria_id === selectedSubcategory)
    }

    setFilteredTransactions(filtered)
  }, [transactions, selectedTag, selectedCategory, selectedSubcategory, dateRange, categorias])

  const clearAllFilters = () => {
    setSelectedTag('all')
    setSelectedCategory('all')
    setSelectedSubcategory('all')
  }

  const handleSelectTransaction = (id: string) => {
    setSelectedTransactionIds(prev =>
      prev.includes(id)
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedTransactionIds.length === filteredTransactions.length) {
      setSelectedTransactionIds([])
    } else {
      setSelectedTransactionIds(filteredTransactions.map(t => t.id))
    }
  }

  const handleBulkSuccess = () => {
    setSelectedTransactionIds([])
    loadTransactions()
  }

  const columns: DataTableColumn<Transacao>[] = [
    {
      id: 'select',
      header: '', // Empty header for select column
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSelectTransaction(row.id)}
          className="h-8 w-8 p-0"
        >
          {selectedTransactionIds.includes(row.id) ? (
            <Check className="h-4 w-4 text-foreground" />
          ) : (
            <div className="h-4 w-4 border border-gray-400 rounded" />
          )}
        </Button>
      ),
      width: '50px',
    },
    {
      id: 'date',
      header: 'Data',
      accessorKey: 'data',
      sortable: true,
      cell: (row) => {
        const date = row.data instanceof Date ? row.data : new Date(row.data);
        return <span className="text-foreground">{date.toLocaleDateString('pt-BR')}</span>;
      },
      width: '120px',
    },
    {
      id: 'description',
      header: 'Descrição',
      accessorKey: 'descricao',
      sortable: true,
      filterable: true,
      cell: (row) => <span className="text-foreground">{row.descricao}</span>,
    },
    {
      id: 'category',
      header: 'Categoria',
      accessorKey: 'categoria_id',
      sortable: true,
      filterable: true,
      cell: (row) => {
        if (!row.categoria_id) return <span className="text-foreground">-</span>
        const categoria = getCategoriaById(row.categoria_id)
        return (
          <div className="flex items-center gap-2">
            {categoria?.icone && <span className="text-lg">{categoria.icone}</span>}
            <span className="text-foreground">{categoria?.nome || row.categoria_id}</span>
          </div>
        )
      },
    },
    {
      id: 'account',
      header: 'Conta',
      accessorKey: 'conta_id',
      sortable: true,
      filterable: true,
      cell: (row) => {
        if (!row.conta_id) return <span className="text-foreground">-</span>
        const conta = getContaById(row.conta_id)
        return <span className="text-foreground">{conta?.nome || row.conta_id}</span>
      },
    },
    {
      id: 'type',
      header: 'Tipo',
      accessorKey: 'tipo',
      sortable: true,
      cell: (row) => {
        const tipo = row.tipo;
        return (
          <div className="flex items-center gap-1">
            {tipo === 'receita' && (
              <>
                <ArrowUpCircle className="h-4 w-4 text-success" />
                <span className="text-foreground">Receita</span>
              </>
            )}
            {tipo === 'despesa' && (
              <>
                <ArrowDownCircle className="h-4 w-4 text-destructive" />
                <span className="text-foreground">Despesa</span>
              </>
            )}
            {tipo === 'transferencia' && (
              <>
                <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Transferência</span>
              </>
            )}
          </div>
        );
      },
      width: '140px',
    },
    {
      id: 'amount',
      header: 'Valor',
      accessorKey: 'valor',
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-gold">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(Math.abs(row.valor))}
        </span>
      ),
      width: '140px',
    },
    {
      id: 'tags',
      header: 'Tags',
      accessorKey: 'tags',
      cell: (row) => {
        if (!row.tags) return <span className="text-foreground">-</span>

        // Parse tags (stored as JSON string in DB)
        const tagArray = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags
        if (!Array.isArray(tagArray) || tagArray.length === 0) return <span className="text-foreground">-</span>

        return (
          <div className="flex flex-wrap gap-1">
            {tagArray.map((tagName) => {
              const tag = getTagByName(tagName)
              return (
                <TagBadge
                  key={tagName}
                  label={tagName}
                  cor={tag?.cor}
                  size="sm"
                />
              )
            })}
          </div>
        )
      },
      width: '200px',
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hover:bg-accent">
              <MoreHorizontal className="h-4 w-4 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className=""
          >
            <DropdownMenuItem
              onClick={() => {
                setTransactionToView(row)
                setViewDialogOpen(true)
              }}
              className="cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTransactionToEdit(row)
                setEditMode(true)
                setFormDialogOpen(true)
              }}
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-purple-600 dark:text-purple-400"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  // Carrega categorias do tipo no cliente e envia ao endpoint
                  const categorias = await import('@/lib/services/categoria.service').then(m => m.categoriaService.listCategorias({ tipo: row.tipo, ativas: true }));
                  const response = await fetch('/api/ai/classify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      descricao: row.descricao,
                      valor: Math.abs(row.valor),
                      tipo: row.tipo,
                      transacao_id: row.id,
                      categorias: (await categorias).map(c => ({ id: c.id, nome: c.nome })),
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Erro ao classificar');
                  }

                  const data = await response.json();

                  if (data.categoria_sugerida_id) {
                    await transacaoService.updateTransacao(row.id, {
                      categoria_id: data.categoria_sugerida_id,
                    });
                    await loadTransactions();
                    toast.success(`Classificada como: ${data.categoria_nome}`, {
                      description: `Confiança: ${(data.confianca * 100).toFixed(0)}%${data.cached ? ' (cache)' : ''}`,
                    });
                  } else {
                    toast.warning('IA não conseguiu sugerir uma categoria');
                  }
                } catch (error: any) {
                  console.error('Erro ao classificar:', error);
                  toast.error(error.message || 'Erro ao classificar transação');
                }
              }}
            >
              <Brain className="mr-2 h-4 w-4" />
              Classificar com IA
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-destructive"
              onClick={() => {
                setTransactionToDelete(row.id)
                setDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: '60px',
    },
  ]

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    try {
      await transacaoService.deleteTransacao(transactionToDelete)
      await loadTransactions() // Recarrega a lista
      setDeleteDialogOpen(false)
      setTransactionToDelete(null)
      toast.success('Transação excluída', {
        description: 'A transação foi excluída com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao excluir transação:', error)
      toast.error('Erro ao excluir transação', {
        description: 'Não foi possível excluir a transação. Tente novamente.',
      })
    }
  }

  const handleSubmit = async (data: TransactionFormData) => {
    setFormLoading(true)
    try {
      const dto = mapFormDataToDTO(data)

      if (editMode && transactionToEdit) {
        // Modo edição
        await transacaoService.updateTransacao(transactionToEdit.id, dto)
        toast.success('Transação atualizada', {
          description: 'A transação foi atualizada com sucesso.',
        })
      } else {
        // Modo criação
        // Verificação preventiva de duplicidade no cliente para melhor UX
        const duplicate = await isDuplicate(dto.conta_id, {
          data: typeof dto.data === 'string' ? new Date(dto.data) : dto.data,
          descricao: dto.descricao,
          valor: dto.valor,
        })
        if (duplicate) {
          toast.error('Transação duplicada detectada', {
            description: 'Já existe uma transação com a mesma data, descrição e valor nesta conta.',
          })
          setFormLoading(false)
          return
        }

        await transacaoService.createTransacao(dto)
        toast.success('Transação criada', {
          description: 'A transação foi criada com sucesso.',
        })
      }

      await loadTransactions() // Recarrega a lista
      setFormDialogOpen(false)
      setEditMode(false)
      setTransactionToEdit(null)
    } catch (error) {
      console.error('Erro ao salvar transação:', error)
      toast.error(editMode ? 'Erro ao atualizar transação' : 'Erro ao criar transação', {
        description: 'Não foi possível salvar a transação. Verifique os dados e tente novamente.',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const filters = [
    {
      id: 'type',
      label: 'Tipo',
      options: [
        { label: 'Receita', value: 'receita' },
        { label: 'Despesa', value: 'despesa' },
      ],
    },
    {
      id: 'category',
      label: 'Categoria',
      options: Array.from(new Set(transactions.map(t => t.categoria_id).filter(Boolean) as string[])).map(cat => ({
        label: cat,
        value: cat,
      })),
    },
  ]

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
            <p style={{ color: '#B2BDB9' }}>Carregando transações...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Transações"
          description="Gerencie todas as suas movimentações financeiras"
          actions={
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                if (!range?.from || !range?.to) {
                  setDateRange(range || { from: undefined, to: undefined })
                  return
                }
                const days = Math.abs(differenceInCalendarDays(range.to, range.from)) + 1
                if (days > 90) {
                  toast.error('Período muito longo', { description: 'Selecione no máximo 90 dias.' })
                  return
                }
                setDateRange(range)
              }}
            />
          }
        />

        {/* Abas para reduzir quebras e consolidar funcionalidades */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 glass-header p-1">
            <TabsTrigger value="filters" className="data-[state=active]:bg-primary/20 data-[state=active]:text-foreground">
              Filtros
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-primary/20 data-[state=active]:text-foreground">
              Modo AI
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-primary/20 data-[state=active]:text-foreground">
              Importar
            </TabsTrigger>
          </TabsList>

          {/* Lista de Transações + Filtros */}
          <TabsContent value="filters" className="space-y-6">
            {/* Card Unificado de Filtros */}
            <Card className="glass-card-3d">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base text-foreground">Filtros</CardTitle>
                  <CardDescription className="text-xs text-secondary">
                    Filtre as transações por categoria, tag ou período
                  </CardDescription>
                </div>
                {/* Nova Transação Manual (no topo do quadro) */}
                <Dialog open={formDialogOpen} onOpenChange={(open) => {
                  setFormDialogOpen(open)
                  if (!open) {
                    // Limpa estados ao fechar
                    setEditMode(false)
                    setTransactionToEdit(null)
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      className="h-10 font-medium"
                      onClick={() => {
                        setEditMode(false)
                        setTransactionToEdit(null)
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Transação Manual
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border"
                  >
                    <DialogHeader>
                      <DialogTitle className="text-foreground">
                        {editMode ? 'Editar Transação' : 'Nova Transação Manual'}
                      </DialogTitle>
                      <DialogDescription className="text-secondary">
                        {editMode
                          ? 'Edite os dados da transação selecionada.'
                          : 'Adicione manualmente uma nova transação ao seu histórico financeiro.'}
                      </DialogDescription>
                    </DialogHeader>
                    <TransactionForm
                      onSubmit={handleSubmit}
                      onCancel={() => {
                        setFormDialogOpen(false)
                        setEditMode(false)
                        setTransactionToEdit(null)
                      }}
                      isLoading={formLoading}
                      submitLabel={editMode ? 'Salvar Alterações' : 'Criar Transação'}
                      defaultValues={transactionToEdit ? {
                        type: transactionToEdit.tipo === 'transferencia' ? 'expense' : mapDBTypeToFormType(transactionToEdit.tipo) as 'income' | 'expense',
                        description: transactionToEdit.descricao,
                        amount: Math.abs(transactionToEdit.valor),
                        date: transactionToEdit.data instanceof Date ? transactionToEdit.data : new Date(transactionToEdit.data),
                        categoryId: transactionToEdit.categoria_id || '',
                        accountId: transactionToEdit.conta_id || '',
                        tags: transactionToEdit.tags ? (typeof transactionToEdit.tags === 'string' ? JSON.parse(transactionToEdit.tags) : transactionToEdit.tags) : [],
                        notes: transactionToEdit.observacoes || '',
                      } : undefined}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtros rápidos pré-definidos */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === 'all' && selectedTag === 'all' && selectedSubcategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory('all')
                      setSelectedTag('all')
                      setSelectedSubcategory('all')
                    }}
                  >
                    Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const receitaCategorias = categorias.filter(c => c.tipo === 'receita')
                      if (receitaCategorias.length > 0) {
                        setSelectedCategory(receitaCategorias[0].id)
                      }
                    }}
                  >
                    Receitas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const despesaCategorias = categorias.filter(c => c.tipo === 'despesa')
                      if (despesaCategorias.length > 0) {
                        setSelectedCategory(despesaCategorias[0].id)
                      }
                    }}
                  >
                    Despesas
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3 items-end">

                  {/* Filtro de Categoria */}
                  {categorias.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-secondary">Categoria</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="all"
                            className="text-sm cursor-pointer"
                          >
                            Todas as categorias
                          </SelectItem>
                          {categorias.map((cat) => (
                            <SelectItem
                              key={cat.id}
                              value={cat.id}
                              className="text-sm cursor-pointer"
                            >
                              {cat.icone} {cat.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Filtro de Subcategoria */}
                  {categorias.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-secondary">Subcategoria</Label>
                      <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Todas as subcategorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="all"
                            className="text-sm cursor-pointer"
                          >
                            Todas as subcategorias
                          </SelectItem>
                          {categorias
                            .filter(c => c.pai_id && (selectedCategory === 'all' || c.pai_id === selectedCategory))
                            .map((sub) => (
                              <SelectItem
                                key={sub.id}
                                value={sub.id}
                                className="text-sm cursor-pointer"
                              >
                                {sub.icone} {sub.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Filtro de Tag */}
                  {tags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-secondary">Tag</Label>
                      <Select value={selectedTag} onValueChange={setSelectedTag}>
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Todas as tags" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="all"
                            className="text-sm cursor-pointer"
                          >
                            Todas as tags
                          </SelectItem>
                          {tags.map((tag) => (
                            <SelectItem
                              key={tag.id}
                              value={tag.nome}
                              className="text-sm cursor-pointer"
                            >
                              {tag.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Botão removido daqui: agora no CardHeader */}
                </div>

                {/* Botão Limpar Filtros e Seleção em Massa */}
                <div className="mt-4 flex gap-2">
                  {(selectedCategory !== 'all' || selectedTag !== 'all') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                    >
                      <X className="mr-2 h-3 w-3" />
                      Limpar Filtros
                    </Button>
                  )}

                  {filteredTransactions.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedTransactionIds.length === filteredTransactions.length ? (
                        <>
                          <X className="mr-2 h-3 w-3" />
                          Desmarcar Todas
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-3 w-3" />
                          Selecionar Todas
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Indicador de resultados */}
                {(selectedCategory !== 'all' || selectedTag !== 'all' || selectedSubcategory !== 'all') && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-secondary">
                      Mostrando {filteredTransactions.length} de {transactions.length} transações
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedTransactionIds.length > 0 && (
              <div className="space-y-4">
                {/* Bulk Category Assignment */}
                <BulkCategoryAssign
                  selectedTransactionIds={selectedTransactionIds}
                  onSuccess={handleBulkSuccess}
                  onCancel={() => setSelectedTransactionIds([])}
                />

                {/* Bulk AI Classification */}
                <BulkAIClassify
                  selectedTransactionIds={selectedTransactionIds}
                  onSuccess={handleBulkSuccess}
                  onCancel={() => setSelectedTransactionIds([])}
                />
              </div>
            )}

            <DataTable
              data={filteredTransactions}
              columns={columns}
              searchable={false}
            />
          </TabsContent>

          {/* Regras + Assistente em uma única aba para reduzir quebras */}
          <TabsContent value="ai" className="space-y-6">
            <ClassificationRules />
            <RuleAssistant />
          </TabsContent>

          {/* Importação embutida */}
          <TabsContent value="import" className="space-y-6">
            <ImportWizard redirectOnComplete={false} showClassificationRules={false} />
          </TabsContent>
        </Tabs>

        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Transação"
          description="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleDelete}
        />

        {/* Dialog de Visualização */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Detalhes da Transação
              </DialogTitle>
            </DialogHeader>
            {transactionToView && (
              <div className="space-y-4">
                {/* Data */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-secondary">Data:</span>
                  <span className="col-span-2 text-sm text-foreground">
                    {(transactionToView.data instanceof Date
                      ? transactionToView.data
                      : new Date(transactionToView.data)
                    ).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {/* Tipo */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-secondary">Tipo:</span>
                  <div className="col-span-2 flex items-center gap-2">
                    {transactionToView.tipo === 'receita' && (
                      <>
                        <ArrowUpCircle className="h-4 w-4 text-success" />
                        <span className="text-sm text-foreground">Receita</span>
                      </>
                    )}
                    {transactionToView.tipo === 'despesa' && (
                      <>
                        <ArrowDownCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-foreground">Despesa</span>
                      </>
                    )}
                    {transactionToView.tipo === 'transferencia' && (
                      <>
                        <ArrowUpCircle className="h-4 w-4 text-secondary" />
                        <span className="text-sm text-foreground">Transferência</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Descrição */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-secondary">Descrição:</span>
                  <span className="col-span-2 text-sm text-foreground">{transactionToView.descricao}</span>
                </div>

                {/* Valor */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-secondary">Valor:</span>
                  <span className="col-span-2 text-sm font-semibold text-gold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(Math.abs(transactionToView.valor))}
                  </span>
                </div>

                {/* Categoria */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-secondary">Categoria:</span>
                  <div className="col-span-2 flex items-center gap-2">
                    {transactionToView.categoria_id ? (
                      <>
                        {getCategoriaById(transactionToView.categoria_id)?.icone && (
                          <span className="text-lg">{getCategoriaById(transactionToView.categoria_id)?.icone}</span>
                        )}
                        <span className="text-sm text-foreground">{getCategoriaById(transactionToView.categoria_id)?.nome || '-'}</span>
                      </>
                    ) : (
                      <span className="text-sm text-foreground">-</span>
                    )}
                  </div>
                </div>

                {/* Conta */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-secondary">Conta:</span>
                  <span className="col-span-2 text-sm text-foreground">
                    {transactionToView.conta_id
                      ? getContaById(transactionToView.conta_id)?.nome || '-'
                      : '-'
                    }
                  </span>
                </div>

                {/* Tags */}
                {(() => {
                  if (!transactionToView.tags) return null;
                  const tagArray = typeof transactionToView.tags === 'string' ? JSON.parse(transactionToView.tags) : transactionToView.tags;
                  if (!Array.isArray(tagArray) || tagArray.length === 0) return null;

                  return (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-sm font-medium text-secondary">Tags:</span>
                      <div className="col-span-2 flex flex-wrap gap-1">
                        {tagArray.map((tagName) => {
                          const tag = getTagByName(tagName)
                          return (
                            <TagBadge
                              key={tagName}
                              label={tagName}
                              cor={tag?.cor}
                              size="sm"
                            />
                          )
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Observações */}
                {transactionToView.observacoes && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-sm font-medium text-secondary">Observações:</span>
                    <span className="col-span-2 text-sm text-foreground">{transactionToView.observacoes}</span>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
