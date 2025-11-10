/**
 * Demo Mode - Barrel Export
 * Agent BACKEND: Owner
 *
 * Exporta todas as funcionalidades de modo demo
 */

// Demo Mode Helpers
export {
  isDemoMode,
  enableDemoMode,
  disableDemoMode,
  toggleDemoMode,
  hasDemoDataPopulated,
  markDemoDataAsPopulated,
  clearDemoDataFlag,
  resetDemoConfig,
  getDemoStatus,
} from '../config/demo-mode'

// Demo Data Seeds
export { seedDemoData, clearDemoData } from '../db/seed-demo'

/**
 * Ativa modo demo e popula dados (se ainda não populado)
 */
export async function enableDemoModeAndPopulate(): Promise<{
  success: boolean
  alreadyPopulated: boolean
  stats?: {
    instituicoes: number
    contas: number
    categorias: number
    transacoes: number
  }
}> {
  const { isDemoMode, enableDemoMode, hasDemoDataPopulated, markDemoDataAsPopulated } = await import(
    '../config/demo-mode'
  )
  const { seedDemoData } = await import('../db/seed-demo')

  // Ativar modo demo
  enableDemoMode()

  // Verificar se já foi populado
  const alreadyPopulated = hasDemoDataPopulated()

  if (alreadyPopulated) {
    return {
      success: true,
      alreadyPopulated: true,
    }
  }

  // Popular dados
  const stats = await seedDemoData()

  // Marcar como populado
  markDemoDataAsPopulated()

  return {
    success: true,
    alreadyPopulated: false,
    stats,
  }
}

/**
 * Desativa modo demo e limpa dados
 */
export async function disableDemoModeAndClear(): Promise<void> {
  const { disableDemoMode, clearDemoDataFlag } = await import('../config/demo-mode')
  const { clearDemoData } = await import('../db/seed-demo')

  // Limpar dados
  await clearDemoData()

  // Desativar modo demo
  disableDemoMode()

  // Limpar flag de população
  clearDemoDataFlag()
}
