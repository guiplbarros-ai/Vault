/**
 * Vitest Setup File
 * Configura ambiente de testes para budget-cortihouse
 */

// Mock Date para timestamps determinísticos
let mockTimeOffset = 0
const realDate = Date

// @ts-ignore
globalThis.Date = class extends realDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) {
      const baseTime = realDate.now() + mockTimeOffset
      mockTimeOffset += 1
      super(baseTime)
    } else {
      // @ts-ignore
      super(...args)
    }
  }

  static now() {
    return realDate.now() + mockTimeOffset
  }
}

// Mock crypto.randomUUID para UUIDs determinísticos
if (!globalThis.crypto) {
  globalThis.crypto = {} as Crypto
}

if (!globalThis.crypto.randomUUID) {
  let counter = 0
  globalThis.crypto.randomUUID = (() => {
    counter++
    return `test-uuid-${counter.toString().padStart(8, '0')}`
  }) as () => `${string}-${string}-${string}-${string}-${string}`
}

// Reset mocks antes de cada teste
beforeEach(() => {
  mockTimeOffset = 0
})
