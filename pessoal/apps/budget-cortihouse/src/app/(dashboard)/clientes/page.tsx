import { Header } from '@/components/layout/header'
import { fetchCustomers } from './actions'
import { CustomerList } from './customer-list'

interface CustomersPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { q } = await searchParams
  const { data: customers, error } = await fetchCustomers(q)

  return (
    <>
      <Header title="Clientes" description="Gerencie seus clientes" />

      <div className="p-6">
        {error ? (
          <div className='py-8 text-center text-destructive'>
            <p>{error}</p>
          </div>
        ) : (
          <CustomerList initialCustomers={customers} initialSearch={q} />
        )}
      </div>
    </>
  )
}
