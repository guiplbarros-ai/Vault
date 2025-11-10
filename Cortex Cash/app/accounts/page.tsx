'use client'

import { useState, useEffect } from 'react'
import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Building2, PiggyBank, CreditCard, TrendingUp, Wallet, MoreHorizontal, Pencil, Trash2, Eye, EyeOff } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants"
import { AccountForm } from "@/components/forms"
import type { AccountFormData } from "@/lib/validations"
import { contaService } from "@/lib/services/conta.service"
import { mapFormDataToCreateConta, mapDBAccountTypeToFormType, mapContaToFormData } from "@/lib/adapters"
import type { Conta } from "@/lib/types"
import { toast } from "sonner"
import { transacaoService } from "@/lib/services/transacao.service"
import type { Transacao } from "@/lib/types"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

const getAccountIcon = (type: string) => {
  const icons = {
    corrente: Building2,
    poupanca: PiggyBank,
    credit: CreditCard,
    investimento: TrendingUp,
    carteira: Wallet,
    checking: Building2,
    savings: PiggyBank,
    investment: TrendingUp,
    cash: Wallet,
  }
  return icons[type as keyof typeof icons] || Wallet
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Conta[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<Conta[]>([])
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Conta | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [accountTransactions, setAccountTransactions] = useState<Transacao[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  const { formatCurrency: formatCurrencyWithSettings } = useLocalizationSettings()

  // Carrega contas do banco
  useEffect(() => {
    loadAccounts()
  }, [])

  // Aplica filtros quando accounts ou selectedTypeFilter mudam
  useEffect(() => {
    if (selectedTypeFilter === 'all') {
      setFilteredAccounts(accounts)
    } else {
      setFilteredAccounts(accounts.filter(acc => acc.tipo === selectedTypeFilter))
    }
  }, [accounts, selectedTypeFilter])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await contaService.listContas() // carrega todas as contas
      setAccounts(data)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
      toast.error('Erro ao carregar contas', {
        description: 'Não foi possível carregar as contas. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      await contaService.deleteConta(accountToDelete) // soft delete
      await loadAccounts()
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
      toast.success('Conta excluída', {
        description: 'A conta foi excluída com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao excluir conta:', error)
      toast.error('Erro ao excluir conta', {
        description: 'Não foi possível excluir a conta. Tente novamente.',
      })
    }
  }

  const handleSubmit = async (data: AccountFormData) => {
    console.log('[DEBUG] Form data recebido:', data)
    setFormLoading(true)
    try {
      if (editMode && selectedAccount) {
        // Modo edição
        const instituicaoId = selectedAccount.instituicao_id
        const contaData = mapFormDataToCreateConta(data, instituicaoId)
        await contaService.updateConta(selectedAccount.id, contaData)
        toast.success('Conta atualizada', {
          description: 'A conta foi atualizada com sucesso.',
        })
      } else {
        // Modo criação
        const instituicaoId = 'default-institution-id'
        const contaData = mapFormDataToCreateConta(data, instituicaoId)
        console.log('[DEBUG] Dados convertidos para criar conta:', contaData)
        await contaService.createConta(contaData)
        toast.success('Conta criada', {
          description: 'A conta foi criada com sucesso.',
        })
      }
      await loadAccounts()
      setFormDialogOpen(false)
      setEditMode(false)
      setSelectedAccount(null)
    } catch (error) {
      console.error('Erro ao salvar conta:', error)
      toast.error(editMode ? 'Erro ao atualizar conta' : 'Erro ao criar conta', {
        description: 'Não foi possível salvar a conta. Verifique os dados e tente novamente.',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (account: Conta) => {
    setSelectedAccount(account)
    setEditMode(true)
    setFormDialogOpen(true)
  }

  const handleViewDetails = async (account: Conta) => {
    setSelectedAccount(account)
    setDetailsDialogOpen(true)

    // Carregar transações da conta
    setLoadingTransactions(true)
    try {
      const transactions = await transacaoService.listTransacoes({
        contaId: account.id,
        limit: 5,
        sortBy: 'data',
        sortOrder: 'desc',
      })
      setAccountTransactions(transactions)
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
      toast.error('Erro ao carregar transações', {
        description: 'Não foi possível carregar as transações da conta.',
      })
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleToggleActive = async (account: Conta) => {
    try {
      await contaService.toggleAtiva(account.id)
      await loadAccounts()
      toast.success(account.ativa ? 'Conta desativada' : 'Conta ativada', {
        description: `A conta foi ${account.ativa ? 'desativada' : 'ativada'} com sucesso.`,
      })
    } catch (error) {
      console.error('Erro ao alterar status da conta:', error)
      toast.error('Erro ao alterar status', {
        description: 'Não foi possível alterar o status da conta.',
      })
    }
  }

  const handleNewAccount = () => {
    setEditMode(false)
    setSelectedAccount(null)
    setFormDialogOpen(true)
  }

  const formatCurrency = (value: number) => {
    return formatCurrencyWithSettings(Math.abs(value))
  }

  const totalBalance = accounts.reduce((sum, account) => sum + (account.saldo_atual || 0), 0)

  const typeFilters = [
    { value: 'all', label: 'Todas', icon: Wallet },
    { value: 'corrente', label: 'Corrente', icon: Building2 },
    { value: 'poupanca', label: 'Poupança', icon: PiggyBank },
    { value: 'investimento', label: 'Investimento', icon: TrendingUp },
    { value: 'carteira', label: 'Carteira', icon: Wallet },
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando contas...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Contas"
          description="Gerencie suas contas bancárias e cartões"
          actions={
            <Button
              onClick={handleNewAccount}
              className="text-white"
              style={{
                backgroundColor: '#18B0A4',
                color: '#ffffff'
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          }
        />

        {/* Total Balance Card */}
        <Card
          className="shadow-md border"
          style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}
        >
          <CardHeader>
            <CardTitle className="text-white">Saldo Total</CardTitle>
            <CardDescription className="text-white/70">Soma de todas as contas ativas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-sm text-white/70 mt-2">
              {accounts.filter(a => a.ativa).length} contas ativas
            </p>
          </CardContent>
        </Card>

        {/* Type Filters */}
        <div className="flex gap-2 flex-wrap">
          {typeFilters.map((filter) => {
            const Icon = filter.icon
            const isActive = selectedTypeFilter === filter.value
            const count = filter.value === 'all'
              ? accounts.length
              : accounts.filter(a => a.tipo === filter.value).length

            return (
              <button
                key={filter.value}
                onClick={() => setSelectedTypeFilter(filter.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-white/70 border-white/20 hover:bg-white/5'
                }`}
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, #18B0A4 0%, #16a89d 100%)',
                        backgroundColor: '#18B0A4',
                        borderColor: '#18B0A4'
                      }
                    : undefined
                }
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{filter.label}</span>
                <Badge
                  variant="secondary"
                  className={`ml-1 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {count}
                </Badge>
              </button>
            )
          })}
        </div>

        {/* Accounts Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Wallet className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/70">Nenhuma conta encontrada para este filtro.</p>
            </div>
          ) : (
            filteredAccounts.map((account) => {
            const Icon = getAccountIcon(account.tipo)
            const formType = mapDBAccountTypeToFormType(account.tipo)
            return (
              <Card
                key={account.id}
                className="relative overflow-hidden border-l-4 transition-all hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                  backgroundColor: '#3B5563',
                  borderLeftColor: account.cor || '#18B0A4'
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-white">{account.nome}</CardTitle>
                        <CardDescription className="text-xs text-white/70">
                          {ACCOUNT_TYPE_LABELS[formType]}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="!bg-gray-800 !border-gray-700"
                        style={{
                          backgroundColor: '#1f2937',
                          borderColor: '#374151'
                        }}
                      >
                        <DropdownMenuItem
                          onClick={() => handleViewDetails(account)}
                          className="!text-white hover:!bg-gray-700 cursor-pointer"
                          style={{ color: '#ffffff' }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEdit(account)}
                          className="!text-white hover:!bg-gray-700 cursor-pointer"
                          style={{ color: '#ffffff' }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(account)}
                          className="!text-white hover:!bg-gray-700 cursor-pointer"
                          style={{ color: '#ffffff' }}
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          {account.ativa ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/20" />
                        <DropdownMenuItem
                          className="!text-red-400 hover:!bg-red-500/20 cursor-pointer"
                          style={{ color: '#f87171' }}
                          onClick={() => {
                            setAccountToDelete(account.id)
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
                  <div className="space-y-2">
                    {account.agencia && (
                      <p className="text-xs text-white/70">
                        Agência: {account.agencia}
                      </p>
                    )}
                    <div className="flex items-baseline justify-between">
                      <span
                        className={`text-2xl font-bold ${
                          (account.saldo_atual || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {formatCurrency(account.saldo_atual || 0)}
                      </span>
                      <Badge
                        variant={account.ativa ? 'default' : 'secondary'}
                        className={account.ativa ? 'bg-green-500/90 text-white' : 'bg-gray-600 text-white'}
                      >
                        {account.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
          )}
        </div>

        {/* Form Dialog for Create/Edit */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
              borderColor: '#374151'
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white">{editMode ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
              <DialogDescription className="text-white/70">
                {editMode
                  ? 'Atualize as informações da sua conta.'
                  : 'Adicione uma nova conta ou cartão ao seu sistema financeiro.'}
              </DialogDescription>
            </DialogHeader>
            <AccountForm
              defaultValues={selectedAccount ? mapContaToFormData(selectedAccount) : undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setFormDialogOpen(false)
                setEditMode(false)
                setSelectedAccount(null)
              }}
              isLoading={formLoading}
              submitLabel={editMode ? 'Atualizar Conta' : 'Criar Conta'}
            />
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
              borderColor: '#374151'
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white">Detalhes da Conta</DialogTitle>
              <DialogDescription className="text-white/70">
                Informações completas da conta selecionada.
              </DialogDescription>
            </DialogHeader>
            {selectedAccount && (
              <div className="space-y-6">
                {/* Account Header */}
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    {(() => {
                      const Icon = getAccountIcon(selectedAccount.tipo)
                      return <Icon className="h-6 w-6 text-white" />
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white">{selectedAccount.nome}</h3>
                    <p className="text-sm text-white/70">
                      {ACCOUNT_TYPE_LABELS[mapDBAccountTypeToFormType(selectedAccount.tipo)]}
                    </p>
                  </div>
                  <Badge
                    variant={selectedAccount.ativa ? 'default' : 'secondary'}
                    className={`text-sm ${selectedAccount.ativa ? 'bg-green-500/90 text-white' : 'bg-gray-600 text-white'}`}
                  >
                    {selectedAccount.ativa ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>

                <Separator className="bg-white/20" />

                {/* Account Details */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white/70">Saldo Inicial</p>
                    <p className="text-lg font-semibold text-white">{formatCurrency(selectedAccount.saldo_inicial)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white/70">Saldo Atual</p>
                    <p className={`text-lg font-semibold ${
                      (selectedAccount.saldo_atual || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(selectedAccount.saldo_atual || 0)}
                    </p>
                  </div>
                  {selectedAccount.agencia && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white/70">Agência</p>
                      <p className="text-base text-white">{selectedAccount.agencia}</p>
                    </div>
                  )}
                  {selectedAccount.numero && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white/70">Número da Conta</p>
                      <p className="text-base text-white">{selectedAccount.numero}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white/70">Criada em</p>
                    <p className="text-base text-white">
                      {new Date(selectedAccount.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white/70">Última atualização</p>
                    <p className="text-base text-white">
                      {new Date(selectedAccount.updated_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {selectedAccount.observacoes && (
                  <>
                    <Separator className="bg-white/20" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white/70">Observações</p>
                      <p className="text-base text-white">{selectedAccount.observacoes}</p>
                    </div>
                  </>
                )}

                {/* Transactions Section */}
                <Separator className="bg-white/20" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white">Últimas Transações</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10"
                      onClick={() => {
                        setDetailsDialogOpen(false)
                        // TODO: Navigate to transactions page with account filter
                      }}
                    >
                      Ver todas
                    </Button>
                  </div>

                  {loadingTransactions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  ) : accountTransactions.length > 0 ? (
                    <>
                      {/* Transaction Summary */}
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-green-500/20 border-green-500/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <ArrowUpRight className="h-4 w-4 text-green-400" />
                              <p className="text-xs font-medium text-green-400">Receitas</p>
                            </div>
                            <p className="text-lg font-bold text-green-300">
                              {formatCurrency(
                                accountTransactions
                                  .filter(t => t.tipo === 'receita')
                                  .reduce((sum, t) => sum + t.valor, 0)
                              )}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-red-500/20 border-red-500/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <ArrowDownRight className="h-4 w-4 text-red-400" />
                              <p className="text-xs font-medium text-red-400">Despesas</p>
                            </div>
                            <p className="text-lg font-bold text-red-300">
                              {formatCurrency(
                                accountTransactions
                                  .filter(t => t.tipo === 'despesa')
                                  .reduce((sum, t) => sum + t.valor, 0)
                              )}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Transaction List */}
                      <div className="space-y-2">
                        {accountTransactions.map((transaction) => {
                          const transactionDate = transaction.data instanceof Date
                            ? transaction.data
                            : new Date(transaction.data)
                          const isIncome = transaction.tipo === 'receita'

                          return (
                            <div
                              key={transaction.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                  isIncome
                                    ? 'bg-green-500/20'
                                    : 'bg-red-500/20'
                                }`}>
                                  {isIncome ? (
                                    <ArrowUpRight className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <ArrowDownRight className="h-4 w-4 text-red-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate text-white">{transaction.descricao}</p>
                                  <p className="text-xs text-white/70">
                                    {transactionDate.toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className={`text-sm font-semibold whitespace-nowrap ml-2 ${
                                isIncome
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }`}>
                                {isIncome ? '+' : '-'} {formatCurrency(transaction.valor)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-white/70">Nenhuma transação encontrada nesta conta.</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDetailsDialogOpen(false)}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      setDetailsDialogOpen(false)
                      handleEdit(selectedAccount)
                    }}
                    className="text-white"
                    style={{
                      backgroundColor: '#18B0A4',
                      color: '#ffffff'
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Conta"
          description="Tem certeza que deseja excluir esta conta? Todas as transações associadas também serão removidas. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleDelete}
          isDark={true}
        />
      </div>
    </DashboardLayout>
  )
}
