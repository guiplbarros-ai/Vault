#!/usr/bin/env node
/**
 * Smoke Tests para APIs de Importação
 * Agent DATA: Owner
 *
 * Usage: npm run import:smoke
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

// CSV de exemplo
const sampleCSV = `Data,Descrição,Valor
01/01/2024,Compra 1,100.00
02/01/2024,Compra 2,200.00
03/01/2024,Compra 3,150.50`;

async function runTests() {
  log('\n🧪 Import API Smoke Tests\n', 'info');
  log(`Base URL: ${BASE_URL}\n`, 'info');

  // Test 1: Templates endpoint
  await test('GET /api/import/templates', async () => {
    const res = await fetch(`${BASE_URL}/api/import/templates`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.templates || !Array.isArray(data.templates)) {
      throw new Error('templates não é array');
    }
    if (data.templates.length < 6) {
      throw new Error(`Esperado >= 6 templates, recebeu ${data.templates.length}`);
    }
  });

  // Test 2: Template específico
  await test('GET /api/import/templates?id=bradesco', async () => {
    const res = await fetch(`${BASE_URL}/api/import/templates?id=bradesco`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.id !== 'bradesco') throw new Error('Template ID incorreto');
    if (!data.columnMapping) throw new Error('columnMapping ausente');
  });

  // Test 3: Busca de templates
  await test('GET /api/import/templates?search=inter', async () => {
    const res = await fetch(`${BASE_URL}/api/import/templates?search=inter`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.templates || data.templates.length === 0) {
      throw new Error('Busca não retornou resultados');
    }
  });

  // Test 4: Upload endpoint (sem arquivo - deve falhar)
  await test('POST /api/import/upload (sem arquivo)', async () => {
    const formData = new FormData();
    const res = await fetch(`${BASE_URL}/api/import/upload`, {
      method: 'POST',
      body: formData,
    });
    if (res.status !== 400) {
      throw new Error(`Esperado 400, recebeu ${res.status}`);
    }
  });

  // Test 5: Upload endpoint (com CSV simulado)
  await test('POST /api/import/upload (com CSV)', async () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const file = new File([blob], 'test.csv', { type: 'text/csv' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', 'generic');

    const res = await fetch(`${BASE_URL}/api/import/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    if (!data.file) throw new Error('file ausente');
    if (!data.metadata) throw new Error('metadata ausente');
    if (!data.transactions) throw new Error('transactions ausente');
    if (data.transactions.length !== 3) {
      throw new Error(`Esperado 3 transações, recebeu ${data.transactions.length}`);
    }
  });

  // Test 6: Process endpoint (sem dados - deve falhar)
  await test('POST /api/import/process (sem dados)', async () => {
    const res = await fetch(`${BASE_URL}/api/import/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status !== 400) {
      throw new Error(`Esperado 400, recebeu ${res.status}`);
    }
  });

  // Test 7: Template não existente
  await test('GET /api/import/templates?id=inexistente', async () => {
    const res = await fetch(`${BASE_URL}/api/import/templates?id=inexistente`);
    if (res.status !== 404) {
      throw new Error(`Esperado 404, recebeu ${res.status}`);
    }
  });

  // Test 8: Upload de arquivo muito grande (simulado)
  await test('POST /api/import/upload (arquivo muito grande)', async () => {
    // Cria um CSV gigante (> 10MB)
    const largeCSV = 'Data,Descrição,Valor\n' + 'x'.repeat(11 * 1024 * 1024);
    const blob = new Blob([largeCSV], { type: 'text/csv' });
    const file = new File([blob], 'large.csv', { type: 'text/csv' });

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/api/import/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.status !== 400) {
      throw new Error(`Esperado 400, recebeu ${res.status}`);
    }
  });

  // Test 9: Upload de tipo inválido
  await test('POST /api/import/upload (tipo inválido)', async () => {
    const blob = new Blob(['fake content'], { type: 'application/pdf' });
    const file = new File([blob], 'test.pdf', { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/api/import/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.status !== 400) {
      throw new Error(`Esperado 400, recebeu ${res.status}`);
    }
  });

  // Test 10: Validação de separador
  await test('Upload CSV com separador ;', async () => {
    const csvSemicolon = `Data;Descrição;Valor
01/01/2024;Compra;100,00`;

    const blob = new Blob([csvSemicolon], { type: 'text/csv' });
    const file = new File([blob], 'test.csv', { type: 'text/csv' });

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/api/import/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    if (data.metadata.separator !== ';') {
      throw new Error(`Esperado separador ;, recebeu ${data.metadata.separator}`);
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
log('Starting import smoke tests...', 'info');
log('Make sure the dev server is running (npm run dev)\n', 'warning');

setTimeout(() => {
  runTests().catch((error) => {
    log(`\n💥 Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
}, 1000);
