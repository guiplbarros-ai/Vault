'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutos - dados financeiros não mudam com frequência
            gcTime: 10 * 60 * 1000, // 10 minutos - manter em cache por mais tempo
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Não refetch automático ao montar
            refetchOnReconnect: false,
            retry: 1, // Reduzir tentativas de retry
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
