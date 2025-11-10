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
import { Plus, Building2, PiggyBank, CreditCard, TrendingUp, Wallet, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Link2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { contaService } from "@/lib/services/conta.service"
import { instituicaoService } from "@/lib/services/instituicao.service"
import { mapFormDataToCreateConta, mapDBAccountTypeToFormType, mapContaToFormData } from "@/lib/adapters"
import type { Conta, Instituicao } from "@/lib/types"
import { toast } from "sonner"
import { transacaoService } from "@/lib/services/transacao.service"
import type { Transacao } from "@/lib/types"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { BankLogo } from "@/components/ui/bank-logo"

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
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([])
  const [accountStats, setAccountStats] = useState<Record<string, { transactionCount: number }>>({})

  const { formatCurrency: formatCurrencyWithSettings } = useLocalizationSettings()

  // Carrega contas e instituições do banco
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([
      loadAccounts(),
      loadInstituicoes()
    ])
  }

  const loadInstituicoes = async () => {
    try {
      const data = await instituicaoService.listInstituicoes()
      setInstituicoes(data)
    } catch (error) {
      console.error('Erro ao carregar instituições:', error)
    }
  }

  // Helper para buscar instituição da conta
  const getInstituicao = (conta: Conta): Instituicao | undefined => {
    return instituicoes.find(inst => inst.id === conta.instituicao_id)
  }

  // Helper para buscar conta pai
  const getContaPai = (conta: Conta): Conta | undefined => {
    if (!conta.conta_pai_id) return undefined
    return accounts.find(acc => acc.id === conta.conta_pai_id)
  }

  // Função para organizar contas agrupando pais e filhos
  const organizeAccountsHierarchy = (accountsList: Conta[]): Conta[] => {
    const organized: Conta[] = []
    const processed = new Set<string>()

    // Primeiro, adiciona contas sem pai (contas principais)
    accountsList.forEach(account => {
      if (!account.conta_pai_id && !processed.has(account.id)) {
        organized.push(account)
        processed.add(account.id)

        // Logo após cada conta pai, adiciona suas contas filhas
        const children = accountsList.filter(acc =>
          acc.conta_pai_id === account.id && !processed.has(acc.id)
        )
        children.forEach(child => {
          organized.push(child)
          processed.add(child.id)
        })
      }
    })

    // Adiciona contas vinculadas cujo pai não está na lista filtrada
    accountsList.forEach(account => {
      if (!processed.has(account.id)) {
        organized.push(account)
        processed.add(account.id)
      }
    })

    return organized
  }

  // Aplica filtros quando accounts ou selectedTypeFilter mudam
  useEffect(() => {
    let filtered: Conta[]
    if (selectedTypeFilter === 'all') {
      filtered = accounts
    } else {
      filtered = accounts.filter(acc => acc.tipo === selectedTypeFilter)
    }

    // Organiza hierarquicamente
    const organized = organizeAccountsHierarchy(filtered)
    setFilteredAccounts(organized)
  }, [accounts, selectedTypeFilter])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await contaService.listContas({ incluirInativas: true }) // carrega todas as contas (ativas e inativas)
      setAccounts(data)

      // Carrega estatísticas de cada conta
      const stats: Record<string, { transactionCount: number }> = {}
      for (const account of data) {
        try {
          const transactions = await transacaoService.listTransacoes({
            contaId: account.id,
          })
          stats[account.id] = {
            transactionCount: transactions.length
          }
        } catch (error) {
          console.error(`Erro ao carregar transações da conta ${account.id}:`, error)
          stats[account.id] = { transactionCount: 0 }
        }
      }
      setAccountStats(stats)
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
        const contaData = mapFormDataToCreateConta(data, instituicaoId, accounts)
        await contaService.updateConta(selectedAccount.id, contaData)
        toast.success('Conta atualizada', {
          description: 'A conta foi atualizada com sucesso.',
        })
      } else {
        // Modo criação
        const instituicaoId = data.institution || ''
        const contaData = mapFormDataToCreateConta(data, instituicaoId, accounts)
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

  const totalBalance = accounts
    .filter(account => account.ativa) // Só soma contas ativas
    .reduce((sum, account) => sum + (account.saldo_atual || 0), 0)

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
              
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          }
        />

        {/* Total Balance Card - TEMA.md: KPI com shadow-2 */}
        <Card className="shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)] bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">Saldo Total</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">Soma de todas as contas ativas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gold">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-sm mt-2 text-muted-foreground">
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
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-[12px] border transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]"
                    : "bg-card text-foreground border-border hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{filter.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-1",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
                  )}
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
              <Wallet className="h-12 w-12 mx-auto mb-4 text-secondary" />
              <p className="text-muted-foreground">Nenhuma conta encontrada para este filtro.</p>
            </div>
          ) : (
            filteredAccounts.map((account) => {
            const Icon = getAccountIcon(account.tipo)
            const formType = mapDBAccountTypeToFormType(account.tipo)
            const contaPai = getContaPai(account)
            const isLinkedAccount = !!account.conta_pai_id
            return (
              <Card
                key={account.id}
                className="relative overflow-hidden transition-all hover:shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)] bg-card border-border"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: account.cor || 'hsl(var(--border))',
                  ...(isLinkedAccount && { paddingLeft: '1.5rem' })
                }}
              >
                <CardHeader className={isLinkedAccount ? "pb-1 pt-2" : "pb-3"}>
                  <div className="flex items-start justify-between">
                    <div className={`flex items-center ${isLinkedAccount ? 'gap-2' : 'gap-3'}`}>
                      <BankLogo
                        logoUrl={getInstituicao(account)?.logo_url}
                        bankName={getInstituicao(account)?.nome || account.nome}
                        size={isLinkedAccount ? 32 : 40}
                      />
                      <div>
                        <CardTitle className={`${isLinkedAccount ? 'text-sm' : 'text-base'} text-foreground`}>{account.nome}</CardTitle>
                        <CardDescription className={`${isLinkedAccount ? 'text-[11px]' : 'text-xs'} text-muted-foreground`}>
                          {ACCOUNT_TYPE_LABELS[formType]}
                        </CardDescription>
                        {contaPai && (
                          <div
                            className="flex items-center gap-0.5 mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded w-fit bg-muted"
                            style={{
                              borderLeft: `2px solid ${contaPai.cor}`,
                            }}
                          >
                            <Link2 className="h-2.5 w-2.5" style={{ color: contaPai.cor }} />
                            <span>Vinculada a: <span className="font-semibold">{contaPai.nome}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleViewDetails(account)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEdit(account)}
                          className="cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(account)}
                          className="cursor-pointer"
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          {account.ativa ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
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
                <CardContent className={isLinkedAccount ? "pt-1 pb-2" : ""}>
                  <div className={isLinkedAccount ? "space-y-1" : "space-y-3"}>
                    {/* Saldo e Status */}
                    <div className="flex items-baseline justify-between">
                      <span
                        className={`${isLinkedAccount ? 'text-lg' : 'text-2xl'} font-bold text-gold`}
                      >
                        {formatCurrency(account.saldo_atual || 0)}
                      </span>
                      <Badge
                        variant={account.ativa ? 'success' : 'secondary'}
                        className={`${isLinkedAccount ? 'text-[10px] px-2 py-0.5' : ''}`}
                      >
                        {account.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>

                    {/* Informações adicionais */}
                    <div
                      className={`flex items-center justify-between ${isLinkedAccount ? 'text-[10px]' : 'text-xs'} ${isLinkedAccount ? 'pt-1' : 'pt-2'} text-muted-foreground border-t border-border`}
                    >
                      <div className="flex items-center gap-1">
                        <span>📅</span>
                        <span>
                          Criada em {new Date(account.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>💸</span>
                        <span>{accountStats[account.id]?.transactionCount || 0} movimentações</span>
                      </div>
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
          >
            <DialogHeader>
              <DialogTitle className="text-foreground">{editMode ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
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
              currentAccountId={selectedAccount?.id}
            />
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle className="text-foreground">Detalhes da Conta</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Informações completas da conta selecionada.
              </DialogDescription>
            </DialogHeader>
            {selectedAccount && (
              <div className="space-y-6">
                {/* Account Header */}
                <div className="flex items-center gap-4">
                  <BankLogo
                    logoUrl={getInstituicao(selectedAccount)?.logo_url}
                    bankName={getInstituicao(selectedAccount)?.nome || selectedAccount.nome}
                    size={48}
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground">{selectedAccount.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[mapDBAccountTypeToFormType(selectedAccount.tipo)]}
                    </p>
                  </div>
                  <Badge
                  variant={selectedAccount.ativa ? 'success' : 'secondary'}
                  className="text-sm"
                  >
                    {selectedAccount.ativa ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>

                <Separator />

                {/* Account Details */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Saldo de Referência</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(selectedAccount.saldo_referencia)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedAccount.data_referencia).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
                    <p className="text-lg font-semibold text-gold">
                      {formatCurrency(selectedAccount.saldo_atual || 0)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Criada em</p>
                    <p className="text-base text-foreground">
                      {new Date(selectedAccount.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Última atualização</p>
                    <p className="text-base text-foreground">
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
                    <Separator className="bg-border" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Observações</p>
                      <p className="text-base text-foreground">{selectedAccount.observacoes}</p>
                    </div>
                  </>
                )}

                {/* Transactions Section */}
                <Separator className="bg-border" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">Últimas Transações</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-accent"
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
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : accountTransactions.length > 0 ? (
                    <>
                      {/* Transaction Summary */}
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-success/20 border-success/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <ArrowUpRight className="h-4 w-4 text-success" />
                              <p className="text-xs font-medium text-success">Receitas</p>
                            </div>
                            <p className="text-lg font-bold text-success">
                              {formatCurrency(
                                accountTransactions
                                  .filter(t => t.tipo === 'receita')
                                  .reduce((sum, t) => sum + t.valor, 0)
                              )}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-destructive/20 border-destructive/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <ArrowDownRight className="h-4 w-4 text-destructive" />
                              <p className="text-xs font-medium text-destructive">Despesas</p>
                            </div>
                            <p className="text-lg font-bold text-destructive">
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
                              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full",
                                    isIncome ? "bg-success/20" : "bg-destructive/20"
                                  )}
                                >
                                  {isIncome ? (
                                    <ArrowUpRight className="h-4 w-4 text-success" />
                                  ) : (
                                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{transaction.descricao}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {transactionDate.toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "text-sm font-semibold whitespace-nowrap ml-2",
                                  isIncome ? "text-success" : "text-destructive"
                                )}
                              >
                                {isIncome ? '+' : '-'} {formatCurrency(transaction.valor)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">Nenhuma transação encontrada nesta conta.</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDetailsDialogOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      setDetailsDialogOpen(false)
                      handleEdit(selectedAccount)
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
