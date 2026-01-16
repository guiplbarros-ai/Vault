'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Save, AlertCircle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { savePrices } from './actions'
import { categoryLabels, unitLabels } from '@/lib/constants/price-labels'
import type { MaterialPrice } from '@/lib/db/schema'

interface PriceManagerProps {
  initialPrices: MaterialPrice[]
}

type PriceValue = {
  original: number
  current: number
  hasChanged: boolean
}

export function PriceManager({ initialPrices }: PriceManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [prices, setPrices] = useState<Record<string, PriceValue>>(() => {
    const initial: Record<string, PriceValue> = {}
    for (const price of initialPrices) {
      initial[price.id] = {
        original: Number(price.price),
        current: Number(price.price),
        hasChanged: false,
      }
    }
    return initial
  })

  const hasChanges = Object.values(prices).some((p) => p.hasChanged)
  const hasZeroPrices = initialPrices.some((p) => Number(p.price) === 0)

  // Group prices by category
  const groupedPrices = initialPrices.reduce<Record<string, MaterialPrice[]>>(
    (acc, price) => {
      const category = price.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category]!.push(price)
      return acc
    },
    {}
  )

  const handlePriceChange = (id: string, value: string) => {
    const numValue = Number.parseFloat(value) || 0
    setPrices((prev) => {
      const existing = prev[id]
      if (!existing) return prev
      return {
        ...prev,
        [id]: {
          ...existing,
          current: numValue,
          hasChanged: numValue !== existing.original,
        },
      }
    })
  }

  const handleSave = () => {
    const updates = Object.entries(prices)
      .filter(([, value]) => value.hasChanged)
      .map(([id, value]) => ({ id, price: value.current }))

    if (updates.length === 0) return

    startTransition(async () => {
      const result = await savePrices(updates)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Preços atualizados com sucesso!')
        // Reset changed state
        setPrices((prev) => {
          const updated: Record<string, PriceValue> = {}
          for (const [id, value] of Object.entries(prev)) {
            updated[id] = {
              original: value.current,
              current: value.current,
              hasChanged: false,
            }
          }
          return updated
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Alert for zero prices */}
      {hasZeroPrices && (
        <div className='flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800'>
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Existem preços zerados. Atualize-os para que os cálculos de orçamento funcionem
            corretamente.
          </p>
        </div>
      )}

      {/* Save button fixed at top */}
      <div className="flex items-center justify-between">
        <div className='text-muted-foreground text-sm'>
          {hasChanges ? (
            <span className='font-medium text-amber-600'>Alterações não salvas</span>
          ) : (
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-green-600" />
              Todos os preços salvos
            </span>
          )}
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Price cards by category */}
      {Object.entries(groupedPrices).map(([category, categoryPrices]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{categoryLabels[category] || category}</CardTitle>
            <CardDescription>
              {categoryPrices.length} {categoryPrices.length === 1 ? 'item' : 'itens'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryPrices.map((price) => {
                const priceValue = prices[price.id]
                const isZero = priceValue?.current === 0
                const isChanged = priceValue?.hasChanged

                return (
                  <div
                    key={price.id}
                    className='flex items-center gap-4 border-b py-2 last:border-0'
                  >
                    <div className='min-w-0 flex-1'>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{price.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {unitLabels[price.unit] || price.unit}
                        </Badge>
                        {isChanged && (
                          <Badge variant="secondary" className='bg-amber-100 text-amber-700 text-xs'>
                            alterado
                          </Badge>
                        )}
                      </div>
                      {price.description && (
                        <p className='truncate text-muted-foreground text-sm'>
                          {price.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={priceValue?.current ?? 0}
                        onChange={(e) => handlePriceChange(price.id, e.target.value)}
                        className={`w-28 text-right ${isZero ? 'border-amber-400 bg-amber-50' : ''}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
