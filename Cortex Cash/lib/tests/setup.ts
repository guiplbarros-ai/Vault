/**
 * Vitest Setup File
 * Agent CORE: Implementador
 *
 * Configura ambiente de testes com fake IndexedDB
 */

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { vi } from 'vitest';

// Setup global IndexedDB
globalThis.indexedDB = new IDBFactory();

// Mock Date to ensure timestamps are different for test assertions
let mockTimeOffset = 0;
const realDate = Date;

// @ts-ignore
globalThis.Date = class extends realDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      // When creating new Date() for timestamps, add incrementing offset
      const baseTime = realDate.now() + mockTimeOffset;
      mockTimeOffset += 1; // Increment by 1ms for each new Date()
      super(baseTime);
    } else {
      // When creating Date with specific args, use real Date
      // @ts-ignore
      super(...args);
    }
  }

  static now() {
    return realDate.now() + mockTimeOffset;
  }
};

// Mock crypto.randomUUID for tests
if (!globalThis.crypto) {
  globalThis.crypto = {} as Crypto;
}

if (!globalThis.crypto.randomUUID) {
  let counter = 0;
  globalThis.crypto.randomUUID = (() => {
    counter++;
    return `test-uuid-${counter.toString().padStart(8, '0')}`;
  }) as any;
}

// Mock SubtleCrypto for hash generation
if (!globalThis.crypto.subtle) {
  (globalThis.crypto as any).subtle = {
    digest: async (algorithm: string, data: BufferSource) => {
      // Simple mock hash - returns consistent values for testing
      const textData = new TextDecoder().decode(data);
      let hash = 0;
      for (let i = 0; i < textData.length; i++) {
        const char = textData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      // Return as ArrayBuffer (32 bytes to simulate SHA-256)
      const buffer = new ArrayBuffer(32);
      const view = new DataView(buffer);
      view.setInt32(0, hash);
      return buffer;
    },
  } as SubtleCrypto;
}
