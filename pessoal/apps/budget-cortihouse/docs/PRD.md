# PRD - Budget Cortihouse

## 1. VISÃO GERAL

### Problema
A gestora da Cortihouse perde muito tempo montando orçamentos manualmente, com métodos mistos (papel, calculadora, planilhas), resultando em processo lento e propenso a erros.

### Solução
Sistema web de orçamentação que automatiza cálculos e gera PDFs profissionais em minutos.

### Usuários
- **Principal:** Vanda Barros (gestora, perfil não-técnico)
- **Secundários:** Funcionários da empresa

### Métricas de Sucesso
- Tempo para criar orçamento: < 5 minutos (vs 20+ atual)
- Taxa de erros de cálculo: < 1%
- Adoção: 100% dos orçamentos pelo sistema em 30 dias

---

## 2. FUNCIONALIDADES

### MVP (Versão 1.0)

| ID | Feature | Prioridade | Descrição |
|----|---------|------------|-----------|
| F01 | Login | Alta | Autenticação com email/senha |
| F02 | Dashboard | Alta | Tela inicial com orçamentos recentes |
| F03 | CRUD Clientes | Alta | Cadastrar, listar, editar clientes |
| F04 | CRUD Produtos | Alta | Cadastrar materiais com preços |
| F05 | Criar Orçamento | Alta | Wizard de 4 etapas |
| F06 | Cálculo Automático | Alta | Motor de cálculo por tipo |
| F07 | Gerar PDF | Alta | PDF profissional com logo |
| F08 | Enviar WhatsApp | Alta | Compartilhar via WhatsApp |
| F09 | Listar Orçamentos | Alta | Busca e filtros |
| F10 | Configurações | Média | Dados da empresa, logo |

### Versão 2.0

| ID | Feature | Descrição |
|----|---------|-----------|
| F11 | Duplicar Orçamento | Criar cópia de orçamento existente |
| F12 | Status do Orçamento | Workflow: Pendente → Aprovado → Produção → Finalizado |
| F13 | Múltiplos Usuários | Gerenciar funcionários com permissões |
| F14 | Catálogo Visual | Fotos dos tecidos |
| F15 | Relatórios | Resumo de vendas por período |

---

## 3. WIZARD DE ORÇAMENTO (4 Etapas)

### Etapa 1: Cliente
- Buscar cliente existente OU
- Cadastrar novo (nome*, telefone*, email, endereço)

### Etapa 2: Itens
- Adicionar ambientes (Sala, Quarto 1, etc.)
- Para cada ambiente, adicionar itens:
  - Selecionar tipo (Hospitalar, Residencial, Palco, Fornecedor)
  - Informar medidas (largura × altura)
  - Selecionar material/cor
  - Ver cálculo em tempo real

### Etapa 3: Revisão
- Visualizar todos os itens
- Aplicar desconto (% ou R$)
- Definir validade e prazo de entrega
- Adicionar observações

### Etapa 4: Finalização
- Salvar orçamento
- Opções: Baixar PDF, Enviar WhatsApp, Enviar Email, Imprimir

---

## 4. TIPOS DE ORÇAMENTO

### 4.1 Cortinas Hospitalares
**Composição:**
- Vinil VNS 45 (2m altura)
- Tela Colméia (0.60m ou 0.90m)
- Trilho Suíço Luxo (opcional)
- Acessórios: ilhoses, ganchos, deslizantes

**Regras:**
- Fator de franzido: 1.65
- Rebaixamento se pé direito > 3.10m
- Curvas no trilho: R$ 30/cada

### 4.2 Cortinas Residenciais
**Tipos:**
- Cortina de trilho
- Cortina wave
- Blackout
- Voil
- Painel

**Regras:**
- Fator de franzido varia por tipo
- Calcular tecido, trilho, acessórios

### 4.3 Cortinas de Palco
**Tipos:**
- Frontal (boca de cena)
- Bambolinas
- Pernas (laterais)
- Fundo

**Regras:**
- Tecidos pesados (veludo)
- Estrutura especial

### 4.4 Produtos de Fornecedor
**Fornecedores:**
- Kazza Persianas
- Liber Persianas

**Regras:**
- Preço = Custo fornecedor × (1 + markup%)

---

## 5. ESTRUTURA DO PDF

```
┌─────────────────────────────────────────┐
│ [LOGO]  CORTIHOUSE CORTINAS             │
│         Dados da empresa...              │
├─────────────────────────────────────────┤
│         PROPOSTA Nº XXX/2026            │
│         Data: DD/MM/AAAA                │
├─────────────────────────────────────────┤
│ CLIENTE                                 │
│ Nome, Endereço, CNPJ, Contato           │
├─────────────────────────────────────────┤
│ OBJETO                                  │
│ Descrição do serviço...                 │
├─────────────────────────────────────────┤
│ QUADRO DE FORNECIMENTO E PREÇOS         │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┐  │
│ │Item │Qtde │Medida│Desc │Unit │Total│  │
│ ├─────┼─────┼─────┼─────┼─────┼─────┤  │
│ │ 1   │ 3   │2x2m │...  │1.200│3.600│  │
│ └─────┴─────┴─────┴─────┴─────┴─────┘  │
├─────────────────────────────────────────┤
│ VALOR TOTAL: R$ XX.XXX,XX              │
├─────────────────────────────────────────┤
│ CONDIÇÕES DE PAGAMENTO                  │
│ À vista 3% desc, ou 30%+2x cartão      │
├─────────────────────────────────────────┤
│ DEMAIS CONDIÇÕES                        │
│ ✓ Prazo: 15 dias úteis                 │
│ ✓ Frete e instalação inclusos          │
│ ✓ Validade: 15 dias                    │
├─────────────────────────────────────────┤
│ Assinatura                              │
│ Vanda Barros - Cortihouse               │
└─────────────────────────────────────────┘
```

---

## 6. REQUISITOS NÃO-FUNCIONAIS

### Usabilidade (CRÍTICO)
- Fontes mínimo 16px
- Botões grandes (44px altura)
- Linguagem simples, sem jargões
- Feedback visual para todas as ações
- Fluxo linear e guiado

### Performance
- Carregamento inicial < 3s
- Geração de PDF < 5s

### Segurança
- Autenticação obrigatória
- Dados isolados por empresa (RLS)
- HTTPS obrigatório

---

## 7. FORA DO ESCOPO (MVP)

- App mobile nativo
- Integração com ERP
- Controle financeiro completo
- Agenda de instalações
- Múltiplas empresas (multi-tenant completo)

---

*PRD v1.0 - Janeiro 2026*
