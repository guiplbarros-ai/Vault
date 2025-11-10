'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { investimentoService } from '@/lib/services/investimento.service'
import { TrendingUp, TrendingDown, Calendar, DollarSign, Activity } from 'lucide-react'
import type { InvestimentoComRelacoes } from '@/lib/types'

interface InvestmentDetailModalProps {
  investmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TIPO_LABELS: Record<string, string> = {
  renda_fixa: 'Renda Fixa',
  renda_variavel: 'Renda Variável',
  fundo_investimento: 'Fundos',
  previdencia: 'Previdência',
  criptomoeda: 'Criptomoedas',
  outro: 'Outros',
}

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  resgatado: 'Resgatado',
  vencido: 'Vencido',
}

const MOVIMENTACAO_LABELS: Record<string, string> = {
  aporte: 'Aporte',
  resgate: 'Resgate',
  rendimento: 'Rendimento',
  ajuste: 'Ajuste',
}

export function InvestmentDetailModal({
  investmentId,
  open,
  onOpenChange,
}: InvestmentDetailModalProps) {
  const [investment, setInvestment] = useState<InvestimentoComRelacoes | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (investmentId && open) {
      loadInvestment()
    }
  }, [investmentId, open])

  async function loadInvestment() {
    if (!investmentId) return

    try {
      setLoading(true)
      const data = await investimentoService.getInvestimentoComRelacoes(investmentId)
      setInvestment(data)
    } catch (error) {
      console.error('Erro ao carregar investimento:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  if (!investment && !loading) {
    return null
  }

  const rentabilidade = investment
    ? ((investment.valor_atual - investment.valor_aplicado) / investment.valor_aplicado) * 100
    : 0
  const lucro = investment ? investment.valor_atual - investment.valor_aplicado : 0
  const isPositive = rentabilidade >= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Detalhes do Investimento</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Informações completas e histórico de movimentações
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : investment ? (
          <div className="space-y-6">
            {/* Header com nome e badges */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">{investment.nome}</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="border-primary bg-primary/20">
                  <span className="text-primary">{TIPO_LABELS[investment.tipo] || investment.tipo}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    investment.status === 'ativo'
                      ? 'border-success bg-success/20 text-success'
                      : 'border-destructive bg-destructive/20 text-destructive'
                  }
                >
                  {STATUS_LABELS[investment.status]}
                </Badge>
                {investment.ticker && (
                  <Badge variant="outline" className="border-border">
                    <span className="text-muted-foreground">{investment.ticker}</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Informações financeiras */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <DollarSign className="h-4 w-4" />
                  Valor Aplicado
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatCurrency(investment.valor_aplicado)}
                </div>
              </div>
              <div className="space-y-1 p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Activity className="h-4 w-4" />
                  Valor Atual
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatCurrency(investment.valor_atual)}
                </div>
              </div>
              <div className="space-y-1 p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  Rentabilidade
                </div>
                <div
                  className={`text-lg font-semibold ${
                    isPositive ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {rentabilidade.toFixed(2)}%
                </div>
              </div>
              <div className="space-y-1 p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <DollarSign className="h-4 w-4" />
                  Lucro/Prejuízo
                </div>
                <div
                  className={`text-lg font-semibold ${
                    isPositive ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {formatCurrency(lucro)}
                </div>
              </div>
            </div>

            {/* Informações adicionais */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Instituição</span>
                <span className="text-sm font-medium text-foreground">{investment.instituicao.nome}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data de Aplicação</span>
                <span className="text-sm font-medium text-foreground">
                  {formatDate(investment.data_aplicacao)}
                </span>
              </div>
              {investment.data_vencimento && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Data de Vencimento</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatDate(investment.data_vencimento)}
                  </span>
                </div>
              )}
              {investment.quantidade && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantidade</span>
                  <span className="text-sm font-medium text-foreground">
                    {investment.quantidade.toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {investment.taxa_juros && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de Juros</span>
                  <span className="text-sm font-medium text-foreground">{investment.taxa_juros}% a.a.</span>
                </div>
              )}
              {investment.indexador && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Indexador</span>
                  <span className="text-sm font-medium text-foreground">{investment.indexador}</span>
                </div>
              )}
              {investment.conta_origem && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conta de Origem</span>
                  <span className="text-sm font-medium text-foreground">{investment.conta_origem.nome}</span>
                </div>
              )}
            </div>

            {/* Histórico de movimentações */}
            {investment.historico && investment.historico.length > 0 && (
              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Histórico de Movimentações
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {investment.historico.map((mov) => (
                    <div
                      key={mov.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">
                          {MOVIMENTACAO_LABELS[mov.tipo_movimentacao]}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(mov.data)}</div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium ${
                            mov.tipo_movimentacao === 'rendimento' || mov.tipo_movimentacao === 'aporte'
                              ? 'text-success'
                              : 'text-foreground'
                          }`}
                        >
                          {formatCurrency(mov.valor)}
                        </div>
                        {mov.quantidade && (
                          <div className="text-xs text-muted-foreground">Qtd: {mov.quantidade}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            {investment.observacoes && (
              <div className="space-y-2 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground">Observações</h4>
                <p className="text-sm text-muted-foreground">{investment.observacoes}</p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
