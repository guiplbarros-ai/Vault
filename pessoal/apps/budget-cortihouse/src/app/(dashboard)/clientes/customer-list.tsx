'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  PlusCircle,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
} from 'lucide-react'
import { deleteCustomer } from './actions'
import type { Customer } from '@/lib/db/schema'

interface CustomerListProps {
  initialCustomers: Customer[]
  initialSearch?: string
}

export function CustomerList({ initialCustomers, initialSearch }: CustomerListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(initialSearch || '')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    router.push(`/clientes${params.toString() ? `?${params.toString()}` : ''}`)
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${name}"?`)) return

    startTransition(async () => {
      const result = await deleteCustomer(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Cliente excluído com sucesso')
        router.refresh()
      }
    })
    setOpenMenuId(null)
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <form onSubmit={handleSearch} className='relative max-w-md flex-1'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <Button asChild>
          <Link href="/clientes/novo">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Cliente
          </Link>
        </Button>
      </div>

      {/* Customer List */}
      {initialCustomers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className='py-8 text-center text-muted-foreground'>
              <Users className='mx-auto mb-4 h-12 w-12 opacity-50' />
              {initialSearch ? (
                <>
                  <p className='font-medium text-lg'>Nenhum cliente encontrado</p>
                  <p className="text-sm">Tente buscar por outro termo</p>
                </>
              ) : (
                <>
                  <p className='font-medium text-lg'>Nenhum cliente cadastrado</p>
                  <p className="text-sm">Adicione seu primeiro cliente para começar</p>
                </>
              )}
              <Button asChild className="mt-4">
                <Link href="/clientes/novo">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Cliente
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {initialCustomers.map((customer) => (
            <Card key={customer.id} className='transition-colors hover:bg-muted/50'>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className='flex-1 space-y-1'>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                      {customer.cnpj && (
                        <Badge variant="outline" className="text-xs">
                          PJ
                        </Badge>
                      )}
                    </div>

                    <div className='flex flex-wrap gap-4 text-muted-foreground text-sm'>
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {customer.email}
                        </span>
                      )}
                      {customer.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {customer.city}
                          {customer.state && `/${customer.state}`}
                        </span>
                      )}
                    </div>

                    {customer.notes && (
                      <p className='mt-2 line-clamp-1 text-muted-foreground text-sm'>
                        {customer.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Menu */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setOpenMenuId(openMenuId === customer.id ? null : customer.id)
                      }
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>

                    {openMenuId === customer.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className='absolute top-full right-0 z-20 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md'>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            asChild
                          >
                            <Link href={`/orcamentos/novo?cliente=${customer.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              Novo Orçamento
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            asChild
                          >
                            <Link href={`/clientes/${customer.id}/editar`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-destructive hover:text-destructive"
                            onClick={() => handleDelete(customer.id, customer.name)}
                            disabled={isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results count */}
      {initialCustomers.length > 0 && (
        <p className='text-center text-muted-foreground text-sm'>
          {initialCustomers.length} cliente{initialCustomers.length !== 1 ? 's' : ''}{' '}
          {initialSearch ? 'encontrado' : 'cadastrado'}
          {initialCustomers.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
