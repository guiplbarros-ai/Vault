'use client'

import { CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CartaoCardProps {
  cartao: {
    id: string
    nome: string
    bandeira: string
    ultimosDigitos: string
    limiteTotal: number
    limiteDisponivel: number
    faturaAtual: number
    vencimento: string
    utilizacao: number
    status: string
  }
  onClick?: () => void
}

export function CartaoCard({ cartao, onClick }: CartaoCardProps) {
  const getStatusColor = (utilizacao: number) => {
    if (utilizacao < 50) return 'text-emerald-600 dark:text-emerald-400'
    if (utilizacao < 80) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getUtilizacaoColor = (utilizacao: number) => {
    if (utilizacao < 50) return 'bg-emerald-500'
    if (utilizacao < 80) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <Card
      className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-graphite-50">
            {cartao.nome}
          </h3>
          <p className="text-sm text-slate-600 dark:text-graphite-400">
            **** {cartao.ultimosDigitos}
          </p>
        </div>
        <CreditCard className="h-6 w-6 text-slate-400" />
      </div>

      <div className="space-y-4">
        {/* Limite */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-600 dark:text-graphite-400">Limite</span>
            <span className={`font-semibold ${getStatusColor(cartao.utilizacao)}`}>
              {cartao.utilizacao}% usado
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-graphite-700 rounded-full h-2">
            <div
              className={`${getUtilizacaoColor(cartao.utilizacao)} h-2 rounded-full transition-all`}
              style={{ width: `${cartao.utilizacao}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-slate-500 dark:text-graphite-500">
              R$ {cartao.limiteDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} disponível
            </span>
            <span className="text-slate-500 dark:text-graphite-500">
              R$ {cartao.limiteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Fatura Atual */}
        <div className="pt-4 border-t border-slate-200 dark:border-graphite-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 dark:text-graphite-400">Fatura Atual</p>
              <p className="text-lg font-bold text-slate-900 dark:text-graphite-50">
                R$ {cartao.faturaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600 dark:text-graphite-400">Vencimento</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-graphite-50">
                {new Date(cartao.vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="pt-4 border-t border-slate-200 dark:border-graphite-700">
          <Button variant="outline" className="w-full" size="sm">
            Ver Detalhes
          </Button>
        </div>
      </div>
    </Card>
  )
}
