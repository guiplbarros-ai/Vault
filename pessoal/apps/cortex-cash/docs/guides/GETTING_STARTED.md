# Getting Started - Cortex Cash
**Guia Rápido de Setup | v0.4**

## 🚀 Setup Inicial (5 minutos)

### 1. Pré-requisitos

- **Node.js** 20+ (recomendado: 20.11.0)
- **npm** 10+ ou **pnpm** 8+
- **Git** 2.40+

Verificar versões:
```bash
node --version  # v20.11.0
npm --version   # 10.2.4
```

---

### 2. Clone e Instale

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/cortex-cash.git
cd cortex-cash

# Instale dependências
npm install
```

---

### 3. Configuração (Opcional)

#### IA (OpenAI) - Opcional

Se quiser usar classificação automática com IA:

```bash
# Opção 1: Script interativo
npm run ai:setup

# Opção 2: Manual
echo "OPENAI_API_KEY=sk-..." > .env.local
```

**Obter API Key:** https://platform.openai.com/api-keys

**⚠️ Sem API Key:**
- Classificação manual funciona normalmente
- Regras de classificação funcionam normalmente
- Apenas classificação com IA não estará disponível

---

### 4. Inicie o Servidor

```bash
npm run dev
```

Abra: **http://localhost:3000**

---

## 🎯 Primeiro Uso

### 1. Explore o Dashboard

Ao acessar `localhost:3000`, você verá:
- **Saldo total** (zerado inicialmente)
- **Gráfico de fluxo** (vazio)
- **Transações recentes** (vazia)

### 2. Crie uma Conta

1. Vá em **Contas** (sidebar)
2. Clique em **"Nova Conta"**
3. Preencha:
   - Nome: "Banco Inter"
   - Tipo: "Conta Corrente"
   - Saldo inicial: R$ 5.000,00
4. Salvar

### 3. Adicione Transações

**Opção A: Manual**
1. Vá em **Transações**
2. Clique em **"Nova Transação"**
3. Preencha e salve

**Opção B: Importar Extrato**
1. Vá em **Importar**
2. Arraste arquivo CSV ou OFX
3. Mapeie colunas (se CSV)
4. Confirme importação

### 4. Configure Categorias

1. Vá em **Categorias**
2. Veja 39 categorias padrão (pré-carregadas)
3. Crie novas se necessário

---

## 🤖 Setup de IA (Opcional)

### Passo a Passo

1. **Obter API Key**
   - Acesse: https://platform.openai.com/api-keys
   - Clique "Create new secret key"
   - Copie a chave (começa com `sk-`)

2. **Configurar**
   ```bash
   echo "OPENAI_API_KEY=sk-..." >> .env.local
   ```

3. **Reiniciar servidor**
   ```bash
   # Ctrl+C para parar
   npm run dev
   ```

4. **Testar**
   ```bash
   npm run ai:test
   ```
   
   Deve exibir:
   ```
   ✅ API Key configurada
   ✅ Conexão com OpenAI OK
   ✅ Sistema de IA pronto!
   ```

5. **Configurar Limites** (recomendado)
   - Ir em **Configurações** → **IA e Custos**
   - Definir limite mensal: $10 USD (padrão)
   - Escolher modelo: gpt-4o-mini (padrão)

### Usar Classificação Automática

1. Vá em **Transações**
2. Clique no ícone **🧠** em uma transação
3. Aguarde classificação (1-2s)
4. Confirme ou rejeite sugestão

**Economia com Cache:**
- Primeira classificação: ~$0.0001 USD
- Classificações similares: R$ 0,00 (cache)
- 70%+ das transações virão do cache após alguns usos

---

## 📦 Seed Data (Opcional)

Quer testar com dados de exemplo?

```bash
npm run db:seed
```

Isso criará:
- 3 contas (Inter, Nubank, Itaú)
- 50 transações variadas
- 39 categorias padrão
- 5 regras de classificação

**⚠️ Apenas para desenvolvimento!** Não use em produção.

---

## 🗂️ Estrutura do Projeto

```
cortex-cash/
├── app/                    # Next.js App Router (páginas)
│   ├── page.tsx           # Dashboard Home
│   ├── transactions/      # Página de transações
│   ├── accounts/          # Página de contas
│   ├── categories/        # Página de categorias
│   ├── settings/          # Configurações
│   └── api/               # API routes (IA, export)
│
├── components/            # Componentes React
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Formulários
│   ├── dashboard-layout.tsx
│   └── ...
│
├── lib/                   # Lógica de negócio
│   ├── db/               # Database (Dexie/IndexedDB)
│   ├── services/         # Services layer
│   ├── utils/            # Utilitários
│   ├── validations/      # Zod schemas
│   └── types/            # TypeScript types
│
├── docs/                  # Documentação
│   ├── guides/           # Guias (este arquivo)
│   ├── ai/               # Documentação de IA
│   ├── features/         # Docs de features
│   └── architecture/     # Arquitetura técnica
│
└── public/               # Assets estáticos
```

---

## 🔧 Scripts Úteis

```bash
# Desenvolvimento
npm run dev              # Inicia dev server
npm run dev:check        # Dev server + type check contínuo

# Build
npm run build            # Build de produção
npm run start            # Roda build de produção

# Qualidade
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run test             # Testes (quando houver)

# Database
npm run db:seed          # Popula banco com dados de exemplo
npm run db:reset         # Limpa todo o banco (cuidado!)

# IA
npm run ai:setup         # Setup interativo da OpenAI
npm run ai:test          # Testa conexão com OpenAI
```

---

## ❓ Troubleshooting

### Erro: "Module not found"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Port 3000 already in use"

```bash
# Encontrar processo usando porta 3000
lsof -ti :3000 | xargs kill

# Ou use outra porta
PORT=3001 npm run dev
```

### Build falha com erro TypeScript

```bash
npm run type-check
# Ver erros e corrigir
```

### IndexedDB não funciona no Safari

- Safari requer HTTPS ou localhost
- Modo privado desabilita IndexedDB
- Use Chrome/Firefox para desenvolvimento

### Classificação com IA não funciona

1. Verificar `.env.local` tem `OPENAI_API_KEY`
2. Reiniciar servidor
3. Testar com `npm run ai:test`
4. Ver erros no console do browser (F12)

---

## 📚 Próximos Passos

Agora que está tudo funcionando:

1. **Leia a Arquitetura**
   - [Arquitetura de Agentes](./AGENTES_IA.md)
   - [Data Model](../architecture/DATA_MODEL.md)

2. **Explore Features**
   - [Sistema de IA](../ai/AI_GUIDE.md)
   - [Importação](../features/IMPORT.md)
   - [Patrimônio](../features/PATRIMONIO.md)

3. **Contribua**
   - [Development Guide](./DEVELOPMENT.md)
   - [Roadmap](../ROADMAP_SUMMARY.md)

---

## 🆘 Ajuda

**Problemas?**
- Abra uma issue: https://github.com/seu-usuario/cortex-cash/issues
- Consulte docs completas: `docs/`

**Quer contribuir?**
- Leia [DEVELOPMENT.md](./DEVELOPMENT.md)
- Veja issues marcadas como "good first issue"

---

**Última atualização:** 05 de Novembro de 2025
**Versão:** v0.4
