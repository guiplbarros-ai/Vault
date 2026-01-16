'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Search, Plus, User, Check, Loader2 } from 'lucide-react'
import { fetchCustomers, createCustomer } from '@/app/(dashboard)/clientes/actions'
import type { Customer } from '@/lib/db/schema'
import type { QuoteData } from '../page'

interface StepCustomerProps {
  quoteData: QuoteData
  updateQuoteData: (data: Partial<QuoteData>) => void
}

export function StepCustomer({ quoteData, updateQuoteData }: StepCustomerProps) {
  const [isPending, startTransition] = useTransition()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  })

  // Fetch customers on mount and when search changes
  useEffect(() => {
    async function loadCustomers() {
      setIsLoading(true)
      const result = await fetchCustomers(searchTerm || undefined)
      if (result.error) {
        toast.error(result.error)
      } else {
        setCustomers(result.data)
      }
      setIsLoading(false)
    }

    const debounce = setTimeout(loadCustomers, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm])

  function handleSelectCustomer(customer: Customer) {
    updateQuoteData({
      customerId: customer.id,
      customerName: customer.name,
      installationAddress: customer.address || undefined,
    })
  }

  function handleCreateCustomer() {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Nome e telefone são obrigatórios')
      return
    }

    startTransition(async () => {
      const result = await createCustomer({
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email || null,
        address: newCustomer.address || null,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.data) {
        toast.success('Cliente cadastrado com sucesso!')
        updateQuoteData({
          customerId: result.data.id,
          customerName: result.data.name,
          installationAddress: result.data.address || undefined,
        })
        setShowNewForm(false)
        setNewCustomer({ name: '', phone: '', email: '', address: '' })
        // Refresh customer list
        const refreshResult = await fetchCustomers()
        if (!refreshResult.error) {
          setCustomers(refreshResult.data)
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className='font-semibold text-lg'>Selecionar Cliente</h2>
        <p className='text-muted-foreground text-sm'>
          Escolha um cliente existente ou cadastre um novo
        </p>
      </div>

      {!showNewForm ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Customer List */}
          <div className='max-h-64 space-y-2 overflow-auto'>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : customers.length > 0 ? (
              customers.map((customer) => (
                <Card
                  key={customer.id}
                  className={`cursor-pointer transition-colors hover:bg-muted ${
                    quoteData.customerId === customer.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectCustomer(customer)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className='text-muted-foreground text-sm'>
                          {customer.phone}
                          {customer.email && ` • ${customer.email}`}
                        </p>
                      </div>
                    </div>
                    {quoteData.customerId === customer.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="py-4 text-center text-muted-foreground">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </p>
            )}
          </div>

          {/* New Customer Button */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t" />
            <span className='text-muted-foreground text-sm'>ou</span>
            <div className="flex-1 border-t" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowNewForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar Novo Cliente
          </Button>
        </>
      ) : (
        <>
          {/* New Customer Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Nome completo ou razão social"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="(31) 99999-9999"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
                placeholder="Endereço completo"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setShowNewForm(false)}
              className="flex-1"
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={!newCustomer.name || !newCustomer.phone || isPending}
              className="flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar e Selecionar'
              )}
            </Button>
          </div>
        </>
      )}

      {/* Selected Customer Display */}
      {quoteData.customerId && !showNewForm && (
        <div className="rounded-lg bg-primary/10 p-4">
          <p className='text-muted-foreground text-sm'>Cliente selecionado:</p>
          <p className="font-medium">{quoteData.customerName}</p>
        </div>
      )}
    </div>
  )
}
