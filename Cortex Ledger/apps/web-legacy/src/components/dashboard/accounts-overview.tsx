'use client'

import { memo } from 'react'
import { useAccounts } from '@/lib/hooks/use-accounts'
import { AccountBalanceCard } from './account-balance-card'
import { Card, CardBody } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export const AccountsOverview = memo(function AccountsOverview() {
  const { data: accounts, isLoading, error } = useAccounts()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-error-600">
            Erro ao carregar contas. Verifique sua conexão.
          </p>
        </CardBody>
      </Card>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-600 dark:text-graphite-300">
            Nenhuma conta encontrada. Importe suas transações para começar.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {accounts.map((account) => (
        <AccountBalanceCard key={account.id} {...account} />
      ))}
    </div>
  )
})
