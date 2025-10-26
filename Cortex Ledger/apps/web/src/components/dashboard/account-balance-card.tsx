'use client'

import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Wallet, CreditCard, TrendingUp } from 'lucide-react'

interface AccountBalanceCardProps {
  id: string
  apelido: string
  tipo: string
  saldo: number
  moeda: string
}

const accountTypeIcons = {
  corrente: Wallet,
  poupanca: TrendingUp,
  cartao: CreditCard,
  corretora: TrendingUp,
  investimento: TrendingUp,
}

const accountTypeLabels = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  cartao: 'Cartão',
  corretora: 'Corretora',
  investimento: 'Investimento',
}

export function AccountBalanceCard({ apelido, tipo, saldo, moeda }: AccountBalanceCardProps) {
  const Icon = accountTypeIcons[tipo as keyof typeof accountTypeIcons] || Wallet
  const tipoLabel = accountTypeLabels[tipo as keyof typeof accountTypeLabels] || tipo

  const isNegative = saldo < 0
  const isPositive = saldo > 0

  return (
    <Card hover>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-50 p-2.5 dark:bg-primary-950">
              <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {apelido}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{tipoLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                isNegative
                  ? 'text-error-600 dark:text-error-400'
                  : isPositive
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-neutral-900 dark:text-neutral-50'
              }`}
            >
              {formatCurrency(saldo, moeda)}
            </span>
          </div>
        </div>

        {tipo === 'cartao' && saldo < 0 && (
          <div className="mt-3">
            <Badge variant="warning" className="text-xs">
              Fatura a pagar
            </Badge>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
