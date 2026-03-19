import { listCartoes, listFaturas } from '@/services/card.service'
import { useQuery } from '@tanstack/react-query'

export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: listCartoes,
  })
}

export function useCardInvoices(cartaoId: string) {
  return useQuery({
    queryKey: ['card-invoices', cartaoId],
    queryFn: () => listFaturas(cartaoId),
    enabled: !!cartaoId,
  })
}
