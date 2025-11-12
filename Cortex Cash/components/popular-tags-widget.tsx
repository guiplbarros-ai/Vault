"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useSetting } from '@/app/providers/settings-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TagBadge } from "@/components/ui/tag-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { tagService } from "@/lib/services/tag.service"
import { transacaoService } from "@/lib/services/transacao.service"
import type { Tag } from "@/lib/types"
import { TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface TagWithMetric {
  tag: Tag
  count: number
  volume: number
}

type MetricType = 'count' | 'volume'

export function PopularTagsWidget() {
  const [popularTags, setPopularTags] = useState<TagWithMetric[]>([])
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

  const loadPopularTags = useCallback(async () => {
    try {
      setLoading(true)

      // Buscar todas as tags e transações
      const [allTags, transacoes] = await Promise.all([
        tagService.listTags(),
        transacaoService.listTransacoes()
      ])

        console.log('[PopularTagsWidget] ========== DEBUG ==========')
        console.log('[PopularTagsWidget] Tags no banco:', allTags.length)
        console.log('[PopularTagsWidget] Tags:', allTags.map(t => t.nome).join(', '))
        console.log('[PopularTagsWidget] Total de transações:', transacoes.length)

        // Criar mapa de tags por nome para lookup rápido
        const tagByName = new Map<string, Tag>()
        allTags.forEach(tag => tagByName.set(tag.nome.toLowerCase(), tag))

        // Mapear tags com contagem e volume
        const tagMap = new Map<string, { tag: Tag, count: number, volume: number }>()

        let transacoesComTags = 0
        for (const transacao of transacoes) {
          // Tags são armazenadas como array de nomes de tags
          let tagsArray: string[] = []

          if (typeof transacao.tags === 'string' && transacao.tags) {
            try {
              tagsArray = JSON.parse(transacao.tags)
            } catch (e) {
              // Ignorar erros de parse
              continue
            }
          } else if (Array.isArray(transacao.tags)) {
            tagsArray = transacao.tags
          }

          if (tagsArray && tagsArray.length > 0) {
            transacoesComTags++
            console.log(`[PopularTagsWidget] Transação "${transacao.descricao}": tags =`, tagsArray)
            for (const tagNome of tagsArray) {
              // Buscar tag pelo nome
              const tag = tagByName.get(tagNome.toLowerCase())
              if (!tag) {
                console.warn(`[PopularTagsWidget] Tag "${tagNome}" não encontrada no banco!`)
                continue
              }

              const current = tagMap.get(tag.id) || { tag: tag, count: 0, volume: 0 }
              current.count += 1
              current.volume += Math.abs(Number(transacao.valor) || 0)
              tagMap.set(tag.id, current)
            }
          }
        }

        console.log(`[PopularTagsWidget] Transações com tags: ${transacoesComTags}/${transacoes.length}`)
        console.log('[PopularTagsWidget] Tags processadas:', Array.from(tagMap.values()).map(t => `${t.tag.nome} (${t.count})`).join(', '))

        // Converter para array e ordenar pela métrica selecionada
        const tagsArray = Array.from(tagMap.values())
          .sort((a, b) => {
            if (metric === 'count') {
              return b.count - a.count
            } else {
              return b.volume - a.volume
            }
          })
          .slice(0, 5)

      console.log('[PopularTagsWidget] Top 5 tags:', tagsArray.map(t => `${t.tag.nome} (${t.count})`).join(', '))

      // Usar requestAnimationFrame para evitar ResizeObserver loop
      requestAnimationFrame(() => {
        setPopularTags(tagsArray)
      })
    } catch (error) {
      console.error("Erro ao carregar tags populares:", error)
    } finally {
      setLoading(false)
    }
  }, [metric])

  useEffect(() => {
    loadPopularTags()
  }, [loadPopularTags])

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
          <h3 className="text-lg font-bold text-foreground">Tags Mais Usadas</h3>
          <p className="text-sm text-secondary">Carregando...</p>
        </div>
      </Card>
    )
  }

  if (popularTags.length === 0) {
    return (
      <Card className="glass-card-3d p-6" style={{ minHeight: '380px' }}>
        <div className="mb-6">
          <h3 className="text-lg font-bold text-foreground">Tags Mais Usadas</h3>
          <p className="text-sm text-secondary">
            Nenhuma tag utilizada ainda. Adicione tags às suas transações!
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
            <h3 className="text-lg font-bold text-foreground">Tags Mais Usadas</h3>
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
          {popularTags.map(({ tag, count, volume }, index) => (
            <div
              key={tag.id}
              className="flex items-center justify-between gap-3 pb-3 border-b last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-secondary w-5">
                  #{index + 1}
                </span>
                <TagBadge label={tag.nome} cor={tag.cor} size="sm" />
              </div>
              <div className="flex items-center gap-2">
                {metric === 'count' ? (
                  <>
                    <span className="text-sm font-medium text-card-foreground">{count}</span>
                    <span className="text-xs text-secondary">
                      {count === 1 ? "transação" : "transações"}
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
