import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PlusCircle, Search, Package } from 'lucide-react'

export default function ProductsPage() {
  return (
    <>
      <Header title="Produtos" description="Gerencie o catálogo de produtos" />

      <div className='space-y-6 p-6'>
        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className='relative max-w-md flex-1'>
            <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
            <Input placeholder="Buscar produto..." className="pl-9" />
          </div>
          <Button asChild>
            <Link href="/produtos/novo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Produto
            </Link>
          </Button>
        </div>

        {/* Product List */}
        <Card>
          <CardContent className="pt-6">
            <div className='py-8 text-center text-muted-foreground'>
              <Package className='mx-auto mb-4 h-12 w-12 opacity-50' />
              <p className='font-medium text-lg'>Nenhum produto cadastrado</p>
              <p className="text-sm">Adicione produtos ao catálogo para usar nos orçamentos</p>
              <Button asChild className="mt-4">
                <Link href="/produtos/novo">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Produto
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
