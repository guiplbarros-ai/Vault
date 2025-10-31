"use client"

import { useEffect, useState, useMemo } from "react"
import { useSetting } from '@/app/providers/settings-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { categoriaService } from "@/lib/services/categoria.service"
import { transacaoService } from "@/lib/services/transacao.service"
import type { Categoria } from "@/lib/types"
import { TrendingUp, FolderTree } from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoriaWithMetric {
  categoria: Categoria
  count: number
  volume: number
}

type MetricType = 'count' | 'volume'

export function PopularCategoriesWidget() {
  const [popularCategories, setPopularCategories] = useState<CategoriaWithMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<MetricType>('count')
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  useEffect(() => {
    async function loadPopularCategories() {
      try {
        setLoading(true)

        // Buscar todas as transações e categorias
        const [transacoes, categorias] = await Promise.all([
          transacaoService.listTransacoes(),
          categoriaService.listCategorias({ ativas: true })
        ])

        // Mapear categorias com contagem e volume
        const categoryMap = new Map<string, { categoria: Categoria, count: number, volume: number }>()

        for (const transacao of transacoes) {
          if (transacao.categoria_id) {
            const categoria = categorias.find(c => c.id === transacao.categoria_id)
            if (categoria) {
              const current = categoryMap.get(categoria.id) || { categoria, count: 0, volume: 0 }
              current.count += 1
              current.volume += Math.abs(Number(transacao.valor) || 0)
              categoryMap.set(categoria.id, current)
            }
          }
        }

        // Converter para array e ordenar pela métrica selecionada
        const categoriesArray = Array.from(categoryMap.values())
          .sort((a, b) => {
            if (metric === 'count') {
              return b.count - a.count
            } else {
              return b.volume - a.volume
            }
          })
          .slice(0, 5)

        setPopularCategories(categoriesArray)
      } catch (error) {
        console.error("Erro ao carregar categorias populares:", error)
      } finally {
        setLoading(false)
      }
    }
    loadPopularCategories()
  }, [metric])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <Card style={{
        background: isDark
          ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        backgroundColor: isDark ? '#3B5563' : '#FFFFFF'
      }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <TrendingUp className="h-4 w-4" />
            Categorias Mais Usadas
          </CardTitle>
          <CardDescription className="text-white/70">Carregando...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (popularCategories.length === 0) {
    return (
      <Card style={{
        background: isDark
          ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        backgroundColor: isDark ? '#3B5563' : '#FFFFFF'
      }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <TrendingUp className="h-4 w-4" />
            Categorias Mais Usadas
          </CardTitle>
          <CardDescription className="text-white/70">
            Nenhuma transação categorizada ainda. Comece adicionando transações!
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card style={{
      background: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      backgroundColor: isDark ? '#3B5563' : '#FFFFFF'
    }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <TrendingUp className="h-4 w-4" />
              Categorias Mais Usadas
            </CardTitle>
            <CardDescription className="text-white/70">
              {metric === 'count' ? 'Por número de transações' : 'Por volume financeiro'}
            </CardDescription>
          </div>
          <Select value={metric} onValueChange={(value) => setMetric(value as MetricType)}>
            <SelectTrigger
              className={cn(
                "w-[140px] h-8 text-xs font-medium",
                isDark
                  ? "!bg-gray-800 !border-gray-600 !text-white hover:!bg-gray-700 data-[state=open]:!bg-gray-700"
                  : "!bg-white !border-gray-300 hover:!bg-gray-50"
              )}
              style={isDark ? {
                backgroundColor: '#1f2937',
                borderColor: '#4b5563',
                color: '#ffffff'
              } : {
                color: '#111827'
              }}
            >
              <SelectValue
                className={isDark ? "!text-white" : ""}
                style={isDark ? { color: '#ffffff' } : { color: '#111827' }}
              />
            </SelectTrigger>
            <SelectContent
              className={cn(
                isDark
                  ? "!bg-gray-800 !border-gray-700"
                  : "!bg-white !border-gray-200"
              )}
              style={isDark ? {
                backgroundColor: '#1f2937',
                borderColor: '#374151'
              } : undefined}
            >
              <SelectItem
                value="count"
                className={cn(
                  "text-sm font-medium cursor-pointer",
                  isDark
                    ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700 data-[state=checked]:!bg-gray-700"
                    : ""
                )}
                style={isDark ? { color: '#ffffff' } : { color: '#111827' }}
              >
                Transações
              </SelectItem>
              <SelectItem
                value="volume"
                className={cn(
                  "text-sm font-medium cursor-pointer",
                  isDark
                    ? "!text-white hover:!bg-gray-700 focus:!bg-gray-700 data-[state=checked]:!bg-gray-700"
                    : ""
                )}
                style={isDark ? { color: '#ffffff' } : { color: '#111827' }}
              >
                Volume (R$)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {popularCategories.map(({ categoria, count, volume }, index) => (
            <div
              key={categoria.id}
              className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium text-white/60 w-5 flex-shrink-0">
                  #{index + 1}
                </span>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-lg flex-shrink-0">{categoria.icone || "📁"}</span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-white truncate">{categoria.nome}</span>
                    {categoria.grupo && (
                      <span className="text-xs text-white/60 truncate">
                        {categoria.grupo}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded flex-shrink-0",
                    categoria.tipo === "receita" && "bg-[hsl(142_71%_45%)]/10 text-[hsl(142_71%_55%)]",
                    categoria.tipo === "despesa" && "bg-destructive/10 text-destructive",
                    categoria.tipo === "transferencia" && "bg-primary/10 text-primary"
                  )}
                >
                  {categoria.tipo === "receita" && "R"}
                  {categoria.tipo === "despesa" && "D"}
                  {categoria.tipo === "transferencia" && "T"}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {metric === 'count' ? (
                  <>
                    <span className="text-sm font-medium text-white">{count}</span>
                    <span className="text-xs text-white/60">
                      {count === 1 ? "transação" : "transações"}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-white">{formatCurrency(volume)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
