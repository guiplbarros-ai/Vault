# GitHub Actions Workflows

Este diretório contém os workflows de CI/CD do Cortex Cash.

## 📋 Workflows Disponíveis

### 1. Test Suite (`test.yml`)
**Trigger:** Push para `main` ou `develop` | Pull Requests

Executa:
- ✅ Type check (TypeScript)
- ✅ Linter (ESLint)
- ✅ Suite de testes completa (475 testes)
- ✅ Coverage report
- ✅ Build do projeto
- ✅ Upload para Codecov (opcional)

**Duração:** ~3-5 minutos

---

### 2. PR Checks (`pr-check.yml`)
**Trigger:** Pull Requests (opened, synchronize, reopened)

Executa:
- ✅ Type check
- ✅ Testes
- ✅ Build
- ✅ Comentário automático no PR com resultados

**Duração:** ~3-4 minutos

---

### 3. Daily Tests (`daily-tests.yml`)
**Trigger:** Agendado (diariamente às 9h UTC) | Manual

Executa:
- ✅ Suite completa com coverage
- ✅ Validação de resultados
- ✅ Upload de coverage artifacts
- ✅ Notificação automática em caso de falha

**Duração:** ~4-6 minutos

---

## 🚀 Como Usar

### Executar Manualmente

Você pode executar qualquer workflow manualmente:

1. Vá para **Actions** no GitHub
2. Selecione o workflow desejado
3. Clique em **Run workflow**

### Status Badges

Adicione ao README.md:

```markdown
![Test Suite](https://github.com/seu-usuario/cortex-cash/workflows/Test%20Suite/badge.svg)
![PR Checks](https://github.com/seu-usuario/cortex-cash/workflows/PR%20Checks/badge.svg)
```

---

## 📊 Coverage Reports

Os relatórios de cobertura são:
- Gerados a cada push
- Enviados para Codecov (se configurado)
- Armazenados como artifacts (30 dias)

Para acessar:
1. Vá para **Actions**
2. Selecione uma execução do workflow
3. Baixe o artifact `coverage-report`

---

## 🔧 Configuração Local

Para executar os mesmos checks localmente:

```bash
# Type check
npm run type-check

# Linter
npm run lint

# Testes
npm test

# Coverage
npm run test:coverage

# Build
npm run build
```

---

## 🛠️ Troubleshooting

### Falha no Type Check
```bash
npm run type-check
# Verifique os erros de TypeScript
```

### Falha nos Testes
```bash
npm test
# Rode localmente para debug
```

### Falha no Build
```bash
npm run build
# Verifique as variáveis de ambiente
```

---

## 📝 Manutenção

### Atualizar Dependências do Workflow

1. Verifique versões em: https://github.com/actions
2. Atualize em todos os workflows
3. Teste localmente antes de commitar

### Adicionar Novo Workflow

1. Crie arquivo em `.github/workflows/`
2. Use nome descritivo (kebab-case)
3. Documente neste README
4. Teste com `workflow_dispatch`

---

**Última atualização:** 08 de Novembro de 2025
**Versão:** v0.5
