#!/usr/bin/env node
/**
 * Smoke Tests para APIs de IA
 * Agent DATA: Owner
 *
 * Script simples para validar que todos os endpoints estão funcionando
 * Usage: npm run ai:smoke
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

let passedTests = 0;
let failedTests = 0;

function log(message, type = 'info') {
  const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    warning: '\x1b[33m',
    reset: '\x1b[0m',
  };
  const color = colors[type] || colors.info;
  console.log(`${color}${message}${colors.reset}`);
}

async function test(name, fn) {
  try {
    process.stdout.write(`  Testing: ${name}... `);
    await fn();
    log('✅ PASSED', 'success');
    passedTests++;
  } catch (error) {
    log(`❌ FAILED: ${error.message}`, 'error');
    failedTests++;
  }
}

async function runTests() {
  log('\n🧪 AI API Smoke Tests\n', 'info');
  log(`Base URL: ${BASE_URL}\n`, 'info');

  // Test 1: Status endpoint
  await test('GET /api/ai/status', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/status`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (typeof data.apiKeyConfigured !== 'boolean') {
      throw new Error('apiKeyConfigured não é boolean');
    }
  });

  // Test 2: Cache stats
  await test('GET /api/ai/cache', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/cache`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.cache) {
      throw new Error('Resposta inválida');
    }
    if (typeof data.cache.size !== 'number') {
      throw new Error('Cache size não é number');
    }
  });

  // Test 3: Usage endpoint
  await test('GET /api/ai/usage', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/usage?limit=10`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (typeof data.usedBrl !== 'number') {
      throw new Error('usedBrl não é number');
    }
    if (typeof data.percentage !== 'number') {
      throw new Error('percentage não é number');
    }
  });

  // Test 4: Classify endpoint (sem API key deve retornar erro)
  await test('POST /api/ai/classify (missing fields)', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao: 'Teste' }), // Faltando campos
    });
    if (res.status !== 400) {
      throw new Error(`Esperado 400, recebeu ${res.status}`);
    }
  });

  // Test 5: Config endpoint
  await test('POST /api/ai/config', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        defaultModel: 'gpt-4o-mini',
        monthlyCostLimit: 10,
        strategy: 'balanced',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('success !== true');
  });

  // Test 6: Cache cleanup
  await test('DELETE /api/ai/cache?action=clean', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/cache?action=clean`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('success !== true');
  });

  // Test 7: Invalid cache action
  await test('DELETE /api/ai/cache?action=invalid (should fail)', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/cache?action=invalid`, {
      method: 'DELETE',
    });
    if (res.status !== 400) {
      throw new Error(`Esperado 400, recebeu ${res.status}`);
    }
  });

  // Summary
  log('\n' + '='.repeat(50), 'info');
  log(`\n📊 Test Summary:`, 'info');
  log(`   Passed: ${passedTests}`, 'success');
  log(`   Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'info');
  log(`   Total:  ${passedTests + failedTests}`, 'info');

  if (failedTests > 0) {
    log('\n❌ Some tests failed!', 'error');
    process.exit(1);
  } else {
    log('\n✅ All tests passed!', 'success');
    process.exit(0);
  }
}

// Run
log('Starting smoke tests...', 'info');
log('Make sure the dev server is running (npm run dev)\n', 'warning');

setTimeout(() => {
  runTests().catch((error) => {
    log(`\n💥 Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
}, 1000);
