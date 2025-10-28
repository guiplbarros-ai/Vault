'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, CreditCard, Wallet, TrendingUp, DollarSign } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import type { Account } from '@/lib/hooks/use-accounts'

interface AccountsListProps {
  accounts: Account[]
  onEdit: (account: Account) => void
}

const TIPO_ICONS: Record<string, any> = {
  corrente: Wallet,
  poupanca: TrendingUp,
  investimento: TrendingUp,
  cartao_credito: CreditCard,
  cartao_debito: CreditCard,
}

const TIPO_LABELS: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  investimento: 'Investimento',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
}

export function AccountsList({ accounts, onEdit }: AccountsListProps) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - marca como inativa
      const { error } = await supabase
        .from('conta')
        .update({ ativa: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      showToast({
        type: 'success',
        title: 'Conta desativada',
        message: 'A conta foi desativada com sucesso.',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Erro ao desativar conta',
        message: error.message || 'Ocorreu um erro inesperado.',
      })
    },
  })

  const handleDelete = (account: Account) => {
    if (confirm(`Tem certeza que deseja desativar a conta "${account.apelido}"?`)) {
      deleteMutation.mutate(account.id)
    }
  }

  const formatCurrency = (value: number, moeda: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda,
    }).format(value)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => {
        const Icon = TIPO_ICONS[account.tipo] || Wallet
        const tipoLabel = TIPO_LABELS[account.tipo] || account.tipo

        return (
          <Card key={account.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text">{account.apelido}</h3>
                    <p className="text-sm text-muted">{tipoLabel}</p>
                  </div>
                </div>
                <Badge variant="neutral">{account.moeda}</Badge>
              </div>

              <div className="mb-4">
                <p className="text-2xl font-bold text-text">
                  {formatCurrency(account.saldo || 0, account.moeda)}
                </p>
                <p className="text-xs text-muted">Saldo atual</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(account)}
                  className="flex-1"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(account)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
