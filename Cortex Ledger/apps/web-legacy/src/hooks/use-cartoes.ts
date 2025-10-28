import { useState, useEffect, useCallback } from 'react'
import type { CartaoCredito, CartaoFormInput, ResumoCartoes } from '@/types/cartao'

/**
 * Hook para gerenciar cartões de crédito
 */
export function useCartoes() {
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCartoes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cartoes')

      if (!response.ok) {
        throw new Error('Erro ao buscar cartões')
      }

      const data = await response.json()
      setCartoes(data.cartoes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  const criarCartao = useCallback(async (input: CartaoFormInput) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cartoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar cartão')
      }

      const data = await response.json()
      setCartoes((prev) => [data.cartao, ...prev])
      return data.cartao
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const atualizarCartao = useCallback(
    async (id: string, input: Partial<CartaoFormInput>) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/cartoes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao atualizar cartão')
        }

        const data = await response.json()
        setCartoes((prev) =>
          prev.map((cartao) => (cartao.id === id ? data.cartao : cartao))
        )
        return data.cartao
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const desativarCartao = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cartoes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao desativar cartão')
      }

      setCartoes((prev) => prev.filter((cartao) => cartao.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCartoes()
  }, [fetchCartoes])

  return {
    cartoes,
    loading,
    error,
    fetchCartoes,
    criarCartao,
    atualizarCartao,
    desativarCartao,
  }
}

/**
 * Hook para buscar resumo de cartões
 */
export function useResumoCartoes() {
  const [resumo, setResumo] = useState<ResumoCartoes | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResumo = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cartoes/resumo')

      if (!response.ok) {
        throw new Error('Erro ao buscar resumo')
      }

      const data = await response.json()
      setResumo(data.resumo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResumo()
  }, [fetchResumo])

  return {
    resumo,
    loading,
    error,
    fetchResumo,
  }
}

/**
 * Hook para buscar um cartão específico
 */
export function useCartao(id: string | null) {
  const [cartao, setCartao] = useState<CartaoCredito | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCartao = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cartoes/${id}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar cartão')
      }

      const data = await response.json()
      setCartao(data.cartao)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCartao()
  }, [fetchCartao])

  return {
    cartao,
    loading,
    error,
    fetchCartao,
  }
}
