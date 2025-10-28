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
import { mapFormDataToCreateConta, mapDBAccountTypeToFormType } from "@/lib/adapters"
import type { Conta } from "@/lib/types"

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
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  // Carrega contas do banco
  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await contaService.listContas() // carrega todas as contas
      setAccounts(data)
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
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
    } catch (error) {
      console.error('Erro ao excluir conta:', error)
    }
  }

  const handleSubmit = async (data: AccountFormData) => {
    setFormLoading(true)
    try {
      // TODO: Precisa pegar instituicao_id - por ora usa um ID fixo ou cria instituição
      const instituicaoId = 'default-institution-id'
      const contaData = mapFormDataToCreateConta(data, instituicaoId)
      await contaService.createConta(contaData)
      await loadAccounts()
      setFormDialogOpen(false)
    } catch (error) {
      console.error('Erro ao criar conta:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value))
  }

  const totalBalance = accounts.reduce((sum, account) => sum + (account.saldo_atual || 0), 0)

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
            <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Conta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Conta</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova conta ou cartão ao seu sistema financeiro.
                  </DialogDescription>
                </DialogHeader>
                <AccountForm
                  onSubmit={handleSubmit}
                  onCancel={() => setFormDialogOpen(false)}
                  isLoading={formLoading}
                  submitLabel="Criar Conta"
                />
              </DialogContent>
            </Dialog>
          }
        />

        {/* Total Balance Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Saldo Total</CardTitle>
            <CardDescription>Soma de todas as contas ativas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {accounts.filter(a => a.ativa).length} contas ativas
            </p>
          </CardContent>
        </Card>

        {/* Accounts Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const Icon = getAccountIcon(account.tipo)
            const formType = mapDBAccountTypeToFormType(account.tipo)
            return (
              <Card key={account.id} className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: account.cor || '#3B82F6' }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${account.cor || '#3B82F6'}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: account.cor || '#3B82F6' }} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{account.nome}</CardTitle>
                        <CardDescription className="text-xs">
                          {ACCOUNT_TYPE_LABELS[formType]}
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
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <EyeOff className="mr-2 h-4 w-4" />
                          {account.ativa ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
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
                      <p className="text-xs text-muted-foreground">
                        Agência: {account.agencia}
                      </p>
                    )}
                    <div className="flex items-baseline justify-between">
                      <span
                        className={`text-2xl font-bold ${
                          (account.saldo_atual || 0) >= 0 ? 'text-foreground' : 'text-destructive'
                        }`}
                      >
                        {formatCurrency(account.saldo_atual || 0)}
                      </span>
                      <Badge variant={account.ativa ? 'default' : 'secondary'}>
                        {account.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Conta"
          description="Tem certeza que deseja excluir esta conta? Todas as transações associadas também serão removidas. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  )
}
