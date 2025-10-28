'use client'

import { useState, useEffect } from 'react'
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
import { Plus, ArrowUpCircle, ArrowDownCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { TransactionForm, TransactionFormProps } from "@/components/forms"
import type { TransactionFormData } from "@/lib/validations"
import { transacaoService } from "@/lib/services/transacao.service"
import { mapFormDataToDTO, mapDBTypeToFormType } from "@/lib/adapters"
import type { Transacao } from "@/lib/types"
import { toast } from "sonner"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  // Carrega transações do banco
  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await transacaoService.listTransacoes()
      setTransactions(data)
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
      toast.error('Erro ao carregar transações', {
        description: 'Não foi possível carregar as transações. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  const columns: DataTableColumn<Transacao>[] = [
    {
      id: 'date',
      header: 'Data',
      accessorKey: 'data',
      sortable: true,
      cell: (row) => {
        const date = row.data instanceof Date ? row.data : new Date(row.data);
        return date.toLocaleDateString('pt-BR');
      },
      width: '120px',
    },
    {
      id: 'description',
      header: 'Descrição',
      accessorKey: 'descricao',
      sortable: true,
      filterable: true,
    },
    {
      id: 'category',
      header: 'Categoria',
      accessorKey: 'categoria_id',
      sortable: true,
      filterable: true,
      cell: (row) => row.categoria_id || '-',
    },
    {
      id: 'account',
      header: 'Conta',
      accessorKey: 'conta_id',
      sortable: true,
      filterable: true,
      cell: (row) => row.conta_id || '-',
    },
    {
      id: 'type',
      header: 'Tipo',
      accessorKey: 'tipo',
      sortable: true,
      cell: (row) => {
        const formType = mapDBTypeToFormType(row.tipo);
        return (
          <Badge variant={formType === 'income' ? 'default' : 'secondary'}>
            {formType === 'income' ? (
              <><ArrowUpCircle className="mr-1 h-3 w-3" /> Receita</>
            ) : (
              <><ArrowDownCircle className="mr-1 h-3 w-3" /> Despesa</>
            )}
          </Badge>
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
      id: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
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
      await transacaoService.createTransacao(dto)
      await loadTransactions() // Recarrega a lista
      setFormDialogOpen(false)
      toast.success('Transação criada', {
        description: 'A transação foi criada com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao criar transação:', error)
      toast.error('Erro ao criar transação', {
        description: 'Não foi possível criar a transação. Verifique os dados e tente novamente.',
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
          actions={
            <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Transação</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova transação ao seu histórico financeiro.
                  </DialogDescription>
                </DialogHeader>
                <TransactionForm
                  onSubmit={handleSubmit}
                  onCancel={() => setFormDialogOpen(false)}
                  isLoading={formLoading}
                  submitLabel="Criar Transação"
                />
              </DialogContent>
            </Dialog>
          }
        />

        <DataTableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Buscar transações..."
          filters={filters}
          filterValues={filterValues}
          onFilterChange={(id, value) => setFilterValues({ ...filterValues, [id]: value })}
          onClearFilters={() => setFilterValues({})}
        />

        <DataTable
          data={transactions}
          columns={columns}
          searchable={false}
        />

        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Transação"
          description="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  )
}
