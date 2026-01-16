import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { CustomerForm } from '../../customer-form'
import { fetchCustomer } from '../../actions'

interface EditCustomerPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params
  const { data: customer, error } = await fetchCustomer(id)

  if (error || !customer) {
    notFound()
  }

  return (
    <>
      <Header title="Editar Cliente" description={customer.name} />

      <div className="p-6">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/clientes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>

        <CustomerForm customer={customer} mode="edit" />
      </div>
    </>
  )
}
