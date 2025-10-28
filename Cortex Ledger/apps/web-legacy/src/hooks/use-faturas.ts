import { useState, useEffect, useCallback } from 'react'
import type {
  Fatura,
  FaturaDetalhesResponse,
  FaturaPagamentoInput,
  ProjecaoFaturaFutura,
} from '@/types/cartao'

/**
 * Hook para gerenciar faturas de um cartão
 */
export function useFaturas(cartaoId: string | null, limit = 12) {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFaturas = useCallback(async () => {
    if (!cartaoId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/faturas?cartao_id=${cartaoId}&limit=${limit}`
      )

      if (!response.ok) {
        throw new Error('Erro ao buscar faturas')
      }

      const data = await response.json()
      setFaturas(data.faturas)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [cartaoId, limit])

  const criarFatura = useCallback(
    async (
      mesReferencia: string,
      dataFechamento: Date,
      dataVencimento: Date
    ) => {
      if (!cartaoId) throw new Error('cartaoId é obrigatório')

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/faturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartaoId,
            mesReferencia,
            dataFechamento: dataFechamento.toISOString(),
            dataVencimento: dataVencimento.toISOString(),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao criar fatura')
        }

        const data = await response.json()
        setFaturas((prev) => [data.fatura, ...prev])
        return data.fatura
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [cartaoId]
  )

  const deletarFatura = useCallback(async (faturaId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/faturas/${faturaId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao deletar fatura')
      }

      setFaturas((prev) => prev.filter((fatura) => fatura.id !== faturaId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFaturas()
  }, [fetchFaturas])

  return {
    faturas,
    loading,
    error,
    fetchFaturas,
    criarFatura,
    deletarFatura,
  }
}

/**
 * Hook para buscar detalhes de uma fatura
 */
export function useFaturaDetalhes(faturaId: string | null) {
  const [detalhes, setDetalhes] = useState<FaturaDetalhesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetalhes = useCallback(async () => {
    if (!faturaId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/faturas/${faturaId}/detalhes`)

      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes da fatura')
      }

      const data = await response.json()
      setDetalhes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [faturaId])

  useEffect(() => {
    fetchDetalhes()
  }, [fetchDetalhes])

  return {
    detalhes,
    loading,
    error,
    fetchDetalhes,
  }
}

/**
 * Hook para operações de fatura (fechar, pagar)
 */
export function useFaturaOperacoes() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fecharFatura = useCallback(async (faturaId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/faturas/${faturaId}/fechar`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao fechar fatura')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const pagarFatura = useCallback(async (input: FaturaPagamentoInput) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/faturas/${input.faturaId}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contaOrigemId: input.contaOrigemId,
          valor: input.valor,
          dataPagamento: input.dataPagamento.toISOString(),
          observacoes: input.observacoes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao pagar fatura')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    fecharFatura,
    pagarFatura,
  }
}

/**
 * Hook para buscar faturas vencidas
 */
export function useFaturasVencidas() {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFaturasVencidas = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/faturas/vencidas')

      if (!response.ok) {
        throw new Error('Erro ao buscar faturas vencidas')
      }

      const data = await response.json()
      setFaturas(data.faturas)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFaturasVencidas()
  }, [fetchFaturasVencidas])

  return {
    faturas,
    loading,
    error,
    fetchFaturasVencidas,
  }
}

/**
 * Hook para buscar faturas próximas do vencimento
 */
export function useFaturasProximas(dias = 7) {
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFaturasProximas = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/faturas/proximas?dias=${dias}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar faturas próximas')
      }

      const data = await response.json()
      setFaturas(data.faturas)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [dias])

  useEffect(() => {
    fetchFaturasProximas()
  }, [fetchFaturasProximas])

  return {
    faturas,
    loading,
    error,
    fetchFaturasProximas,
  }
}

/**
 * Hook para projetar faturas futuras
 */
export function useProjecaoFaturas(cartaoId: string | null, meses = 3) {
  const [projecoes, setProjecoes] = useState<ProjecaoFaturaFutura[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjecoes = useCallback(async () => {
    if (!cartaoId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/faturas/projecao?cartao_id=${cartaoId}&meses=${meses}`
      )

      if (!response.ok) {
        throw new Error('Erro ao projetar faturas')
      }

      const data = await response.json()
      setProjecoes(data.projecoes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [cartaoId, meses])

  useEffect(() => {
    fetchProjecoes()
  }, [fetchProjecoes])

  return {
    projecoes,
    loading,
    error,
    fetchProjecoes,
  }
}
