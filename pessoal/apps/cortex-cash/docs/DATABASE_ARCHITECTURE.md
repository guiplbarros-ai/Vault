# Arquitetura do Banco de Dados - Cortex Cash

**Versão**: 1.0
**Última Atualização**: 2025-11-09
**Tecnologia**: Dexie.js (IndexedDB)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Tecnologia e Arquitetura](#tecnologia-e-arquitetura)
3. [Schema Completo](#schema-completo)
4. [Relacionamentos entre Tabelas](#relacionamentos-entre-tabelas)
5. [Sistema Multi-Usuário](#sistema-multi-usuário)
6. [Migrações e Versionamento](#migrações-e-versionamento)
7. [Fluxos de Dados](#fluxos-de-dados)
8. [Índices e Performance](#índices-e-performance)
9. [Segurança e Isolamento](#segurança-e-isolamento)
10. [Backup e Recuperação](#backup-e-recuperação)

---

## 🎯 Visão Geral

O Cortex Cash utiliza **IndexedDB** como banco de dados local no navegador, com a biblioteca **Dexie.js** para gerenciamento de dados. Esta escolha permite:

- ✅ **Performance**: Armazenamento local sem latência de rede
- ✅ **Privacidade**: Dados nunca saem do dispositivo do usuário
- ✅ **Offline-First**: Aplicação funciona 100% offline
- ✅ **Escalabilidade**: Suporta milhões de registros
- ✅ **Multi-Usuário**: Isolamento completo de dados por usuário

---

## 🏗️ Tecnologia e Arquitetura

### **Dexie.js sobre IndexedDB**

```typescript
// lib/db/client.ts
export class CortexCashDB extends Dexie {
  // 23 tabelas com tipos TypeScript completos
  instituicoes!: EntityTable<Instituicao, 'id'>;
  contas!: EntityTable<Conta, 'id'>;
  transacoes!: EntityTable<Transacao, 'id'>;
  // ... outras tabelas
}
```

**Principais Características**:
- **Versão Atual**: v12 (com 12 migrações progressivas)
- **Localização**: Cliente (navegador)
- **Capacidade**: ~50MB (padrão) até vários GB
- **Concorrência**: Suporte a múltiplas abas abertas

---

## 📊 Schema Completo

### **Tabelas Principais** (23 no total)

#### **1. Usuários** (`usuarios`)
Gerenciamento de usuários e permissões.

```typescript
interface Usuario {
  id: string;                    // UUID
  nome: string;
  email: string;                 // UNIQUE
  senha_hash: string;            // bcrypt
  role: 'admin' | 'user';

  // Perfil
  avatar_url?: string;
  telefone?: string;
  data_nascimento?: Date;
  cpf?: string;
  biografia?: string;
  moeda_preferida: string;       // 'BRL', 'USD', 'EUR'
  idioma_preferido: string;      // 'pt-BR', 'en-US'

  // Controle
  ativo: boolean;
  ultimo_acesso?: Date;
  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, email, role, ativo`

---

#### **2. Instituições Financeiras** (`instituicoes`)
Bancos e instituições financeiras.

```typescript
interface Instituicao {
  id: string;
  nome: string;                  // Ex: "Banco do Brasil"
  codigo?: string;               // Ex: "001"
  logo_url?: string;
  cor?: string;                  // Cor tema (#hex)
  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, nome, codigo`

**Exemplos**:
- Banco do Brasil (001)
- Itaú (341)
- Nubank
- Inter

---

#### **3. Contas Bancárias** (`contas`)
Contas correntes, poupanças, investimentos, carteiras.

```typescript
interface Conta {
  id: string;
  instituicao_id: string;        // FK -> instituicoes
  nome: string;
  tipo: 'corrente' | 'poupanca' | 'investimento' | 'carteira';

  // Dados bancários
  agencia?: string;
  numero?: string;

  // Filosofia de Saldo: User é Soberano
  saldo_referencia: number;      // Saldo verificado pelo usuário
  data_referencia: Date;         // Quando foi verificado
  saldo_atual: number;           // Cache calculado

  // Hierarquia
  conta_pai_id?: string;         // FK -> contas (para contas vinculadas)

  // Customização
  ativa: boolean;
  cor?: string;
  icone?: string;
  observacoes?: string;

  // Multi-usuário
  usuario_id: string;            // FK -> usuarios

  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, instituicao_id, nome, tipo, ativa, conta_pai_id, usuario_id`

**Filosofia de Saldo**:
1. **User é soberano**: O usuário informa o saldo real em uma data específica (`saldo_referencia` + `data_referencia`)
2. **Sistema calcula**: A partir desse ponto de referência, o sistema soma/subtrai transações para calcular `saldo_atual`
3. **Sempre preciso**: O saldo é recalculado a cada transação

**Exemplo de Hierarquia**:
```
Banco Inter (Conta Corrente)
  ├─ Poupança Inter (conta_pai_id = Conta Corrente)
  └─ Investimentos Inter (conta_pai_id = Conta Corrente)
```

---

#### **4. Categorias** (`categorias`)
Sistema hierárquico de categorias para classificação.

```typescript
interface Categoria {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa' | 'transferencia';
  grupo?: string;                // Categoria pai (legado)
  pai_id?: string;               // FK -> categorias (hierarquia)

  // Customização
  icone?: string;                // Emoji ou nome do ícone
  cor?: string;
  ordem: number;                 // Para ordenação manual

  // Controle
  ativa: boolean;
  is_sistema: boolean;           // Se é categoria padrão do sistema
  usuario_id: string;            // FK -> usuarios

  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, nome, tipo, grupo, pai_id, ativa, ordem, usuario_id, is_sistema`

**Hierarquia de Categorias**:
```
Alimentação (categoria pai)
  ├─ Restaurantes (subcategoria)
  ├─ Supermercado (subcategoria)
  └─ Delivery (subcategoria)
```

**Categorias do Sistema** (`is_sistema: true`):
- 39 categorias padrão criadas no seed
- Visíveis para todos os usuários
- Não podem ser deletadas
- Usuários podem criar suas próprias categorias personalizadas

---

#### **5. Transações** (`transacoes`)
Registro de todas as movimentações financeiras.

```typescript
interface Transacao {
  id: string;
  conta_id: string;              // FK -> contas
  categoria_id?: string;         // FK -> categorias
  centro_custo_id?: string;      // FK -> centros_custo

  // Dados básicos
  data: Date;
  descricao: string;
  valor: number;                 // Positivo (receita) ou Negativo (despesa)
  tipo: 'receita' | 'despesa' | 'transferencia';

  // Dados adicionais
  observacoes?: string;
  tags?: string;                 // JSON array de tags

  // Transferências
  transferencia_id?: string;     // Agrupa origem/destino
  conta_destino_id?: string;     // FK -> contas

  // Parcelamento
  parcelado: boolean;
  parcela_numero?: number;       // Ex: 1 (de 12)
  parcela_total?: number;        // Ex: 12
  grupo_parcelamento_id?: string; // Agrupa todas as parcelas

  // Classificação
  classificacao_confirmada: boolean;
  classificacao_origem?: 'manual' | 'regra' | 'ia';
  classificacao_confianca?: number; // 0-1

  // Importação e Dedupe
  hash?: string;                 // SHA256 UNIQUE (dedupe)
  origem_arquivo?: string;
  origem_linha?: number;

  // Multi-usuário
  usuario_id: string;            // FK -> usuarios

  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, conta_id, categoria_id, centro_custo_id, data, tipo, hash (UNIQUE), transferencia_id, conta_destino_id, grupo_parcelamento_id, usuario_id`

**Dedupe de Transações**:
- Hash único gerado: `SHA256(conta_id + data + descricao + valor)`
- Índice UNIQUE em `hash` impede duplicatas
- Migração v5 remove duplicatas antigas

**Transferências**:
```typescript
// Transferência de R$ 1000 de Conta A para Conta B
{
  // Transação 1 (origem - saída)
  conta_id: 'conta-a',
  conta_destino_id: 'conta-b',
  valor: -1000,
  tipo: 'transferencia',
  transferencia_id: 'uuid-shared',
}
{
  // Transação 2 (destino - entrada)
  conta_id: 'conta-b',
  valor: 1000,
  tipo: 'transferencia',
  transferencia_id: 'uuid-shared', // MESMO ID
}
```

---

#### **6. Tags** (`tags`)
Tags customizadas para organização de transações.

```typescript
interface Tag {
  id: string;
  nome: string;                  // Ex: "Urgente", "Trabalho"
  cor?: string;
  tipo: 'sistema' | 'customizada';
  is_sistema: boolean;
  usuario_id: string;            // FK -> usuarios
  created_at: Date;
}
```

**Índices**: `id, nome, tipo, usuario_id, is_sistema`

---

#### **7. Templates de Importação** (`templates_importacao`)
Configurações reutilizáveis para importar arquivos bancários.

```typescript
interface TemplateImportacao {
  id: string;
  instituicao_id?: string;       // FK -> instituicoes

  nome: string;
  tipo_arquivo: 'csv' | 'ofx' | 'excel';

  // Configurações CSV
  separador?: string;            // Ex: ";" ou ","
  encoding?: string;             // Ex: "utf-8"
  pular_linhas?: number;

  // Mapeamento de colunas (JSON)
  mapeamento_colunas: string;    // { data: 0, descricao: 1, valor: 2 }

  // Transformações
  formato_data?: string;         // Ex: "DD/MM/YYYY"
  separador_decimal?: string;    // "," ou "."

  // Uso
  is_favorite: boolean;
  ultima_utilizacao?: Date;
  contador_uso: number;

  // Multi-usuário
  usuario_id: string;            // FK -> usuarios

  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, instituicao_id, nome, tipo_arquivo, is_favorite, usuario_id`

**Templates Pré-Configurados**:
- Nubank
- Banco do Brasil
- Itaú
- Bradesco
- Santander
- Inter
- C6 Bank

---

#### **8. Regras de Classificação** (`regras_classificacao`)
Regras automáticas para classificar transações.

```typescript
interface RegraClassificacao {
  id: string;
  categoria_id: string;          // FK -> categorias

  nome: string;
  tipo_regra: 'contains' | 'starts_with' | 'ends_with' | 'regex';
  padrao: string;                // Ex: "IFOOD" ou "^PAG.*PIX"

  prioridade: number;            // Maior = mais prioritária
  ativa: boolean;

  // Estatísticas
  total_aplicacoes: number;
  total_confirmacoes: number;
  total_rejeicoes: number;
  ultima_aplicacao?: Date;

  // Multi-usuário
  usuario_id: string;            // FK -> usuarios

  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, categoria_id, nome, tipo_regra, ativa, prioridade, usuario_id`

**Exemplo de Regras**:
```typescript
{
  nome: "iFood",
  tipo_regra: "contains",
  padrao: "IFOOD",
  categoria_id: "delivery-id", // Categoria "Delivery"
}
{
  nome: "Salário",
  tipo_regra: "starts_with",
  padrao: "SAL",
  categoria_id: "salario-id",
}
```

---

#### **9. Logs de IA** (`logs_ia`)
Registro de uso da API OpenAI para classificação.

```typescript
interface LogIA {
  id: string;
  transacao_id?: string;         // FK -> transacoes

  prompt: string;
  resposta: string;

  modelo: string;                // Ex: "gpt-4o-mini"
  tokens_prompt: number;
  tokens_resposta: number;
  tokens_total: number;
  custo_usd: number;

  categoria_sugerida_id?: string; // FK -> categorias
  confianca?: number;            // 0-1
  confirmada: boolean;

  created_at: Date;
}
```

**Índices**: `id, transacao_id, modelo, created_at`

---

#### **10. Cartões de Crédito** (`cartoes_config`)
Configuração de cartões de crédito.

```typescript
interface CartaoConfig {
  id: string;
  instituicao_id: string;        // FK -> instituicoes
  conta_pagamento_id?: string;   // FK -> contas (conta para pagar fatura)

  nome: string;
  ultimos_digitos?: string;      // Ex: "1234"
  bandeira?: 'visa' | 'mastercard' | 'elo' | 'amex';

  limite_total: number;

  // Ciclo da fatura
  dia_fechamento: number;        // 1-31
  dia_vencimento: number;        // 1-31

  ativo: boolean;
  cor?: string;

  // Multi-usuário
  usuario_id: string;            // FK -> usuarios

  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, instituicao_id, nome, ativo, usuario_id`

---

#### **11. Faturas** (`faturas`)
Faturas mensais de cartões de crédito.

```typescript
interface Fatura {
  id: string;
  cartao_id: string;             // FK -> cartoes_config

  // Período
  mes_referencia: string;        // 'YYYY-MM'
  data_fechamento: Date;
  data_vencimento: Date;

  // Valores
  valor_total: number;
  valor_minimo: number;
  valor_pago: number;

  // Status
  status: 'aberta' | 'fechada' | 'paga' | 'atrasada';
  fechada_automaticamente: boolean;

  // Pagamento
  data_pagamento?: Date;
  transacao_pagamento_id?: string; // FK -> transacoes

  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, cartao_id, mes_referencia, status`

---

#### **12. Lançamentos de Fatura** (`faturas_lancamentos`)
Compras no cartão de crédito.

```typescript
interface FaturaLancamento {
  id: string;
  fatura_id: string;             // FK -> faturas
  transacao_id?: string;         // FK -> transacoes

  // Dados da compra
  data_compra: Date;
  descricao: string;
  valor_brl: number;

  // Parcelamento
  parcela_numero?: number;
  parcela_total?: number;

  // Câmbio (compras internacionais)
  moeda_original?: string;
  valor_original?: number;
  taxa_cambio?: number;

  categoria_id?: string;         // FK -> categorias

  created_at: Date;
}
```

**Índices**: `id, fatura_id, transacao_id, data_compra`

---

#### **13. Centros de Custo** (`centros_custo`)
Agrupamentos customizados de despesas/receitas.

```typescript
interface CentroCusto {
  id: string;
  nome: string;                  // Ex: "Projeto X", "Viagem Europa"
  descricao?: string;
  cor?: string;
  icone?: string;
  ativo: boolean;

  // Multi-usuário
  usuario_id: string;            // FK -> usuarios

  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, nome, ativo, usuario_id`

---

#### **14. Orçamentos** (`orcamentos`)
Planejamento de gastos por categoria ou centro de custo.

```typescript
interface Orcamento {
  id: string;

  nome: string;
  tipo: 'categoria' | 'centro_custo';

  categoria_id?: string;         // FK -> categorias
  centro_custo_id?: string;      // FK -> centros_custo

  // Período
  mes_referencia: string;        // 'YYYY-MM'

  // Valores
  valor_planejado: number;
  valor_realizado: number;       // Auto-calculado

  // Alertas
  alerta_80: boolean;            // Alertar ao atingir 80%
  alerta_100: boolean;           // Alertar ao atingir 100%
  alerta_80_enviado: boolean;
  alerta_100_enviado: boolean;

  // Multi-usuário
  usuario_id: string;            // FK -> usuarios

  created_at: Date;
  updated_at: Date;
}
```

**Índices**: `id, nome, tipo, categoria_id, centro_custo_id, mes_referencia, usuario_id`

---

#### **15. Investimentos** (`investimentos`)
Controle de investimentos financeiros.

```typescript
interface Investimento {
  id: string;
  instituicao_id: string;        // FK -> instituicoes

  nome: string;
  tipo: TipoInvestimento;        // Ver enum abaixo
  ticker?: string;               // Ex: "PETR4", "HASH11"

  // Valores
  valor_aplicado: number;
  valor_atual: number;
  quantidade?: number;           // Ações, cotas, etc.

  // Datas
  data_aplicacao: Date;
  data_vencimento?: Date;

  // Rendimento
  taxa_juros?: number;           // % ao ano
  rentabilidade_contratada?: string; // Ex: "CDI + 2%"
  indexador?: string;            // Ex: "CDI", "IPCA"

  status: 'ativo' | 'resgatado' | 'vencido';

  conta_origem_id?: string;      // FK -> contas
  observacoes?: string;
  cor?: string;

  // Multi-usuário
  usuario_id: string;            // FK -> usuarios

  created_at: Date;
  updated_at: Date;
}

type TipoInvestimento =
  | 'renda_fixa'      // CDB, LCI, LCA, Tesouro
  | 'acoes'           // Ações
  | 'fundos'          // Fundos de Investimento
  | 'etf'             // ETFs
  | 'previdencia'     // PGBL, VGBL
  | 'cripto'          // Criptomoedas
  | 'outro';
```

**Índices**: `id, instituicao_id, nome, tipo, ticker, status, data_aplicacao, conta_origem_id, usuario_id`

---

#### **16. Histórico de Investimentos** (`historico_investimentos`)
Movimentações em investimentos.

```typescript
interface HistoricoInvestimento {
  id: string;
  investimento_id: string;       // FK -> investimentos

  data: Date;
  valor: number;
  quantidade?: number;

  tipo_movimentacao: 'aporte' | 'resgate' | 'rendimento' | 'ajuste';

  observacoes?: string;
  created_at: Date;
}
```

**Índices**: `id, investimento_id, data, tipo_movimentacao`

---

#### **17-23. Tabelas de Imposto de Renda**

Essas tabelas armazenam dados para declaração do IR:

- `declaracoes_ir`: Declarações anuais
- `rendimentos_tributaveis`: Salários, aluguéis, etc.
- `rendimentos_isentos`: Poupança, PLR, etc.
- `despesas_dedutiveis`: Educação, saúde, previdência
- `bens_direitos`: Imóveis, veículos, investimentos
- `dividas_onus`: Empréstimos, financiamentos
- `cenarios`: Simulações de planejamento
- `configuracoes_comportamento`: Regras de comportamento
- `objetivos_financeiros`: Metas financeiras

*(Schema detalhado disponível em `lib/types/index.ts`)*

---

## 🔗 Relacionamentos entre Tabelas

### **Diagrama de Entidade-Relacionamento (ER)**

```
usuarios (1) ────── (N) contas
                    (N) transacoes
                    (N) categorias
                    (N) tags
                    (N) orcamentos
                    (N) cartoes_config
                    (N) investimentos
                    (N) centros_custo
                    (N) regras_classificacao
                    (N) templates_importacao

instituicoes (1) ── (N) contas
                    (N) cartoes_config
                    (N) investimentos

contas (1) ───────── (N) transacoes
       (1) ───────── (N) contas (hierarquia)

categorias (1) ───── (N) transacoes
           (1) ───── (N) orcamentos
           (1) ───── (N) regras_classificacao
           (1) ───── (N) categorias (hierarquia)

cartoes_config (1) ─ (N) faturas
               (1) ─ (1) contas (conta_pagamento)

faturas (1) ──────── (N) faturas_lancamentos
        (1) ──────── (1) transacoes (pagamento)

investimentos (1) ── (N) historico_investimentos
              (1) ── (1) contas (conta_origem)

centros_custo (1) ── (N) transacoes
              (1) ── (N) orcamentos
```

### **Principais Relacionamentos**

#### **1. Usuário → Dados**
Todos os dados pertencem a um usuário:
```typescript
usuario_id: string // FK em 10+ tabelas
```

#### **2. Instituição → Contas**
Cada conta pertence a uma instituição:
```typescript
conta.instituicao_id → instituicoes.id
```

#### **3. Conta → Transações**
Cada transação afeta uma conta:
```typescript
transacao.conta_id → contas.id
```

#### **4. Categoria → Transações**
Cada transação pode ter uma categoria:
```typescript
transacao.categoria_id → categorias.id
```

#### **5. Transferências** (Duas Transações Vinculadas)
```typescript
// Vinculadas pelo mesmo transferencia_id
transacao1.transferencia_id === transacao2.transferencia_id
```

#### **6. Hierarquia de Categorias**
```typescript
categoria.pai_id → categorias.id
```

#### **7. Hierarquia de Contas**
```typescript
conta.conta_pai_id → contas.id
```

---

## 👥 Sistema Multi-Usuário

### **Implementação (v10)**

**Conceito**: Isolamento completo de dados por usuário.

#### **1. Estrutura**

Todas as tabelas principais têm:
```typescript
usuario_id: string // FK -> usuarios.id
```

#### **2. Criação de Dados**

```typescript
// lib/services/*.service.ts
import { getCurrentUserId } from '../db/seed-usuarios';

async createTransacao(data: CreateTransacaoDTO) {
  const currentUserId = getCurrentUserId();

  const transacao: Transacao = {
    id: crypto.randomUUID(),
    // ... outros campos
    usuario_id: currentUserId, // ✅ Associa ao usuário atual
  };
}
```

#### **3. Leitura de Dados**

```typescript
async listTransacoes() {
  const currentUserId = getCurrentUserId();
  let transacoes = await db.transacoes.toArray();

  // Filtra apenas dados do usuário atual
  transacoes = transacoes.filter(t => t.usuario_id === currentUserId);

  return transacoes;
}
```

#### **4. Dados do Sistema**

Algumas entidades são compartilhadas entre usuários:

```typescript
// Categorias e Tags padrão
is_sistema: true  // Visível para todos os usuários
```

**Exemplo**:
```typescript
{
  id: 'cat-alimentacao',
  nome: 'Alimentação',
  is_sistema: true,    // ✅ Visível para todos
  usuario_id: null,    // Não pertence a ninguém específico
}
```

#### **5. Migração Multi-Usuário (v10)**

```typescript
// lib/db/client.ts - Migration v10
this.version(10)
  .upgrade(async (tx) => {
    // Cria usuário "Produção" padrão
    const usuarioProd = {
      id: 'usuario-producao',
      nome: '📊 Produção',
      email: 'producao@cortexcash.local',
      role: 'admin',
    };

    await tx.table('usuarios').add(usuarioProd);

    // Associa todos os dados existentes ao usuário Produção
    const tables = [
      'contas', 'categorias', 'tags', 'transacoes',
      'orcamentos', 'investimentos', 'cartoes_config'
    ];

    for (const tableName of tables) {
      await tx.table(tableName).toCollection().modify(record => {
        if (!record.usuario_id) {
          record.usuario_id = 'usuario-producao';
        }
      });
    }
  });
```

---

## 🔄 Migrações e Versionamento

### **Histórico de Versões**

| Versão | Mudanças | Data |
|--------|----------|------|
| **v1** | Schema inicial (12 tabelas) | 2024-10 |
| **v2** | Adiciona subcategorias (`pai_id`) e `tags` | 2024-11 |
| **v3** | Adiciona tabelas de Imposto de Renda | 2024-11 |
| **v4** | Adiciona Planejamento Financeiro | 2024-11 |
| **v5** | Hash UNIQUE para dedupe de transações | 2024-11 |
| **v6** | Adiciona `is_favorite` em templates | 2024-11 |
| **v7** | Adiciona hierarquia de contas (`conta_pai_id`) | 2024-11 |
| **v8** | Adiciona tabela `usuarios` | 2024-11 |
| **v9** | Muda saldo: `saldo_inicial` → `saldo_referencia` | 2024-11 |
| **v10** | Sistema multi-usuário completo | 2024-11 |
| **v11** | Adiciona `senha_hash` para autenticação | 2024-11 |
| **v12** | Expande campos de perfil do usuário | 2025-11 |

### **Como Funciona**

```typescript
// lib/db/client.ts
this.version(12)
  .stores({
    // Define índices (não todos os campos)
    usuarios: 'id, email, role, ativo',
  })
  .upgrade(async (tx) => {
    // Migração de dados
    await tx.table('usuarios').toCollection().modify(usuario => {
      // Adiciona novos campos
      if (!('telefone' in usuario)) usuario.telefone = undefined;
    });
  });
```

**Importante**: Dexie aplica migrações automaticamente ao detectar nova versão.

---

## 🔄 Fluxos de Dados

### **1. Criar Transação Manual**

```
User Input
    ↓
[TransactionForm]
    ↓
transacaoService.createTransacao()
    ↓
1. Valida com Zod (dtos.ts)
2. Gera hash para dedupe
3. Verifica duplicidade
4. Cria transação com usuario_id atual
    ↓
db.transacoes.add()
    ↓
contaService.recalcularESalvarSaldo()
    ↓
orcamentoService.recalcularOrcamentos()
    ↓
✅ Transação criada
```

### **2. Importar Arquivo Bancário**

```
User Upload (CSV/OFX)
    ↓
[ImportPage]
    ↓
1. Seleciona template ou cria novo
2. Parse do arquivo
    ↓
importService.parseFile()
    ↓
3. Mapeamento de colunas
4. Normalização de dados
    ↓
5. Para cada linha:
   - Gera hash
   - Verifica duplicidade
   - Aplica regras de classificação
   - Sugere categoria (IA opcional)
    ↓
6. Preview de importação
    ↓
User confirma
    ↓
7. Bulk insert (otimizado)
    ↓
db.transacoes.bulkAdd()
    ↓
8. Recalcula saldos
    ↓
✅ Importação concluída
```

### **3. Criar Transferência**

```
User Input (Conta A → Conta B, R$ 1000)
    ↓
transacaoService.createTransfer()
    ↓
1. Cria 2 transações vinculadas:

   Transacao 1 (origem):
   {
     conta_id: 'A',
     conta_destino_id: 'B',
     valor: -1000,
     tipo: 'transferencia',
     transferencia_id: 'uuid',
   }

   Transacao 2 (destino):
   {
     conta_id: 'B',
     valor: 1000,
     tipo: 'transferencia',
     transferencia_id: 'uuid', // MESMO
   }
    ↓
db.transaction('rw', [transacoes], async () => {
  await db.transacoes.add(origem);
  await db.transacoes.add(destino);
})
    ↓
contaService.recalcularESalvarSaldo('A')
contaService.recalcularESalvarSaldo('B')
    ↓
✅ Transferência criada
```

### **4. Classificação Automática por Regra**

```
Nova transação: "IFOOD *RESTAURANTE"
    ↓
regraService.aplicarRegras(transacao)
    ↓
1. Busca todas as regras ativas
2. Ordena por prioridade (maior primeiro)
3. Para cada regra:
   - Testa pattern (contains/starts_with/regex)
   - Se match: aplica categoria
    ↓
Regra encontrada: "iFood" → Categoria "Delivery"
    ↓
transacaoService.updateTransacao(id, {
  categoria_id: 'delivery',
  classificacao_origem: 'regra',
  classificacao_confirmada: false, // Aguarda confirmação
})
    ↓
regraService.incrementarEstatisticas(regra_id)
    ↓
✅ Transação classificada
```

### **5. Calcular Saldo de Conta**

**Filosofia**: User é Soberano

```
contaService.calcularSaldoEmData(contaId, dataAlvo)
    ↓
1. Busca conta
2. Obtém saldo_referencia e data_referencia

Exemplo:
  saldo_referencia: R$ 1000
  data_referencia: 2025-01-01
  dataAlvo: 2025-01-15
    ↓
3. Busca transações entre data_referencia e dataAlvo
    ↓
SELECT * FROM transacoes
WHERE conta_id = 'X'
AND data BETWEEN '2025-01-01' AND '2025-01-15'
    ↓
4. Soma/subtrai valores:

   saldo_final = saldo_referencia + Σ(transacoes.valor)

Exemplo:
   1000 + 500 (receita) - 200 (despesa) = 1300
    ↓
✅ Saldo calculado: R$ 1300
```

### **6. Pagar Fatura de Cartão**

```
User Input: Pagar R$ 2500 da fatura 2025-11
    ↓
cartaoService.pagarFatura({
  fatura_id,
  valor_pago: 2500,
  data_pagamento: Date,
  conta_pagamento_id: 'conta-x',
})
    ↓
1. Valida fatura e conta
2. Cria transação de despesa na conta:

   {
     conta_id: 'conta-x',
     valor: -2500,
     descricao: "Pagamento Fatura - 2025-11",
     tipo: 'despesa',
   }
    ↓
db.transacoes.add()
    ↓
3. Atualiza fatura:

   {
     valor_pago: 2500,
     data_pagamento: Date,
     transacao_pagamento_id: 'trans-id',
     status: 'paga', // Se valor_pago >= valor_total
   }
    ↓
db.faturas.update()
    ↓
4. Recalcula saldo da conta
    ↓
✅ Fatura paga
```

---

## ⚡ Índices e Performance

### **Estratégia de Indexação**

Dexie usa índices para otimizar queries:

```typescript
// lib/db/client.ts
this.version(1).stores({
  // Sintaxe: 'campo1, campo2, &campoUnique, [campo+composto]'
  transacoes: 'id, conta_id, categoria_id, data, tipo, &hash',
  //          ^pk  ^indice    ^indice       ^indice ^tipo ^UNIQUE
});
```

### **Índices por Tabela**

#### **transacoes**
```typescript
'id, conta_id, categoria_id, centro_custo_id, data, tipo, &hash, transferencia_id, conta_destino_id, grupo_parcelamento_id, usuario_id'
```

**Queries Otimizadas**:
- ✅ Buscar por conta: `where('conta_id').equals(id)`
- ✅ Buscar por data: `where('data').between(start, end)`
- ✅ Buscar por tipo: `where('tipo').equals('despesa')`
- ✅ Buscar por hash: `where('hash').equals(hash)` (dedupe)
- ✅ Buscar por usuário: `where('usuario_id').equals(id)`

#### **contas**
```typescript
'id, instituicao_id, nome, tipo, ativa, conta_pai_id, usuario_id'
```

#### **categorias**
```typescript
'id, nome, tipo, grupo, pai_id, ativa, ordem, usuario_id, is_sistema'
```

### **Performance Tips**

1. **Use índices em queries**:
```typescript
// ❌ Lento (full scan)
const contas = (await db.contas.toArray()).filter(c => c.tipo === 'corrente');

// ✅ Rápido (usa índice)
const contas = await db.contas.where('tipo').equals('corrente').toArray();
```

2. **Evite carregar tudo**:
```typescript
// ❌ Carrega tudo na memória
const todas = await db.transacoes.toArray();
const recentes = todas.slice(0, 50);

// ✅ Carrega apenas necessário
const recentes = await db.transacoes
  .orderBy('data')
  .reverse()
  .limit(50)
  .toArray();
```

3. **Use paginação**:
```typescript
const PAGE_SIZE = 50;
const page = 2;

const transacoes = await db.transacoes
  .orderBy('data')
  .reverse()
  .offset((page - 1) * PAGE_SIZE)
  .limit(PAGE_SIZE)
  .toArray();
```

4. **Batch operations**:
```typescript
// ❌ Lento (50 operações separadas)
for (const t of transacoes) {
  await db.transacoes.add(t);
}

// ✅ Rápido (1 operação batch)
await db.transacoes.bulkAdd(transacoes);
```

---

## 🔒 Segurança e Isolamento

### **1. Isolamento por Usuário**

```typescript
// Todos os services filtram por usuario_id
async listTransacoes() {
  const currentUserId = getCurrentUserId();
  let transacoes = await db.transacoes.toArray();

  // ✅ Usuário só vê seus próprios dados
  transacoes = transacoes.filter(t => t.usuario_id === currentUserId);

  return transacoes;
}
```

**Garantias**:
- ✅ Usuário A nunca vê dados do Usuário B
- ✅ Filtro aplicado em TODOS os services
- ✅ Dados criados sempre com `usuario_id` do criador

### **2. Validação de Dados**

Todos os inputs são validados com **Zod**:

```typescript
// lib/validations/dtos.ts
export const createTransacaoSchema = z.object({
  conta_id: z.string().uuid(),
  categoria_id: z.string().uuid().optional(),
  data: z.date(),
  descricao: z.string().min(1).max(200),
  valor: z.number().finite(),
  tipo: z.enum(['receita', 'despesa', 'transferencia']),
  // ...
});

// Em service
validateDTO(createTransacaoSchema, data); // Lança erro se inválido
```

### **3. Senhas**

```typescript
// Senhas NUNCA são armazenadas em texto puro
{
  senha_hash: '$2a$10$...', // bcrypt hash
}
```

### **4. Dados do Sistema**

```typescript
// Categorias e tags padrão são protegidas
{
  is_sistema: true, // Não pode ser deletada pelo usuário
}
```

### **5. IndexedDB - Considerações**

**Segurança**:
- ✅ **Origin-based**: Cada domínio tem seu próprio banco
- ✅ **Same-Origin Policy**: Scripts de outros domínios não acessam
- ⚠️ **Não criptografado por padrão**: Dados visíveis no DevTools
- ⚠️ **Acesso local**: Malware no dispositivo pode acessar

**Mitigações Futuras** (v1.0+):
- Criptografia de dados sensíveis (em planejamento)
- Autenticação com token JWT
- Rate limiting em operações

---

## 💾 Backup e Recuperação

### **Exportar Banco de Dados**

```typescript
// lib/db/client.ts
export async function exportDatabase(): Promise<Blob> {
  const db = getDB();

  const data = {
    instituicoes: await db.instituicoes.toArray(),
    contas: await db.contas.toArray(),
    categorias: await db.categorias.toArray(),
    transacoes: await db.transacoes.toArray(),
    // ... todas as tabelas
  };

  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}
```

**Uso**:
```typescript
const backup = await exportDatabase();
const url = URL.createObjectURL(backup);
const link = document.createElement('a');
link.href = url;
link.download = `cortex-cash-backup-${Date.now()}.json`;
link.click();
```

### **Importar Banco de Dados**

```typescript
export async function importDatabase(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);

  const db = getDB();

  // Limpa banco atual
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });

  // Importa dados do backup
  await db.transaction('rw', db.tables, async () => {
    if (data.instituicoes) await db.instituicoes.bulkPut(data.instituicoes);
    if (data.contas) await db.contas.bulkPut(data.contas);
    if (data.transacoes) await db.transacoes.bulkPut(data.transacoes);
    // ... outras tabelas
  });
}
```

### **Limpar Banco de Dados**

```typescript
export async function clearDatabase(): Promise<void> {
  const db = getDB();

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}
```

**⚠️ CUIDADO**: Esta operação é **IRREVERSÍVEL**!

---

## 📈 Estatísticas do Banco

### **Capacidade Atual**

Com dados de exemplo (seed completo):
- **Instituições**: 15
- **Categorias**: 39 (sistema) + N (usuário)
- **Contas**: Ilimitadas
- **Transações**: Ilimitadas (milhões suportados)
- **Templates**: 7 pré-configurados

### **Limites Técnicos**

**IndexedDB**:
- **Tamanho padrão**: ~50MB
- **Tamanho máximo**: Vários GB (depende do navegador)
- **Transações**: Milhões suportados
- **Performance**: ~1000 transações/segundo

**Navegadores**:
| Navegador | Limite Padrão | Limite Máximo |
|-----------|---------------|---------------|
| Chrome    | 50MB          | ~60% disco    |
| Firefox   | 50MB          | ~50% disco    |
| Safari    | 50MB          | ~1GB          |
| Edge      | 50MB          | ~60% disco    |

---

## 🔮 Roadmap Futuro

### **v13** (Planejado)
- Soft delete (em vez de delete permanente)
- Auditoria de mudanças (changelog)

### **v14** (Planejado)
- Sincronização multi-dispositivo
- Backend opcional (Supabase)

### **v15** (Planejado)
- Criptografia end-to-end
- Backup automático em nuvem

---

## 📚 Referências

- [Dexie.js Documentation](https://dexie.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Storage Limits](https://web.dev/storage-for-the-web/)

---

**Documento mantido por**: Agent CORE
**Última revisão**: 2025-11-09
