import { Header } from '@/components/layout/header'
import { QuoteList } from './quote-list'
import { fetchQuotes, type QuoteStatus } from './actions'

interface QuotesPageProps {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams
  const search = params.q
  const status = params.status as QuoteStatus | undefined

  const { data: quotes } = await fetchQuotes({ search, status })

  return (
    <>
      <Header title="Orçamentos" description="Gerencie seus orçamentos" />

      <div className="p-6">
        <QuoteList initialQuotes={quotes} initialSearch={search} initialStatus={status} />
      </div>
    </>
  )
}
