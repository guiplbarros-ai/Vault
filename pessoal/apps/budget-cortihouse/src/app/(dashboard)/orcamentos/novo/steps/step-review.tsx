'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createQuote } from '../../actions'
import type { QuoteData } from '../page'

interface StepReviewProps {
  quoteData: QuoteData
  updateQuoteData: (data: Partial<QuoteData>) => void
  onFinish: (quoteId: string) => void
}

export function StepReview({ quoteData, updateQuoteData, onFinish }: StepReviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')

  function applyDiscount() {
    const value = Number.parseFloat(discountInput)
    if (Number.isNaN(value) || value < 0) return

    let discountAmount = 0
    if (discountType === 'percentage') {
      discountAmount = quoteData.subtotal * (value / 100)
    } else {
      discountAmount = value
    }

    updateQuoteData({
      discountType,
      discountValue: value,
      discountAmount,
      total: quoteData.subtotal - discountAmount,
    })
  }

  function removeDiscount() {
    updateQuoteData({
      discountType: undefined,
      discountValue: undefined,
      discountAmount: 0,
      total: quoteData.subtotal,
    })
    setDiscountInput('')
  }

  async function handleFinish() {
    if (!quoteData.customerId) {
      toast.error('Selecione um cliente')
      return
    }

    setIsLoading(true)
    try {
      // Transform wizard data to match createQuote format
      const result = await createQuote({
        customerId: quoteData.customerId,
        installationAddress: quoteData.installationAddress,
        rooms: quoteData.rooms.map((room) => ({
          name: room.name,
          items: room.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: 'un' as const, // Default unit for curtains
            unitPrice: item.unitPrice,
            total: item.total,
            width: item.width,
            height: item.height,
            ceilingHeight: item.ceilingHeight,
            includesRail: item.includesRail,
            includesInstallation: item.includesInstallation,
            curves: item.curves,
            calculationDetails: item.calculationDetails,
          })),
        })),
        subtotal: quoteData.subtotal,
        discountType: quoteData.discountType,
        discountValue: quoteData.discountValue,
        discountAmount: quoteData.discountAmount,
        total: quoteData.total,
        notes: quoteData.notes,
        validityDays: quoteData.validityDays,
        deliveryDays: quoteData.deliveryDays,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.data) {
        toast.success('Orçamento criado com sucesso!')
        onFinish(result.data.id)
      }
    } catch {
      toast.error('Erro ao criar orçamento')
    } finally {
      setIsLoading(false)
    }
  }

  const totalItems = quoteData.rooms.reduce((acc, room) => acc + room.items.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className='font-semibold text-lg'>Revisão do Orçamento</h2>
        <p className='text-muted-foreground text-sm'>
          Confira os dados antes de finalizar
        </p>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{quoteData.customerName}</p>
          {quoteData.installationAddress && (
            <p className='mt-1 text-muted-foreground text-sm'>
              Local: {quoteData.installationAddress}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Itens ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {quoteData.rooms.map((room) => (
            <div key={room.id}>
              <p className='mb-2 font-medium text-sm'>{room.name}</p>
              {room.items.map((item) => (
                <div
                  key={item.id}
                  className='flex justify-between py-1 text-muted-foreground text-sm'
                >
                  <span>
                    {item.quantity}× {item.description}
                  </span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Discount */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Desconto</CardTitle>
        </CardHeader>
        <CardContent>
          {quoteData.discountAmount > 0 ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {quoteData.discountType === 'percentage'
                    ? `${quoteData.discountValue}%`
                    : formatCurrency(quoteData.discountValue!)}
                </p>
                <p className='text-muted-foreground text-sm'>
                  -{formatCurrency(quoteData.discountAmount)}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={removeDiscount}>
                Remover
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex gap-2">
                <Button
                  variant={discountType === 'percentage' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDiscountType('percentage')}
                >
                  %
                </Button>
                <Button
                  variant={discountType === 'fixed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDiscountType('fixed')}
                >
                  R$
                </Button>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={discountType === 'percentage' ? '10' : '100,00'}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={applyDiscount} disabled={!discountInput}>
                Aplicar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Validade (dias)</Label>
          <Input
            type="number"
            min="1"
            value={quoteData.validityDays}
            onChange={(e) =>
              updateQuoteData({ validityDays: Number.parseInt(e.target.value, 10) || 15 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Prazo de Entrega (dias úteis)</Label>
          <Input
            type="number"
            min="1"
            value={quoteData.deliveryDays}
            onChange={(e) =>
              updateQuoteData({ deliveryDays: Number.parseInt(e.target.value, 10) || 15 })
            }
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Observações</Label>
        <textarea
          value={quoteData.notes || ''}
          onChange={(e) => updateQuoteData({ notes: e.target.value })}
          placeholder="Observações adicionais..."
          className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Total */}
      <Card className='border-primary/20 bg-primary/5'>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(quoteData.subtotal)}</span>
            </div>
            {quoteData.discountAmount > 0 && (
              <div className='flex justify-between text-green-600 text-sm'>
                <span>Desconto</span>
                <span>-{formatCurrency(quoteData.discountAmount)}</span>
              </div>
            )}
            <div className='flex justify-between border-t pt-2'>
              <span className="font-semibold">Total</span>
              <span className='font-bold text-2xl'>{formatCurrency(quoteData.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finish Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleFinish}
        disabled={isLoading || quoteData.total <= 0}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Criando Orçamento...
          </>
        ) : (
          'Criar Orçamento'
        )}
      </Button>
    </div>
  )
}
