'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { calculateHospitalCurtain, type HospitalPrices } from '@/lib/calculations/hospital'
import { Plus, Trash2, X, Home, Building2 } from 'lucide-react'
import { fetchMaterialPrices } from '../actions'
import type { QuoteData, QuoteRoom, QuoteItem } from '../page'

interface StepItemsProps {
  quoteData: QuoteData
  updateQuoteData: (data: Partial<QuoteData>) => void
}

const productTypes = [
  { id: 'hospitalar', name: 'Hospitalar', icon: Building2 },
  { id: 'residencial', name: 'Residencial', icon: Home },
]

export function StepItems({ quoteData, updateQuoteData }: StepItemsProps) {
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [materialPrices, setMaterialPrices] = useState<Record<string, number>>({})
  const [itemForm, setItemForm] = useState({
    type: 'hospitalar' as 'hospitalar' | 'residencial',
    width: '',
    height: '2.00',
    ceilingHeight: '2.60',
    quantity: '1',
    includesRail: true,
    includesInstallation: true,
    curves: '0',
  })

  // Fetch material prices on mount
  useEffect(() => {
    fetchMaterialPrices().then(setMaterialPrices)
  }, [])

  function addRoom() {
    if (!newRoomName.trim()) return

    const newRoom: QuoteRoom = {
      id: `room-${Date.now()}`,
      name: newRoomName.trim(),
      items: [],
    }

    updateQuoteData({ rooms: [...quoteData.rooms, newRoom] })
    setNewRoomName('')
    setShowRoomForm(false)
  }

  function removeRoom(roomId: string) {
    const updatedRooms = quoteData.rooms.filter((r) => r.id !== roomId)
    updateQuoteData({ rooms: updatedRooms })
    recalculateTotal(updatedRooms)
  }

  function addItem(roomId: string) {
    const width = Number.parseFloat(itemForm.width)
    const ceilingHeight = Number.parseFloat(itemForm.ceilingHeight)
    const quantity = Number.parseInt(itemForm.quantity, 10)
    const curves = Number.parseInt(itemForm.curves, 10)

    if (Number.isNaN(width) || width <= 0) return

    // Calculate item based on type
    let description = ''
    let unitPrice = 0
    let total = 0
    let calculationDetails = {}

    if (itemForm.type === 'hospitalar') {
      const calculation = calculateHospitalCurtain({
        width,
        ceilingHeight,
        includeRail: itemForm.includesRail,
        includeInstallation: itemForm.includesInstallation,
        curves,
        quantity,
        prices: materialPrices as Partial<HospitalPrices>,
      })

      description = `Cortina Hospitalar ${width.toFixed(2)}×${itemForm.height}m${
        itemForm.includesRail ? ' + Trilho' : ''
      }${itemForm.includesInstallation ? ' + Instalação' : ''}`
      unitPrice = calculation.summary.subtotal
      total = calculation.summary.total
      calculationDetails = calculation
    } else {
      // Placeholder for residential calculation
      description = `Cortina Residencial ${width.toFixed(2)}×${itemForm.height}m`
      unitPrice = 0 // Will be calculated when prices are available
      total = 0
    }

    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      description,
      quantity,
      unitPrice,
      total,
      type: itemForm.type,
      width,
      height: Number.parseFloat(itemForm.height),
      ceilingHeight,
      includesRail: itemForm.includesRail,
      includesInstallation: itemForm.includesInstallation,
      curves,
      calculationDetails,
    }

    const updatedRooms = quoteData.rooms.map((room) =>
      room.id === roomId ? { ...room, items: [...room.items, newItem] } : room
    )

    updateQuoteData({ rooms: updatedRooms })
    recalculateTotal(updatedRooms)

    // Reset form
    setItemForm({
      type: 'hospitalar',
      width: '',
      height: '2.00',
      ceilingHeight: '2.60',
      quantity: '1',
      includesRail: true,
      includesInstallation: true,
      curves: '0',
    })
    setShowItemForm(null)
  }

  function removeItem(roomId: string, itemId: string) {
    const updatedRooms = quoteData.rooms.map((room) =>
      room.id === roomId
        ? { ...room, items: room.items.filter((i) => i.id !== itemId) }
        : room
    )

    updateQuoteData({ rooms: updatedRooms })
    recalculateTotal(updatedRooms)
  }

  function recalculateTotal(rooms: QuoteRoom[]) {
    const subtotal = rooms.reduce(
      (acc, room) => acc + room.items.reduce((itemAcc, item) => itemAcc + item.total, 0),
      0
    )
    updateQuoteData({ subtotal, total: subtotal - quoteData.discountAmount })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className='font-semibold text-lg'>Ambientes e Itens</h2>
        <p className='text-muted-foreground text-sm'>
          Adicione os ambientes e seus itens ao orçamento
        </p>
      </div>

      {/* Rooms List */}
      <div className="space-y-4">
        {quoteData.rooms.map((room) => (
          <Card key={room.id}>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className='flex items-center gap-2 text-base'>
                <Home className="h-4 w-4" />
                {room.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRoom(room.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Items in room */}
              {room.items.map((item) => (
                <div
                  key={item.id}
                  className='flex items-center justify-between rounded-lg bg-muted p-3'
                >
                  <div>
                    <p className="font-medium text-sm">{item.description}</p>
                    <p className='text-muted-foreground text-xs'>
                      {item.quantity}× {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold">{formatCurrency(item.total)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(room.id, item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add Item Form */}
              {showItemForm === room.id ? (
                <div className='space-y-4 rounded-lg border p-4'>
                  {/* Product Type */}
                  <div className="flex gap-2">
                    {productTypes.map((type) => (
                      <Button
                        key={type.id}
                        variant={itemForm.type === type.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setItemForm({ ...itemForm, type: type.id as 'hospitalar' | 'residencial' })
                        }
                      >
                        <type.icon className="mr-2 h-4 w-4" />
                        {type.name}
                      </Button>
                    ))}
                  </div>

                  {/* Measurements */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Largura (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={itemForm.width}
                        onChange={(e) => setItemForm({ ...itemForm, width: e.target.value })}
                        placeholder="2.10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Altura (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={itemForm.height}
                        onChange={(e) => setItemForm({ ...itemForm, height: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pé Direito (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={itemForm.ceilingHeight}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, ceilingHeight: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Options for hospital */}
                  {itemForm.type === 'hospitalar' && (
                    <>
                      <div className="flex gap-4">
                        <label className='flex cursor-pointer items-center gap-2'>
                          <input
                            type="checkbox"
                            checked={itemForm.includesRail}
                            onChange={(e) =>
                              setItemForm({ ...itemForm, includesRail: e.target.checked })
                            }
                            className="h-4 w-4"
                          />
                          <span className="text-sm">Incluir Trilho</span>
                        </label>
                        <label className='flex cursor-pointer items-center gap-2'>
                          <input
                            type="checkbox"
                            checked={itemForm.includesInstallation}
                            onChange={(e) =>
                              setItemForm({
                                ...itemForm,
                                includesInstallation: e.target.checked,
                              })
                            }
                            className="h-4 w-4"
                          />
                          <span className="text-sm">Incluir Instalação</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={itemForm.quantity}
                            onChange={(e) =>
                              setItemForm({ ...itemForm, quantity: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Curvas no Trilho</Label>
                          <Input
                            type="number"
                            min="0"
                            value={itemForm.curves}
                            onChange={(e) =>
                              setItemForm({ ...itemForm, curves: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowItemForm(null)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => addItem(room.id)}
                      disabled={!itemForm.width}
                      className="flex-1"
                    >
                      Adicionar Item
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowItemForm(room.id)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Item
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Room */}
      {showRoomForm ? (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do ambiente (ex: Sala de Espera)"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRoom()}
              />
              <Button variant="outline" onClick={() => setShowRoomForm(false)}>
                Cancelar
              </Button>
              <Button onClick={addRoom} disabled={!newRoomName.trim()}>
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowRoomForm(true)} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Ambiente
        </Button>
      )}

      {/* Total Preview */}
      {quoteData.subtotal > 0 && (
        <div className="rounded-lg bg-muted p-4">
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-sm'>Subtotal:</span>
            <span className='font-bold text-xl'>{formatCurrency(quoteData.subtotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
