"use client"

import { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { orcamentoService } from '@/lib/services/orcamento.service'
import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthHistory {
  mes: string
  mesLabel: string
  totalPlanejado: number
  totalRealizado: number
  percentualUsado: number
  status: 'ok' | 'atencao' | 'excedido'
}

interface BudgetHistoryTableProps {
  mesReferencia: string
}

export function BudgetHistoryTable({ mesReferencia }: BudgetHistoryTableProps) {
  const [history, setHistory] = useState<MonthHistory[]>([])
  const [loading, setLoading] = useState(true)
  const { formatCurrency } = useLocalizationSettings()

  useEffect(() => {
    loadHistory()
  }, [mesReferencia])

  const loadHistory = async () => {
    try {
      setLoading(true)

      // Carrega dados dos últimos 12 meses
      const [ano, mes] = mesReferencia.split('-').map(Number)
      const mesAtual = new Date(ano, mes - 1)
      const meses = []

      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(mesAtual, i)
        const monthKey = format(monthDate, 'yyyy-MM')
        meses.push(monthKey)
      }

      // Fetch data para cada mês
      const historyData = await Promise.all(
        meses.map(async (mes) => {
          try {
            const resumo = await orcamentoService.getResumoMensal(mes)
            const mesDate = new Date(mes.split('-').map(Number)[0], mes.split('-').map(Number)[1] - 1)
            const mesLabel = format(mesDate, 'MMM/yy', { locale: ptBR })

            let status: 'ok' | 'atencao' | 'excedido' = 'ok'
            if (resumo.percentual_usado > 100) status = 'excedido'
            else if (resumo.percentual_usado > 80) status = 'atencao'

            return {
              mes,
              mesLabel,
              totalPlanejado: resumo.total_planejado,
              totalRealizado: resumo.total_realizado,
              percentualUsado: resumo.percentual_usado,
              status,
            }
          } catch (error) {
            console.error(`Erro ao carregar dados do mês ${mes}:`, error)
            return null
          }
        })
      )

      setHistory(historyData.filter(Boolean) as MonthHistory[])
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </Card>
    )
  }

  const getStatusColor = (status: 'ok' | 'atencao' | 'excedido') => {
    switch (status) {
      case 'ok':
        return 'bg-green-50 dark:bg-green-950'
      case 'atencao':
        return 'bg-yellow-50 dark:bg-yellow-950'
      case 'excedido':
        return 'bg-red-50 dark:bg-red-950'
    }
  }

  const getStatusTextColor = (status: 'ok' | 'atencao' | 'excedido') => {
    switch (status) {
      case 'ok':
        return 'text-green-600 dark:text-green-400'
      case 'atencao':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'excedido':
        return 'text-red-600 dark:text-red-400'
    }
  }

  const getStatusIcon = (status: 'ok' | 'atencao' | 'excedido') => {
    switch (status) {
      case 'ok':
        return <Minus className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'atencao':
        return <TrendingUp className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      case 'excedido':
        return <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Histórico de Orçamentos</h3>
        <p className="text-sm text-muted-foreground">Visualize mês a mês os últimos 12 meses</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Sem histórico disponível</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-semibold">Mês</th>
                <th className="text-right py-2 px-3 font-semibold">Planejado</th>
                <th className="text-right py-2 px-3 font-semibold">Realizado</th>
                <th className="text-right py-2 px-3 font-semibold">% Usado</th>
                <th className="text-center py-2 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, index) => (
                <tr
                  key={row.mes}
                  className={`border-b hover:bg-secondary/30 transition-colors ${getStatusColor(row.status)}`}
                >
                  <td className="py-3 px-3 font-medium">{row.mesLabel}</td>
                  <td className="text-right py-3 px-3">{formatCurrency(row.totalPlanejado)}</td>
                  <td className="text-right py-3 px-3">{formatCurrency(row.totalRealizado)}</td>
                  <td className="text-right py-3 px-3">
                    <span className={getStatusTextColor(row.status)}>
                      {row.percentualUsado.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center py-3 px-3">
                    <div className="flex justify-center">
                      {getStatusIcon(row.status)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumo estatístico */}
          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meses dentro do orçamento:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {history.filter(h => h.status === 'ok').length}/12
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa média de uso:</span>
                <span className="font-semibold">
                  {(history.reduce((acc, h) => acc + h.percentualUsado, 0) / history.length).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default BudgetHistoryTable
