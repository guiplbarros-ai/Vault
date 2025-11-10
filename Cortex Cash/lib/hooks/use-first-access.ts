/**
 * Hook useFirstAccess
 * Agent BACKEND: Owner
 *
 * Detecta se é o primeiro acesso do usuário
 */

import { useState, useEffect } from 'react'
import { contaService } from '@/lib/services/conta.service'

const ONBOARDING_COMPLETED_KEY = 'cortex-cash-onboarding-completed'

export function useFirstAccess() {
  const [isFirstAccess, setIsFirstAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkFirstAccess()
  }, [])

  async function checkFirstAccess() {
    try {
      // Verificar se onboarding j� foi completado
      const onboardingCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true'

      if (onboardingCompleted) {
        setIsFirstAccess(false)
        setLoading(false)
        return
      }

      // Verificar se h� contas cadastradas
      const contas = await contaService.listContas()
      const hasContas = contas.length > 0

      setIsFirstAccess(!hasContas)
    } catch (error) {
      console.error('Erro ao verificar primeiro acesso:', error)
      setIsFirstAccess(false)
    } finally {
      setLoading(false)
    }
  }

  function markOnboardingAsCompleted() {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
    setIsFirstAccess(false)
  }

  function resetOnboarding() {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY)
    setIsFirstAccess(true)
  }

  return {
    isFirstAccess,
    loading,
    markOnboardingAsCompleted,
    resetOnboarding,
  }
}
