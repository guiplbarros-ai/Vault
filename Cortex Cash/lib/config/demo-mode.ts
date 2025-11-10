/**
 * Demo Mode Helper
 * Agent BACKEND: Owner
 *
 * Gerencia o modo demonstração da aplicação
 */

const DEMO_MODE_KEY = 'cortex-cash-demo-mode'
const DEMO_DATA_FLAG_KEY = 'cortex-cash-demo-data-populated'

/**
 * Verifica se o modo demo está ativo
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DEMO_MODE_KEY) === 'true'
}

/**
 * Ativa o modo demo
 */
export function enableDemoMode(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_MODE_KEY, 'true')
  console.log('🎭 Modo Demo ATIVADO')
}

/**
 * Desativa o modo demo
 */
export function disableDemoMode(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_MODE_KEY, 'false')
  console.log('🎭 Modo Demo DESATIVADO')
}

/**
 * Toggle do modo demo
 */
export function toggleDemoMode(): boolean {
  const isCurrentlyDemo = isDemoMode()
  if (isCurrentlyDemo) {
    disableDemoMode()
  } else {
    enableDemoMode()
  }
  return !isCurrentlyDemo
}

/**
 * Verifica se os dados demo já foram populados
 */
export function hasDemoDataPopulated(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DEMO_DATA_FLAG_KEY) === 'true'
}

/**
 * Marca que os dados demo foram populados
 */
export function markDemoDataAsPopulated(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_DATA_FLAG_KEY, 'true')
}

/**
 * Remove a flag de dados demo populados
 */
export function clearDemoDataFlag(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEMO_DATA_FLAG_KEY)
}

/**
 * Limpa completamente as configurações de demo
 */
export function resetDemoConfig(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEMO_MODE_KEY)
  localStorage.removeItem(DEMO_DATA_FLAG_KEY)
  console.log('🎭 Configurações de Demo RESETADAS')
}

/**
 * Retorna informações sobre o estado do demo
 */
export function getDemoStatus(): {
  isDemoMode: boolean
  hasData: boolean
  canPopulate: boolean
} {
  const isDemo = isDemoMode()
  const hasData = hasDemoDataPopulated()

  return {
    isDemoMode: isDemo,
    hasData,
    canPopulate: isDemo && !hasData,
  }
}
