'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSetting } from '@/app/providers/settings-provider'
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
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
import { Plus, ArrowUpCircle, ArrowDownCircle, MoreHorizontal, Pencil, Trash2, Calendar, Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { TransactionForm, TransactionFormProps } from "@/components/forms"
import { MonthPicker } from "@/components/ui/month-picker"
import { startOfMonth, endOfMonth } from 'date-fns'
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
import { cn } from "@/lib/utils"

export default function TransactionsPage() {
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')
  const [transactions, setTransactions] = useState<Transacao[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transacao[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
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

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  // Carrega transações, tags, categorias e contas do banco
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [transacoesData, tagsData, categoriasData, contasData] = await Promise.all([
          transacaoService.listTransacoes(),
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
  }, [])

  const loadTransactions = async () => {
    try {
      const data = await transacaoService.listTransacoes()
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

  // Filtrar transações por tags, categorias E mês
  useEffect(() => {
    let filtered = transactions

    // Filtro por mês selecionado
    const monthStart = startOfMonth(selectedMonth)
    const monthEnd = endOfMonth(selectedMonth)
    filtered = filtered.filter((t) => {
      const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
      return transactionDate >= monthStart && transactionDate <= monthEnd
    })

    // Filtro por tag selecionada
    if (selectedTag && selectedTag !== 'all') {
      filtered = filtered.filter((t) => {
        if (!t.tags || t.tags.length === 0) return false
        return t.tags.includes(selectedTag)
      })
    }

    // Filtro por categoria selecionada
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter((t) => {
        return t.categoria_id === selectedCategory
      })
    }

    setFilteredTransactions(filtered)
  }, [transactions, selectedTag, selectedCategory, selectedMonth])

  const clearAllFilters = () => {
    setSelectedTag('all')
    setSelectedCategory('all')
  }

  const columns: DataTableColumn<Transacao>[] = [
    {
      id: 'date',
      header: 'Data',
      accessorKey: 'data',
      sortable: true,
      cell: (row) => {
        const date = row.data instanceof Date ? row.data : new Date(row.data);
        return <span className="text-white">{date.toLocaleDateString('pt-BR')}</span>;
      },
      width: '120px',
    },
    {
      id: 'description',
      header: 'Descrição',
      accessorKey: 'descricao',
      sortable: true,
      filterable: true,
      cell: (row) => <span className="text-white">{row.descricao}</span>,
    },
    {
      id: 'category',
      header: 'Categoria',
      accessorKey: 'categoria_id',
      sortable: true,
      filterable: true,
      cell: (row) => {
        if (!row.categoria_id) return <span className="text-white">-</span>
        const categoria = getCategoriaById(row.categoria_id)
        return (
          <div className="flex items-center gap-2">
            {categoria?.icone && <span className="text-lg">{categoria.icone}</span>}
            <span className="text-white">{categoria?.nome || row.categoria_id}</span>
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
        if (!row.conta_id) return <span className="text-white">-</span>
        const conta = getContaById(row.conta_id)
        return <span className="text-white">{conta?.nome || row.conta_id}</span>
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
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                <span className="text-white">Receita</span>
              </>
            )}
            {tipo === 'despesa' && (
              <>
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
                <span className="text-white">Despesa</span>
              </>
            )}
            {tipo === 'transferencia' && (
              <>
                <ArrowUpCircle className="h-4 w-4 text-blue-500" />
                <span className="text-white">Transferência</span>
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
        <span className={row.valor > 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
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
        if (!row.tags || row.tags.length === 0) return <span className="text-white">-</span>
        return (
          <div className="flex flex-wrap gap-1">
            {row.tags.map((tagName) => {
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
            <Button variant="ghost" size="sm" className="hover:bg-zinc-800/40">
              <MoreHorizontal className="h-4 w-4 text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(
              isDark
                ? "!bg-gray-800 !border-gray-700"
                : "!bg-white !border-gray-200"
            )}
            style={isDark ? {
              backgroundColor: '#1f2937',
              borderColor: '#374151'
            } : undefined}
          >
            <DropdownMenuItem
              onClick={() => {
                setTransactionToView(row)
                setViewDialogOpen(true)
              }}
              className={cn(
                "cursor-pointer",
                isDark
                  ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700"
                  : "!text-gray-900"
              )}
              style={isDark ? { color: '#ffffff' } : undefined}
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
              className={cn(
                "cursor-pointer",
                isDark
                  ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700"
                  : "!text-gray-900"
              )}
              style={isDark ? { color: '#ffffff' } : undefined}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                "cursor-pointer",
                isDark
                  ? "!text-red-400 hover:!bg-gray-700 focus:!bg-gray-700"
                  : "text-destructive"
              )}
              style={isDark ? { color: '#f87171' } : undefined}
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando transações...</p>
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
        />

        {/* Card Unificado de Filtros */}
        <Card style={{
          background: isDark
            ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          backgroundColor: isDark ? '#3B5563' : '#FFFFFF'
        }}>
          <CardHeader className="pb-3">
            <CardTitle className={isDark ? "text-base text-white" : "text-base text-white"}>Filtros</CardTitle>
            <CardDescription className={isDark ? "text-xs text-white/70" : "text-xs text-white/70"}>
              Filtre as transações por categoria, tag ou período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 items-end">
              {/* Filtro de Mês */}
              <div className="space-y-2">
                <Label className="text-sm text-white font-medium">Período</Label>
                <MonthPicker
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                />
              </div>

              {/* Filtro de Categoria */}
              {categorias.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-white font-medium">Categoria</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger
                      className={cn(
                        "w-full text-sm border-0",
                        "!bg-gray-800 !text-white hover:!bg-gray-700"
                      )}
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        height: '40px',
                        minHeight: '40px'
                      }}
                    >
                      <SelectValue
                        placeholder="Todas as categorias"
                        className={isDark ? "!text-white" : "!text-gray-900"}
                        style={isDark ? { color: '#ffffff' } : undefined}
                      />
                    </SelectTrigger>
                    <SelectContent
                      className={cn(
                        isDark
                          ? "!bg-gray-800 !border-gray-700"
                          : "!bg-white !border-gray-200"
                      )}
                      style={isDark ? {
                        backgroundColor: '#1f2937',
                        borderColor: '#374151'
                      } : undefined}
                    >
                      <SelectItem
                        value="all"
                        className={cn(
                          "text-sm cursor-pointer",
                          isDark
                            ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700"
                            : "!text-gray-900"
                        )}
                        style={isDark ? { color: '#ffffff' } : undefined}
                      >
                        Todas as categorias
                      </SelectItem>
                      {categorias.map((cat) => (
                        <SelectItem
                          key={cat.id}
                          value={cat.id}
                          className={cn(
                            "text-sm cursor-pointer",
                            isDark
                              ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700"
                              : "!text-gray-900"
                          )}
                          style={isDark ? { color: '#ffffff' } : undefined}
                        >
                          {cat.icone} {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtro de Tag */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-white font-medium">Tag</Label>
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger
                      className={cn(
                        "w-full text-sm border-0",
                        "!bg-gray-800 !text-white hover:!bg-gray-700"
                      )}
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        height: '40px',
                        minHeight: '40px'
                      }}
                    >
                      <SelectValue
                        placeholder="Todas as tags"
                        className={isDark ? "!text-white" : "!text-gray-900"}
                        style={isDark ? { color: '#ffffff' } : undefined}
                      />
                    </SelectTrigger>
                    <SelectContent
                      className={cn(
                        isDark
                          ? "!bg-gray-800 !border-gray-700"
                          : "!bg-white !border-gray-200"
                      )}
                      style={isDark ? {
                        backgroundColor: '#1f2937',
                        borderColor: '#374151'
                      } : undefined}
                    >
                      <SelectItem
                        value="all"
                        className={cn(
                          "text-sm cursor-pointer",
                          isDark
                            ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700"
                            : "!text-gray-900"
                        )}
                        style={isDark ? { color: '#ffffff' } : undefined}
                      >
                        Todas as tags
                      </SelectItem>
                      {tags.map((tag) => (
                        <SelectItem
                          key={tag.id}
                          value={tag.nome}
                          className={cn(
                            "text-sm cursor-pointer",
                            isDark
                              ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700"
                              : "!text-gray-900"
                          )}
                          style={isDark ? { color: '#ffffff' } : undefined}
                        >
                          {tag.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Botão Nova Transação */}
              <div className="space-y-2">
                <Label className="text-sm opacity-0 font-medium">Ações</Label>
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
                      className="w-full h-10 bg-primary text-white hover:bg-primary/90 font-medium"
                      style={{
                        backgroundColor: '#18B0A4',
                        color: '#ffffff'
                      }}
                      onClick={() => {
                        setEditMode(false)
                        setTransactionToEdit(null)
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Transação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editMode ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
                      <DialogDescription>
                        {editMode
                          ? 'Edite os dados da transação selecionada.'
                          : 'Adicione uma nova transação ao seu histórico financeiro.'}
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
                      initialData={transactionToEdit ? {
                        type: mapDBTypeToFormType(transactionToEdit.tipo),
                        description: transactionToEdit.descricao,
                        amount: transactionToEdit.valor,
                        date: transactionToEdit.data instanceof Date ? transactionToEdit.data : new Date(transactionToEdit.data),
                        category: transactionToEdit.categoria_id || '',
                        account: transactionToEdit.conta_id || '',
                        tags: transactionToEdit.tags || [],
                        notes: transactionToEdit.observacoes || '',
                      } : undefined}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Botão Limpar Filtros (se houver filtros ativos) */}
            {(selectedCategory !== 'all' || selectedTag !== 'all') && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  <X className="mr-2 h-3 w-3" />
                  Limpar Filtros
                </Button>
              </div>
            )}

            {/* Indicador de resultados */}
            {(selectedCategory !== 'all' || selectedTag !== 'all') && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className={isDark ? "text-sm text-white/70" : "text-sm text-muted-foreground"}>
                  Mostrando {filteredTransactions.length} de {transactions.length} transações
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <DataTable
          data={filteredTransactions}
          columns={columns}
          searchable={false}
          isDark={isDark}
        />

        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Transação"
          description="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleDelete}
          isDark={isDark}
        />

        {/* Dialog de Visualização */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Transação</DialogTitle>
            </DialogHeader>
            {transactionToView && (
              <div className="space-y-4">
                {/* Data */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Data:</span>
                  <span className="col-span-2 text-sm">
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
                  <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
                  <div className="col-span-2 flex items-center gap-2">
                    {transactionToView.tipo === 'receita' && (
                      <>
                        <ArrowUpCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Receita</span>
                      </>
                    )}
                    {transactionToView.tipo === 'despesa' && (
                      <>
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Despesa</span>
                      </>
                    )}
                    {transactionToView.tipo === 'transferencia' && (
                      <>
                        <ArrowUpCircle className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Transferência</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Descrição */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Descrição:</span>
                  <span className="col-span-2 text-sm">{transactionToView.descricao}</span>
                </div>

                {/* Valor */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Valor:</span>
                  <span className={cn(
                    "col-span-2 text-sm font-semibold",
                    transactionToView.valor > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(Math.abs(transactionToView.valor))}
                  </span>
                </div>

                {/* Categoria */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Categoria:</span>
                  <div className="col-span-2 flex items-center gap-2">
                    {transactionToView.categoria_id ? (
                      <>
                        {getCategoriaById(transactionToView.categoria_id)?.icone && (
                          <span className="text-lg">{getCategoriaById(transactionToView.categoria_id)?.icone}</span>
                        )}
                        <span className="text-sm">{getCategoriaById(transactionToView.categoria_id)?.nome || '-'}</span>
                      </>
                    ) : (
                      <span className="text-sm">-</span>
                    )}
                  </div>
                </div>

                {/* Conta */}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Conta:</span>
                  <span className="col-span-2 text-sm">
                    {transactionToView.conta_id
                      ? getContaById(transactionToView.conta_id)?.nome || '-'
                      : '-'
                    }
                  </span>
                </div>

                {/* Tags */}
                {transactionToView.tags && transactionToView.tags.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Tags:</span>
                    <div className="col-span-2 flex flex-wrap gap-1">
                      {transactionToView.tags.map((tagName) => {
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
                )}

                {/* Observações */}
                {transactionToView.observacoes && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Observações:</span>
                    <span className="col-span-2 text-sm">{transactionToView.observacoes}</span>
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
