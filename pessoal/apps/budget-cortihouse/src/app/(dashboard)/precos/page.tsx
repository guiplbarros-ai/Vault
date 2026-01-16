import { Header } from '@/components/layout/header'
import { PriceManager } from './price-manager'
import { fetchPrices } from './actions'

export default async function PrecosPage() {
  const { data: prices, error } = await fetchPrices()

  return (
    <>
      <Header
        title="Tabela de Preços"
        description="Atualize os preços dos materiais e serviços"
      />

      <div className="p-6">
        {error ? (
          <div className='py-8 text-center text-destructive'>
            <p>{error}</p>
          </div>
        ) : (
          <PriceManager initialPrices={prices} />
        )}
      </div>
    </>
  )
}
