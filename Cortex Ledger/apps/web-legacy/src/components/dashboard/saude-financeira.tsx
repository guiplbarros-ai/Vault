'use client'

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { useSaudeFinanceira } from '@/lib/hooks/use-saude-financeira'

export function SaudeFinanceira() {
  const { data, isLoading, error } = useSaudeFinanceira()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saúde Financeira</CardTitle>
          <CardDescription>Indicadores de desempenho financeiro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saúde Financeira</CardTitle>
          <CardDescription>Indicadores de desempenho financeiro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-error-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            Erro ao carregar indicadores
          </div>
        </CardContent>
      </Card>
    )
  }

  const {
    poupancaPercentual,
    burnRate,
    runway,
    indiceDividas,
    receitaMedia,
    despesaMedia,
    saldoTotal,
  } = data

  // Definir cor baseado no status
  const getPoupancaColor = () => {
    if (poupancaPercentual >= 20) return 'text-success-600 bg-success-50'
    if (poupancaPercentual >= 10) return 'text-warning-600 bg-warning-50'
    return 'text-error-600 bg-error-50'
  }

  const getRunwayColor = () => {
    if (runway >= 6) return 'text-success-600 bg-success-50'
    if (runway >= 3) return 'text-warning-600 bg-warning-50'
    return 'text-error-600 bg-error-50'
  }

  const getDividasColor = () => {
    if (indiceDividas <= 50) return 'text-success-600 bg-success-50'
    if (indiceDividas <= 80) return 'text-warning-600 bg-warning-50'
    return 'text-error-600 bg-error-50'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saúde Financeira</CardTitle>
        <CardDescription>
          Indicadores baseados nos últimos 3 meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Poupança */}
          <div
            className={`p-4 rounded-lg border-2 ${
              poupancaPercentual >= 10 ? 'border-success-200' : 'border-error-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">
                Taxa de Poupança
              </span>
              {poupancaPercentual >= 10 ? (
                <TrendingUp className="h-4 w-4 text-success-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-error-600" />
              )}
            </div>
            <div
              className={`text-3xl font-bold ${
                poupancaPercentual >= 10 ? 'text-success-600' : 'text-error-600'
              }`}
            >
              {formatPercentage(poupancaPercentual, 1)}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {poupancaPercentual >= 20
                ? 'Excelente!'
                : poupancaPercentual >= 10
                ? 'Bom'
                : 'Melhorar'}
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <div className="text-xs text-neutral-600">
                Receita média: {formatCurrency(receitaMedia)}
              </div>
              <div className="text-xs text-neutral-600">
                Poupança: {formatCurrency(receitaMedia - despesaMedia)}/mês
              </div>
            </div>
          </div>

          {/* Burn Rate */}
          <div className="p-4 rounded-lg border-2 border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">Burn Rate</span>
              <CreditCard className="h-4 w-4 text-neutral-600" />
            </div>
            <div className="text-3xl font-bold text-neutral-900">
              {formatCurrency(burnRate)}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Despesas mensais</div>
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <div className="text-xs text-neutral-600">
                Média últimos 3 meses
              </div>
              <div className="text-xs text-neutral-600">
                Despesa total: {formatCurrency(despesaMedia * 3)}
              </div>
            </div>
          </div>

          {/* Runway */}
          <div
            className={`p-4 rounded-lg border-2 ${
              runway >= 3 ? 'border-success-200' : 'border-error-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">Runway</span>
              <Calendar className="h-4 w-4 text-primary-600" />
            </div>
            <div
              className={`text-3xl font-bold ${
                runway >= 3 ? 'text-success-600' : 'text-error-600'
              }`}
            >
              {runway.toFixed(1)}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {runway >= 6 ? 'Seguro!' : runway >= 3 ? 'Razoável' : 'Atenção!'}
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <div className="text-xs text-neutral-600">
                Saldo total: {formatCurrency(saldoTotal)}
              </div>
              <div className="text-xs text-neutral-600">
                Meses de reserva
              </div>
            </div>
          </div>

          {/* Índice de Dívidas */}
          <div
            className={`p-4 rounded-lg border-2 ${
              indiceDividas <= 50 ? 'border-success-200' : 'border-warning-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">
                Índice Despesas
              </span>
              <Wallet className="h-4 w-4 text-neutral-600" />
            </div>
            <div
              className={`text-3xl font-bold ${
                indiceDividas <= 50
                  ? 'text-success-600'
                  : indiceDividas <= 80
                  ? 'text-warning-600'
                  : 'text-error-600'
              }`}
            >
              {formatPercentage(indiceDividas, 0)}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {indiceDividas <= 50
                ? 'Equilibrado'
                : indiceDividas <= 80
                ? 'Atenção'
                : 'Alto'}
            </div>
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <div className="text-xs text-neutral-600">
                Despesas/Receitas
              </div>
              <div className="text-xs text-neutral-600">
                Ideal: &lt; 50%
              </div>
            </div>
          </div>
        </div>

        {/* Dicas */}
        <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <div className="text-sm font-medium text-primary-900 mb-2">
            Dicas de Saúde Financeira
          </div>
          <ul className="text-xs text-primary-800 space-y-1">
            {poupancaPercentual < 10 && (
              <li>• Tente poupar pelo menos 10-20% da sua receita mensal</li>
            )}
            {runway < 3 && (
              <li>• Construa uma reserva de emergência de pelo menos 3-6 meses</li>
            )}
            {indiceDividas > 80 && (
              <li>• Suas despesas estão muito altas em relação à receita</li>
            )}
            {poupancaPercentual >= 20 && runway >= 6 && (
              <li>✓ Parabéns! Sua saúde financeira está excelente!</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
