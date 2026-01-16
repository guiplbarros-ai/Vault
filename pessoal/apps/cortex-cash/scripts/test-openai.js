#!/usr/bin/env node

/**
 * Test OpenAI API Key
 * Agent IA: Owner
 *
 * Valida se a API key está configurada e funcional
 */

require('dotenv').config({ path: '.env.local' })

async function testOpenAIKey() {
  console.log('========================================')
  console.log('  OpenAI API Key Validation')
  console.log('========================================\n')

  // Check if key is configured
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || apiKey.trim() === '') {
    console.log('❌ API Key NÃO configurada\n')
    console.log('Siga as instruções em: OPENAI_SETUP.md')
    console.log('Ou execute: ./scripts/setup-openai.sh\n')
    process.exit(1)
  }

  // Check key format
  if (!apiKey.startsWith('sk-')) {
    console.log('⚠️  API Key com formato inválido')
    console.log('Chaves da OpenAI começam com "sk-" ou "sk-proj-"\n')
    process.exit(1)
  }

  console.log('✅ API Key configurada')
  console.log(`   Formato: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}\n`)

  // Test API call
  console.log('🔄 Testando chamada à API...\n')

  try {
    const OpenAI = require('openai').default
    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello from Cortex Cash!"' },
      ],
      max_tokens: 20,
    })

    const response = completion.choices[0]?.message?.content || ''
    const usage = completion.usage

    console.log('✅ API funcionando!\n')
    console.log('Resposta da IA:')
    console.log(`  "${response}"\n`)
    console.log('Uso de tokens:')
    console.log(`  Input:  ${usage.prompt_tokens} tokens`)
    console.log(`  Output: ${usage.completion_tokens} tokens`)
    console.log(`  Total:  ${usage.total_tokens} tokens\n`)

    // Calculate cost
    const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15
    const outputCost = (usage.completion_tokens / 1_000_000) * 0.6
    const totalCost = inputCost + outputCost

    console.log('Custo desta chamada:')
    console.log(`  $${totalCost.toFixed(6)} USD (~R$ ${(totalCost * 6).toFixed(4)})\n`)

    console.log('========================================')
    console.log('✅ Tudo pronto para usar IA!')
    console.log('========================================\n')

    console.log('Próximos passos:')
    console.log('1. Inicie o servidor: npm run dev')
    console.log('2. Acesse: http://localhost:3000/settings')
    console.log('3. Vá em "IA e Custos" → Ative recursos de IA')
    console.log('4. Teste classificando uma transação!\n')
  } catch (error) {
    console.log('❌ Erro ao chamar API:\n')

    if (error.status === 401) {
      console.log('API Key inválida ou revogada')
      console.log('\nSoluções:')
      console.log('1. Gerar nova key em: https://platform.openai.com/api-keys')
      console.log('2. Verificar se copiou a chave completa')
      console.log('3. Conferir se não há espaços extras\n')
    } else if (error.status === 429) {
      console.log('Limite de uso excedido ou sem créditos')
      console.log('\nSoluções:')
      console.log('1. Adicionar créditos: https://platform.openai.com/account/billing')
      console.log('2. Aguardar renovação do limite\n')
    } else {
      console.log(`Erro: ${error.message}\n`)
      console.log('Detalhes:', error)
    }

    process.exit(1)
  }
}

testOpenAIKey().catch(console.error)
