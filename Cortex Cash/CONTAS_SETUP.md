# Setup Completo: Sistema de Contas

## ✅ O que foi implementado

Todo o sistema de CRUD de contas já estava implementado! Apenas adicionei melhorias no seed de instituições.

### 1. Services (já existiam)
- ✅ `lib/services/conta.service.ts` - CRUD completo de contas
- ✅ `lib/services/instituicao.service.ts` - CRUD completo de instituições
- ✅ Validação de dados
- ✅ Error handling customizado
- ✅ Cálculo automático de saldos
- ✅ Filosofia "User é soberano" (saldo de referência)

### 2. Formulários (já existiam)
- ✅ `components/forms/account-form.tsx` - Formulário de criação/edição de contas
- ✅ Validação com Zod
- ✅ Seleção de instituição
- ✅ Seleção de conta vinculada (para subconta)
- ✅ Suporte a cores personalizadas
- ✅ Status ativo/inativo

### 3. Página de Contas (já existia)
- ✅ `app/accounts/page.tsx` - Página completa de gerenciamento
- ✅ Listagem de contas com cards visuais
- ✅ Filtros por tipo (corrente, poupança, investimento, carteira)
- ✅ Visualização de detalhes
- ✅ Edição de contas
- ✅ Ativação/desativação
- ✅ Exclusão (soft delete)
- ✅ Exibição de transações recentes

### 4. Navegação (já existia)
- ✅ Menu lateral com link "Contas" → `/accounts`
- ✅ Ícone `Wallet`

### 5. Seed de Instituições (NOVO - adicionado agora)
- ✅ `lib/db/seed.ts::seedInstituicoesPadrao()` - 15 instituições brasileiras
- ✅ Integrado ao `initializeSeedData()` - carrega automaticamente

## 📦 Instituições Padrão Disponíveis

Quando você iniciar o app, estas instituições estarão disponíveis:

1. **Nubank** (260) - #8A05BE
2. **Inter** (077) - #FF7A00
3. **C6 Bank** (336) - #000000
4. **PagBank** (290) - #00A868
5. **Itaú** (341) - #EC7000
6. **Bradesco** (237) - #CC092F
7. **Banco do Brasil** (001) - #FFF200
8. **Caixa Econômica** (104) - #0066A1
9. **Santander** (033) - #EC0000
10. **Picpay** (380) - #21C25E
11. **Mercado Pago** (323) - #009EE3
12. **XP Investimentos** (102) - #000000
13. **BTG Pactual** (208) - #003C7E
14. **Carteira (Dinheiro)** - #6B7280
15. **Outro** - #9CA3AF

## 🚀 Como Usar

### Passo 1: Criar sua primeira conta

1. Inicie o app: `npm run dev`
2. Acesse `/accounts` no menu lateral
3. Clique em "Nova Conta"
4. Preencha:
   - **Nome**: Ex: "Nubank - Conta Corrente", "Carteira", etc.
   - **Tipo**: Corrente, Poupança, Investimento ou Carteira
   - **Instituição**: Selecione da lista
   - **Saldo de Referência**: Seu saldo atual verificado
   - **Cor**: Personalize a cor do card (automático se for conta vinculada)

### Passo 2: Criar transações associadas à conta

Agora todas as transações que você criar poderão ser associadas às suas contas!

1. Vá em `/transactions`
2. Clique em "Nova Transação"
3. Selecione a conta no campo "Conta"
4. Preencha os dados da transação

### Passo 3: Visualizar saldos e estatísticas

- Na página `/accounts`, você verá:
  - Saldo total de todas as contas ativas
  - Cards individuais com saldo de cada conta
  - Número de movimentações por conta
  - Filtros por tipo de conta

## 🎯 Próximos Passos Recomendados

### Para começar a usar agora:

1. **Crie suas contas principais**:
   - Conta corrente principal
   - Carteira (dinheiro físico)
   - Outras contas que você usa

2. **Associe transações existentes**:
   - Edite transações antigas para associá-las às contas corretas
   - Use o campo "Conta" no formulário de transação

3. **Migre transações não associadas**:
   ```typescript
   // Se você já tem transações sem conta_id, pode criar um script para associá-las
   // Exemplo: associar todas a uma conta padrão temporária
   ```

### Fluxo ideal de uso:

1. **Criar contas** → `/accounts` → "Nova Conta"
2. **Criar transações** → `/transactions` → Sempre selecionar a conta
3. **Acompanhar saldos** → `/accounts` → Ver saldo atualizado automaticamente

## 📊 Schema de Contas

```typescript
interface Conta {
  id: string
  instituicao_id: string          // FK para instituição
  nome: string                     // "Nubank - Conta Corrente"
  tipo: TipoConta                  // 'corrente' | 'poupanca' | 'investimento' | 'carteira'
  agencia?: string
  numero?: string
  saldo_referencia: number         // Saldo verificado pelo usuário
  data_referencia: Date            // Quando foi verificado
  saldo_atual: number              // Calculado automaticamente (cache)
  ativa: boolean
  cor?: string
  icone?: string
  observacoes?: string
  conta_pai_id?: string            // Para contas vinculadas (opcional)
  created_at: Date
  updated_at: Date
}
```

## 🔥 Filosofia "User é Soberano"

O sistema usa **saldo de referência** como verdade absoluta:

- **saldo_referencia**: O saldo que VOCÊ verificou no banco (confiável)
- **data_referencia**: Quando você verificou esse saldo
- **saldo_atual**: Calculado a partir do saldo_referencia + transações

### Por que isso é melhor?

- Você pode corrigir divergências facilmente
- Basta atualizar o saldo_referencia quando verificar o extrato real
- O sistema recalcula tudo automaticamente

## ⚠️ Importante

- **TODA transação precisa ter uma conta associada** (`conta_id` é obrigatório)
- Se você já tem transações antigas sem conta, **crie uma conta primeiro**
- Depois edite as transações para associá-las à conta correta

## 🐛 Troubleshooting

### Erro: "conta_id é obrigatório"
- Você está tentando criar uma transação sem selecionar uma conta
- **Solução**: Crie pelo menos uma conta primeiro em `/accounts`

### Não vejo minhas instituições
- **Solução**: Limpe o banco e recarregue a página
- As instituições são criadas automaticamente na inicialização

### Saldo não bate com o banco
- **Solução**: Vá em "Editar Conta" e atualize o "Saldo de Referência"
- O sistema recalculará tudo a partir desse saldo

## ✨ Pronto!

Agora você pode criar suas contas e todas as transações futuras estarão associadas a elas!

**Recomendação**: Crie suas contas principais ANTES de continuar adicionando transações.
