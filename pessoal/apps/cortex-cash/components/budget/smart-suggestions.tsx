'use client'

import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from '@/components/ui/card'
import { categoriaService } from '@/lib/services/categoria.service'
import { transacaoService } from '@/lib/services/transacao.service'
import { endOfMonth, startOfMonth, subMonths } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface Suggestion {
  type: 'high-spending' | 'increasing' | 'opportunity' | 'good-control'
  icon: React.ReactNode
  title: string
  description: string
  category?: string
  valor?: number
  percentualAumento?: number
}

interface SmartSuggestionsProps {
  mesReferencia: string
}

export function SmartSuggestions({ mesReferencia }: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const { formatCurrency } = useLocalizationSettings()

  useEffect(() => {
    loadSuggestions()
  }, [mesReferencia])

  const loadSuggestions = async () => {
    try {
      setLoading(true)

      const [transacoes, categorias] = await Promise.all([
        transacaoService.listTransacoes(),
        categoriaService.listCategorias(),
      ])

      const suggestionsArray: Suggestion[] = []

      // Período atual e anterior
      const [ano, mes] = mesReferencia.split('-').map(Number)
      const mesAtual = new Date(ano, mes - 1)
      const mesPrevio = subMonths(mesAtual, 1)

      const mesAtualStart = startOfMonth(mesAtual)
      const mesAtualEnd = endOfMonth(mesAtual)
      const mesPrevioStart = startOfMonth(mesPrevio)
      const mesPrevioEnd = endOfMonth(mesPrevio)

      // Gasto por categoria em cada período
      const gastosMesAtual: Record<string, number> = {}
      const gastosMesPrevio: Record<string, number> = {}
      const totalMesAtual: { receita: number; despesa: number } = { receita: 0, despesa: 0 }
      const totalMesPrevio: { receita: number; despesa: number } = { receita: 0, despesa: 0 }

      transacoes.forEach((t) => {
        const valor = Math.abs(Number(t.valor) || 0)
        const transDate = t.data instanceof Date ? t.data : new Date(t.data)
        const categoria = categorias.find((c) => c.id === t.categoria_id)
        const parentId = categoria?.pai_id || t.categoria_id
        const catName = categorias.find((c) => c.id === parentId)?.nome || 'Desconhecida'

        if (transDate >= mesAtualStart && transDate <= mesAtualEnd) {
          if (t.tipo === 'despesa') {
            gastosMesAtual[catName] = (gastosMesAtual[catName] || 0) + valor
            totalMesAtual.despesa += valor
          } else if (t.tipo === 'receita') {
            totalMesAtual.receita += valor
          }
        }

        if (transDate >= mesPrevioStart && transDate <= mesPrevioEnd) {
          if (t.tipo === 'despesa') {
            gastosMesPrevio[catName] = (gastosMesPrevio[catName] || 0) + valor
            totalMesPrevio.despesa += valor
          } else if (t.tipo === 'receita') {
            totalMesPrevio.receita += valor
          }
        }
      })

      // Sugestão 1: Categorias com alto gasto (> 30% do total)
      Object.entries(gastosMesAtual).forEach(([categoria, valor]) => {
        const percentual = totalMesAtual.despesa > 0 ? (valor / totalMesAtual.despesa) * 100 : 0
        if (percentual > 30 && valor > 500) {
          suggestionsArray.push({
            type: 'high-spending',
            icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
            title: 'Gastos Altos',
            description: `"${categoria}" representa ${percentual.toFixed(0)}% do seu gasto total. Considere revisar essa categoria.`,
            category: categoria,
            valor: valor,
          })
        }
      })

      // Sugestão 2: Categorias com tendência crescente (> 20% aumento)
      Object.entries(gastosMesAtual).forEach(([categoria, mesAtualValor]) => {
        const mesPrevioValor = gastosMesPrevio[categoria] || 0
        if (mesPrevioValor > 0) {
          const percentualAumento = ((mesAtualValor - mesPrevioValor) / mesPrevioValor) * 100
          if (percentualAumento > 20) {
            suggestionsArray.push({
              type: 'increasing',
              icon: <TrendingUp className="w-5 h-5 text-red-500" />,
              title: 'Tendência de Aumento',
              description: `"${categoria}" aumentou ${percentualAumento.toFixed(0)}% em relação ao mês anterior. Atenção!`,
              category: categoria,
              percentualAumento: percentualAumento,
            })
          }
        }
      })

      // Sugestão 3: Oportunidades de economia (categorias que diminuíram)
      Object.entries(gastosMesPrevio).forEach(([categoria, mesPrevioValor]) => {
        const mesAtualValor = gastosMesAtual[categoria] || 0
        if (mesPrevioValor > 0 && mesAtualValor < mesPrevioValor) {
          const percentualReduo = ((mesPrevioValor - mesAtualValor) / mesPrevioValor) * 100
          if (percentualReduo > 15) {
            suggestionsArray.push({
              type: 'opportunity',
              icon: <TrendingDown className="w-5 h-5 text-green-500" />,
              title: 'Redução de Gastos',
              description: `Parabéns! Você reduziu "${categoria}" em ${percentualReduo.toFixed(0)}% este mês.`,
              category: categoria,
            })
          }
        }
      })

      // Sugestão 4: Taxa de poupança boa
      const taxaSaving =
        totalMesAtual.receita > 0
          ? ((totalMesAtual.receita - totalMesAtual.despesa) / totalMesAtual.receita) * 100
          : 0
      if (taxaSaving >= 15) {
        suggestionsArray.push({
          type: 'good-control',
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          title: 'Ótima Taxa de Poupança',
          description: `Você está economizando ${taxaSaving.toFixed(1)}% dda sua receita. Continue assim!`,
        })
      }

      setSuggestions(suggestionsArray.slice(0, 5)) // Máximo 5 sugestões
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 h-[300px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </Card>
    )
  }

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'high-spending':
        return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
      case 'increasing':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
      case 'opportunity':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
      case 'good-control':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-secondary/50'
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">Sugestões Inteligentes</h3>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Sem sugestões no momento. Continue monitorando seus gastos!
        </p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getSuggestionColor(suggestion.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{suggestion.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">{suggestion.title}</p>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  {suggestion.valor && (
                    <p className="text-xs mt-2 font-mono">
                      Valor: {formatCurrency(suggestion.valor)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default SmartSuggestions
