import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CustomerForm } from '../customer-form'

export default function NewCustomerPage() {
  return (
    <>
      <Header title="Novo Cliente" description="Cadastre um novo cliente" />

      <div className="p-6">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/clientes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>

        <CustomerForm mode="create" />
      </div>
    </>
  )
}
