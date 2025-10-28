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
            <div className="rounded-lg bg-slate-100 dark:bg-graphite-700 p-2.5">
              <Icon className="h-5 w-5 text-slate-700 dark:text-graphite-200" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-graphite-100">
                {apelido}
              </p>
              <p className="text-xs text-slate-600 dark:text-graphite-300">{tipoLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                isNegative
                  ? 'text-error-600'
                  : isPositive
                  ? 'text-success-600'
                  : 'text-slate-900 dark:text-graphite-100'
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
