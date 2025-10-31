'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, CreditCard, DollarSign, Eye } from 'lucide-react'
import { STATUS_FATURA, STATUS_FATURA_COLORS } from '@/lib/constants'
import type { StatusFatura } from '@/lib/types'

interface FaturaCardProps {
  id: string
  mes_referencia: string
  data_vencimento: Date
  valor_total: number
  valor_pago: number
  status: StatusFatura
  cartao_nome: string
  onViewDetails?: (id: string) => void
  onPay?: (id: string) => void
}

export function FaturaCard({
  id,
  mes_referencia,
  data_vencimento,
  valor_total,
  valor_pago,
  status,
  cartao_nome,
  onViewDetails,
  onPay,
}: FaturaCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatMesReferencia = (mesRef: string) => {
    const [ano, mes] = mesRef.split('-')
    const date = new Date(parseInt(ano), parseInt(mes) - 1)
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })
  }

  const statusColor = STATUS_FATURA_COLORS[status]
  const statusLabel = STATUS_FATURA[status]
  
  const valorRestante = valor_total - valor_pago
  const isVencida = status === 'atrasada'
  const isPaga = status === 'paga'

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-all"
      style={{
        background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
        backgroundColor: '#3B5563'
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg capitalize text-white">
              {formatMesReferencia(mes_referencia)}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 text-white/70">
              <CreditCard className="h-3 w-3" />
              {cartao_nome}
            </CardDescription>
          </div>
          <Badge
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
              borderColor: statusColor,
            }}
            className="border"
          >
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Valor Total</span>
            <span className="text-2xl font-bold text-white">{formatCurrency(valor_total)}</span>
          </div>

          {!isPaga && valor_pago > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Valor Pago</span>
                <span className="font-medium text-green-400">
                  {formatCurrency(valor_pago)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Valor Restante</span>
                <span className={`font-semibold ${isVencida ? 'text-red-400' : 'text-white'}`}>
                  {formatCurrency(valorRestante)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Vencimento */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-white/70" />
          <span className="text-white/70">Vencimento:</span>
          <span className={`font-medium ${isVencida ? 'text-red-400' : 'text-white'}`}>
            {formatDate(data_vencimento)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
              onClick={() => onViewDetails(id)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalhes
            </Button>
          )}
          {onPay && !isPaga && (
            <Button
              size="sm"
              className="flex-1 text-white"
              onClick={() => onPay(id)}
              style={{
                backgroundColor: isVencida ? '#ef4444' : '#18B0A4',
                color: '#ffffff'
              }}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Pagar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

