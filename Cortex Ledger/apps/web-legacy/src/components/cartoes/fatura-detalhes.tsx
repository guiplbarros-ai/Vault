'use client'

import { Calendar, Receipt, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FaturaDetalhesProps {
  fatura: {
    id: string
    mesReferencia: string
    dataFechamento: string
    dataVencimento: string
    valorTotal: number
    valorPago: number
    status: 'aberta' | 'fechada' | 'paga' | 'atrasada' | 'parcial'
  }
  transacoes: Array<{
    id: string
    data: string
    descricao: string
    categoria?: string
    valor: number
    parcelaAtual?: number
    parcelasTotal?: number
  }>
  onPagarFatura?: () => void
}

export function FaturaDetalhes({ fatura, transacoes, onPagarFatura }: FaturaDetalhesProps) {
  const getStatusBadge = (status: string) => {
    const badges = {
      aberta: { text: 'Aberta', variant: 'default' as const },
      fechada: { text: 'Fechada', variant: 'secondary' as const },
      paga: { text: 'Paga', variant: 'success' as const },
      atrasada: { text: 'Atrasada', variant: 'destructive' as const },
      parcial: { text: 'Paga Parcialmente', variant: 'warning' as const },
    }
    const badge = badges[status as keyof typeof badges] || badges.aberta
    return <Badge variant={badge.variant}>{badge.text}</Badge>
  }

  const diasParaVencimento = Math.ceil(
    (new Date(fatura.dataVencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const isVencimentoProximo = diasParaVencimento <= 7 && diasParaVencimento > 0
  const isVencida = diasParaVencimento < 0

  return (
    <div className="space-y-6">
      {/* Header da Fatura */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-graphite-50">
                Fatura {new Date(fatura.mesReferencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              {getStatusBadge(fatura.status)}
            </div>
            <p className="text-sm text-slate-600 dark:text-graphite-400">
              Período de {new Date(fatura.mesReferencia).toLocaleDateString('pt-BR')} a {new Date(fatura.dataFechamento).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Receipt className="h-8 w-8 text-slate-400" />
        </div>

        {/* Valor Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-slate-600 dark:text-graphite-400 mb-1">Valor Total</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-graphite-50">
              R$ {fatura.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-graphite-400 mb-1">Valor Pago</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              R$ {fatura.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-graphite-400 mb-1">Saldo Devedor</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              R$ {(fatura.valorTotal - fatura.valorPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-graphite-800 rounded-xl">
            <Calendar className="h-5 w-5 text-slate-600 dark:text-graphite-400" />
            <div>
              <p className="text-xs text-slate-600 dark:text-graphite-400">Fechamento</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-graphite-50">
                {new Date(fatura.dataFechamento).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl ${
            isVencida
              ? 'bg-red-50 dark:bg-red-900/20'
              : isVencimentoProximo
              ? 'bg-amber-50 dark:bg-amber-900/20'
              : 'bg-slate-50 dark:bg-graphite-800'
          }`}>
            <Calendar className={`h-5 w-5 ${
              isVencida
                ? 'text-red-600 dark:text-red-400'
                : isVencimentoProximo
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-graphite-400'
            }`} />
            <div>
              <p className="text-xs text-slate-600 dark:text-graphite-400">Vencimento</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-graphite-50">
                {new Date(fatura.dataVencimento).toLocaleDateString('pt-BR')}
                {diasParaVencimento > 0 && (
                  <span className="text-xs ml-2">
                    ({diasParaVencimento} {diasParaVencimento === 1 ? 'dia' : 'dias'})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {(isVencimentoProximo || isVencida) && fatura.status !== 'paga' && (
          <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 ${
            isVencida
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}>
            <AlertCircle className={`h-5 w-5 mt-0.5 ${
              isVencida ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                isVencida ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100'
              }`}>
                {isVencida
                  ? 'Fatura vencida!'
                  : `Fatura vence em ${diasParaVencimento} ${diasParaVencimento === 1 ? 'dia' : 'dias'}`
                }
              </p>
              <p className={`text-xs mt-1 ${
                isVencida ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {isVencida
                  ? 'Realize o pagamento o quanto antes para evitar juros e multas.'
                  : 'Não se esqueça de realizar o pagamento antes do vencimento.'}
              </p>
            </div>
          </div>
        )}

        {/* Botão Pagar */}
        {fatura.status !== 'paga' && onPagarFatura && (
          <Button
            onClick={onPagarFatura}
            className="w-full bg-brand-600 hover:bg-brand-700"
            size="lg"
          >
            Registrar Pagamento
          </Button>
        )}
      </Card>

      {/* Lista de Transações */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-graphite-50 mb-4">
          Lançamentos ({transacoes.length})
        </h3>

        <div className="space-y-2">
          {transacoes.map((transacao) => (
            <div
              key={transacao.id}
              className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-graphite-800 rounded-xl transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-graphite-50">
                    {transacao.descricao}
                  </p>
                  {transacao.parcelasTotal && (
                    <Badge variant="secondary" className="text-xs">
                      {transacao.parcelaAtual}/{transacao.parcelasTotal}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-slate-600 dark:text-graphite-400">
                    {new Date(transacao.data).toLocaleDateString('pt-BR')}
                  </p>
                  {transacao.categoria && (
                    <>
                      <span className="text-slate-400">•</span>
                      <p className="text-xs text-slate-600 dark:text-graphite-400">
                        {transacao.categoria}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-graphite-50">
                R$ {Math.abs(transacao.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}

          {transacoes.length === 0 && (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-slate-300 dark:text-graphite-600 mx-auto mb-3" />
              <p className="text-sm text-slate-600 dark:text-graphite-400">
                Nenhum lançamento nesta fatura
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
