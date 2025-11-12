"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
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
  const [isChanging, setIsChanging] = useState(false)
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  const loadPopularCategories = useCallback(async () => {
    try {
      setLoading(true)

      // Buscar todas as transações e categorias
      const [transacoes, categorias] = await Promise.all([
        transacaoService.listTransacoes(),
        categoriaService.listCategorias({ ativas: true })
      ])

        // Mapear categorias com contagem e volume
        const categoryMap = new Map<string, { categoria: Categoria, count: number, volume: number }>()

        // Categoria fictícia para transações sem categoria
        const semCategoria: Categoria = {
          id: 'sem-categoria',
          nome: 'Sem Categoria',
          tipo: 'despesa',
          icone: '📁',
          cor: '#8CA39C',
          ativa: true,
          ordem: 999,
          created_at: new Date(),
          updated_at: new Date(),
        }

        for (const transacao of transacoes) {
          let categoria: Categoria
          let categoriaId: string

          if (!transacao.categoria_id) {
            categoria = semCategoria
            categoriaId = 'sem-categoria'
          } else {
            const foundCategoria = categorias.find(c => c.id === transacao.categoria_id)
            if (!foundCategoria) {
              categoria = semCategoria
              categoriaId = 'sem-categoria'
            } else {
              categoria = foundCategoria
              categoriaId = foundCategoria.id
            }
          }

          const current = categoryMap.get(categoriaId) || { categoria, count: 0, volume: 0 }
          current.count += 1
          current.volume += Math.abs(Number(transacao.valor) || 0)
          categoryMap.set(categoriaId, current)
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

      // Usar requestAnimationFrame para evitar ResizeObserver loop
      requestAnimationFrame(() => {
        setPopularCategories(categoriesArray)
      })
    } catch (error) {
      console.error("Erro ao carregar categorias populares:", error)
    } finally {
      setLoading(false)
    }
  }, [metric])

  useEffect(() => {
    loadPopularCategories()
  }, [loadPopularCategories])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleMetricChange = (value: MetricType) => {
    setIsChanging(true)
    // Pequeno delay para evitar ResizeObserver loop
    setTimeout(() => {
      setMetric(value)
      setIsChanging(false)
    }, 50)
  }

  if (loading) {
    return (
      <Card className="glass-card-3d p-6" style={{ minHeight: '380px' }}>
        <div className="mb-6">
          <h3 className="text-lg font-bold text-foreground">Categorias Mais Usadas</h3>
          <p className="text-sm text-secondary">Carregando...</p>
        </div>
      </Card>
    )
  }

  if (popularCategories.length === 0) {
    return (
      <Card className="glass-card-3d p-6" style={{ minHeight: '380px' }}>
        <div className="mb-6">
          <h3 className="text-lg font-bold text-foreground">Categorias Mais Usadas</h3>
          <p className="text-sm text-secondary">
            Nenhuma transação categorizada ainda. Comece adicionando transações!
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="glass-card-3d p-6" style={{ minHeight: '380px' }}>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">Categorias Mais Usadas</h3>
            <p className="text-sm text-secondary">
              {metric === 'count' ? 'Por número de transações' : 'Por volume financeiro'}
            </p>
          </div>
          <Select value={metric} onValueChange={(value) => handleMetricChange(value as MetricType)}>
            <SelectTrigger className="w-[140px] h-8 text-xs font-medium" disabled={isChanging}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count" className="text-sm font-medium cursor-pointer">
                Transações
              </SelectItem>
              <SelectItem value="volume" className="text-sm font-medium cursor-pointer">
                Volume (R$)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-3">
        {popularCategories.map(({ categoria, count, volume }, index) => (
          <div
            key={categoria.id}
            className="flex items-center justify-between gap-3 pb-3 border-b last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-medium text-secondary w-5 flex-shrink-0">
                #{index + 1}
              </span>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-lg flex-shrink-0">{categoria.icone || "📁"}</span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-card-foreground truncate">{categoria.nome}</span>
                  {categoria.grupo && (
                    <span className="text-xs text-secondary truncate">
                      {categoria.grupo}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded flex-shrink-0 font-medium",
                  categoria.tipo === "receita" && "bg-success/10 text-success",
                  categoria.tipo === "despesa" && "bg-destructive/10 text-destructive",
                  categoria.tipo === "transferencia" && "bg-primary/10 text-primary"
                )}
              >
                {categoria.tipo === "receita" && "Receita"}
                {categoria.tipo === "despesa" && "Despesa"}
                {categoria.tipo === "transferencia" && "Transfer."}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
              {metric === 'count' ? (
                <>
                  <span className="text-sm font-medium text-card-foreground">{count}</span>
                  <span className="text-xs text-secondary">
                    {count === 1 ? "tx" : "txa"}
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-gold">{formatCurrency(volume)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
