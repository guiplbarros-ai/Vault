# MASTER - Budget Cortihouse

**Este é o documento principal de referência para implementação autônoma.**

---

## ÍNDICE DE DOCUMENTAÇÃO

| Documento | Conteúdo | Prioridade |
|-----------|----------|------------|
| [TECH_DECISIONS.md](./TECH_DECISIONS.md) | Stack, dependências, configurações | 🔴 Crítico |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | Passo-a-passo de desenvolvimento | 🔴 Crítico |
| [SUPABASE_CONFIG.md](./SUPABASE_CONFIG.md) | Credenciais e configuração | 🔴 Crítico |
| [PRD.md](./PRD.md) | Requisitos do produto | 🟡 Importante |
| [USER_FLOWS.md](./USER_FLOWS.md) | Fluxos e wireframes | 🟡 Importante |
| [CALCULATIONS.md](./CALCULATIONS.md) | Fórmulas de cálculo | 🟡 Importante |
| [HOSPITAL_RULES.md](./HOSPITAL_RULES.md) | Regras hospitalares | 🟡 Importante |
| [INTERVIEW_SCRIPT.md](./INTERVIEW_SCRIPT.md) | Coleta de preços | 🟢 Referência |

---

## RESUMO EXECUTIVO

### O que é
Sistema web de orçamentação para a Cortihouse Cortinas.

### Para quem
Vanda Barros (gestora, não-técnica) e funcionários.

### Problema resolvido
Orçamentos manuais demorados → Sistema automatizado em minutos.

### Stack
- **Frontend:** Next.js 14 + Tailwind + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth)
- **ORM:** Drizzle
- **Deploy:** Fly.io

---

## CREDENCIAIS (Supabase)

Chaves no `.env.local` (NUNCA commitar). Copie do [Dashboard Supabase](https://supabase.com/dashboard/project/yxiitvlzelzzqkbeyvuk/settings/api).
Ver detalhes em [SUPABASE_CONFIG.md](./SUPABASE_CONFIG.md).

---

## DADOS DA EMPRESA

```
Cortihouse Cortinas de Palco, Decorações & Confecções Ltda
CNPJ: 41.697.350/0001-36
IE: 186.78326000-90
Endereço: Rua Diamantina, 26, Santa Edwiges, Contagem/MG, 32040-260
Tel: 31 3351-7467
Cel: 31 9 9973-2346 / 31 9 9286-4848
Site: www.cortihouse.com.br
Responsável: Vanda Barros
```

---

## REGRAS DE NEGÓCIO CONFIRMADAS

### Cortinas Hospitalares
- Fator de franzido: **1.65**
- Vinil: 2.00m altura (fixo)
- Tela Colméia: 0.60m (pé direito ≤2.60m) ou 0.90m
- Rebaixamento: se pé direito > 3.10m
- Curva no trilho: R$ 30,00
- Taxa de retorno: R$ 100,00

### Condições Comerciais
- Desconto à vista: 3%
- Validade: 15 dias
- Prazo entrega: 15 dias úteis
- Pagamento: 40%+60% PIX ou 30%+70% 2x cartão

---

## FUNCIONALIDADES MVP

1. ✅ Login/Autenticação
2. ✅ Dashboard
3. ✅ CRUD Clientes (páginas criadas)
4. ✅ CRUD Produtos (páginas criadas)
5. ✅ Criar Orçamento (wizard 4 etapas)
6. ✅ Cálculo Automático Hospitalar (com placeholders)
7. ⏳ Gerar PDF (estrutura pronta)
8. ✅ Compartilhar WhatsApp
9. ✅ Listar/Buscar Orçamentos
10. ✅ Configurações da Empresa

---

## PENDÊNCIAS PARA PRODUÇÃO

### 🔴 Críticas (bloqueiam funcionalidade completa)

| Item | Status | Ação |
|------|--------|------|
| Preços hospitalares | ⏳ Pendente | Entrevistar Vanda |
| Fatores franzido residencial | ⏳ Pendente | Entrevistar Vanda |
| Markup fornecedores | ⏳ Pendente | Entrevistar Vanda |
| Logo da empresa | ⏳ Pendente | Solicitar arquivo |

### 🟡 Importantes (refinam experiência)

| Item | Status |
|------|--------|
| Preços tecidos residenciais | ⏳ Pendente |
| Valores de frete | ⏳ Pendente |
| Lista de cores disponíveis | ⏳ Pendente |

---

## ORDEM DE IMPLEMENTAÇÃO

```
1. Setup do Projeto
   └── pnpm create next-app + dependências + shadcn

2. Database
   └── Drizzle schema + migrations + seed

3. Autenticação
   └── Supabase Auth + middleware + páginas

4. Layout
   └── Sidebar + Header + navegação

5. Clientes
   └── API + listagem + formulário

6. Produtos
   └── API + categorias + cadastro

7. Calculadora
   └── Serviço de cálculo + constantes (com placeholders)

8. Orçamentos
   └── Wizard 4 etapas + listagem + detalhes

9. PDF
   └── Template + geração + download

10. Compartilhamento
    └── WhatsApp + impressão

11. Configurações
    └── Dados empresa + logo

12. Deploy
    └── Fly.io + variáveis + domínio
```

---

## COMANDOS RÁPIDOS

```bash
# Setup
cd "/Users/guilhermebarros/Documents/Coding/pessoal/Budget Cortihouse"
pnpm create next-app@latest app --typescript --tailwind --eslint --app --src-dir

# Desenvolvimento
cd app && pnpm dev

# Database
pnpm drizzle-kit generate:pg
pnpm drizzle-kit push:pg

# Deploy
fly deploy
```

---

## LINKS ÚTEIS

- **Supabase Dashboard:** https://supabase.com/dashboard/project/yxiitvlzelzzqkbeyvuk
- **Fly.io Dashboard:** https://fly.io/dashboard
- **shadcn/ui:** https://ui.shadcn.com
- **Drizzle Docs:** https://orm.drizzle.team

---

## NOTAS PARA IMPLEMENTAÇÃO

1. **Usuária não-técnica** → UI simples, fontes grandes, fluxo guiado
2. **Placeholders OK** → Preços podem ser 0 inicialmente, sistema funciona
3. **PDF é prioridade** → É o entregável principal para o cliente
4. **WhatsApp crítico** → Principal forma de envio de orçamentos
5. **Offline não necessário** → Sempre terá internet

---

*Documento MASTER v1.0 - Referência principal para implementação*
