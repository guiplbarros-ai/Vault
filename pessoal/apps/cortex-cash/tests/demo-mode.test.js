/**
 * Testes de Modo Demo
 * Script de testes para validar funcionalidades do modo demonstração
 */

// Simular ambiente de browser
global.window = {}
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null
  },
  setItem(key, value) {
    this.data[key] = value
  },
  removeItem(key) {
    delete this.data[key]
  },
  clear() {
    this.data = {}
  },
}

// Importar funções
const {
  isDemoMode,
  enableDemoMode,
  disableDemoMode,
  toggleDemoMode,
  hasDemoDataPopulated,
  markDemoDataAsPopulated,
  clearDemoDataFlag,
  resetDemoConfig,
  getDemoStatus,
} = require('../lib/config/demo-mode.ts')

console.log('🧪 Iniciando testes de Modo Demo...\n')

let testsPassed = 0
let testsFailed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`)
    testsPassed++
  } else {
    console.log(`❌ ${message}`)
    testsFailed++
  }
}

// Limpar antes dos testes
localStorage.clear()

// Teste 1: Estado inicial
assert(!isDemoMode(), 'Estado inicial: modo demo desativado')
assert(!hasDemoDataPopulated(), 'Estado inicial: dados não populados')

// Teste 2: Ativar modo demo
enableDemoMode()
assert(isDemoMode(), 'enableDemoMode(): ativa corretamente')

// Teste 3: Desativar modo demo
disableDemoMode()
assert(!isDemoMode(), 'disableDemoMode(): desativa corretamente')

// Teste 4: Toggle modo demo
const result1 = toggleDemoMode()
assert(isDemoMode() && result1, 'toggleDemoMode(): ativa quando desativado')

const result2 = toggleDemoMode()
assert(!isDemoMode() && !result2, 'toggleDemoMode(): desativa quando ativado')

// Teste 5: Marcar dados como populados
markDemoDataAsPopulated()
assert(hasDemoDataPopulated(), 'markDemoDataAsPopulated(): marca corretamente')

// Teste 6: Limpar flag de dados
clearDemoDataFlag()
assert(!hasDemoDataPopulated(), 'clearDemoDataFlag(): limpa corretamente')

// Teste 7: getDemoStatus
enableDemoMode()
markDemoDataAsPopulated()
const status = getDemoStatus()
assert(
  status.isDemoMode && status.hasData && !status.canPopulate,
  'getDemoStatus(): retorna status correto quando modo ativo e dados populados'
)

// Teste 8: Reset completo
resetDemoConfig()
assert(!isDemoMode() && !hasDemoDataPopulated(), 'resetDemoConfig(): limpa tudo')

// Teste 9: canPopulate lógica
enableDemoMode()
const status2 = getDemoStatus()
assert(
  status2.isDemoMode && !status2.hasData && status2.canPopulate,
  'getDemoStatus(): canPopulate=true quando modo ativo e sem dados'
)

// Resumo
console.log('\n' + '='.repeat(50))
console.log(`📊 Resultados dos Testes:`)
console.log(`✅ Passou: ${testsPassed}`)
console.log(`❌ Falhou: ${testsFailed}`)
console.log(`📈 Total: ${testsPassed + testsFailed}`)
console.log('='.repeat(50))

process.exit(testsFailed > 0 ? 1 : 0)
