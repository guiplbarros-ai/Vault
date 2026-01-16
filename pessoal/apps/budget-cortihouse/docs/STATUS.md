# Status do Planejamento - Budget Cortihouse

**Última atualização:** Janeiro 2026

---

## RESUMO EXECUTIVO

O planejamento está **~85% completo**. Faltam apenas os dados de preços unitários para finalizar as constantes de cálculo.

---

## DOCUMENTOS CRIADOS

### ✅ Completos

| Documento | Descrição | Status |
|-----------|-----------|--------|
| `TECH_DECISIONS.md` | Stack, dependências, configurações | ✅ Completo |
| `IMPLEMENTATION_GUIDE.md` | Guia passo-a-passo para desenvolvimento | ✅ Completo |

### 🟡 Precisam Recriação (foram perdidos)

| Documento | Descrição | Prioridade |
|-----------|-----------|------------|
| `PRD.md` | Product Requirements Document | Alta |
| `USER_FLOWS.md` | Fluxos de usuário com wireframes | Alta |
| `HOSPITAL_RULES.md` | Regras de cortinas hospitalares | Média |
| `INTERVIEW_SCRIPT.md` | Roteiro de entrevista | Média |
| `BUSINESS_RULES.md` | Regras de negócio gerais | Média |
| `CALCULATIONS.md` | Fórmulas de cálculo | Alta |

---

## INFORMAÇÕES COLETADAS

### Dados da Empresa ✅
```
Nome: Cortihouse Cortinas de Palco, Decorações & Confecções Ltda
CNPJ: 41.697.350/0001-36
IE: 186.78326000-90
Endereço: Rua Diamantina, 26, Santa Edwiges, Contagem/MG
Telefones: 31 3351-7467 / 31 9 9973-2346 / 31 9 9286-4848
Site: www.cortihouse.com.br
Responsável: Vanda Barros
```

### Regras de Cortinas Hospitalares ✅
- Fator de franzido: **1.65** (65%)
- Vinil: 2.00m de altura (fixo)
- Tela Colméia: 0.60m ou 0.90m (conforme pé direito)
- Rebaixamento: necessário se pé direito > 3.10m
- Curva no trilho: R$ 30,00 cada
- Taxa de retorno: R$ 100,00
- Desconto à vista: 3%
- Validade: 15 dias
- Prazo entrega: 15 dias úteis

### Condições Comerciais Padrão ✅
- Pagamento à vista: 40% pedido + 60% entrega (PIX)
- Pagamento parcelado: 30% pedido + 70% em 2x cartão
- Instalação: seg a qui, 8h-16h
- Frete e instalação inclusos (quando aplicável)

### Decisões Técnicas ✅
- Framework: Next.js 14 (App Router)
- Database: Supabase (PostgreSQL)
- ORM: Drizzle
- Auth: Supabase Auth
- Deploy: Fly.io
- Package Manager: pnpm
- Testes: Vitest (unit only)
- i18n: Não (só português)

---

## INFORMAÇÕES PENDENTES

### 🔴 Críticas (bloqueiam desenvolvimento completo)

1. **Preços Unitários de Materiais Hospitalares**
   - Vinil VNS 45 (m²)
   - Tela Colméia (m²)
   - Trilho Suíço Luxo (m)
   - Suportes, tampas, ilhoses, ganchos

2. **Preços de Mão de Obra**
   - Confecção
   - Instalação

3. **Valores de Frete**
   - BH/região
   - Interior MG
   - São Paulo

4. **Credenciais Supabase**
   - SUPABASE_URL
   - SUPABASE_ANON_KEY

### 🟡 Importantes (refinam o sistema)

5. **Fatores de Franzido Residenciais**
   - Cortina de trilho
   - Cortina wave
   - Blackout
   - Voil

6. **Preços de Tecidos Residenciais**
   - Lista de tecidos
   - Preços por metro
   - Largura dos rolos

7. **Markup sobre Fornecedores**
   - Percentual Kazza
   - Percentual Liber

8. **Logo da Empresa**
   - Arquivo PNG/SVG para orçamentos

---

## PRÓXIMOS PASSOS

### Para completar o planejamento:

1. [ ] **Recriar documentos perdidos** (PRD, USER_FLOWS, etc.)
2. [ ] **Coletar preços** (entrevista com Vanda)
3. [ ] **Criar projeto Supabase** e obter credenciais
4. [ ] **Criar arquivo de constantes** com preços

### Para iniciar desenvolvimento:

1. [ ] Executar setup do projeto (pnpm create next-app)
2. [ ] Configurar Supabase e variáveis de ambiente
3. [ ] Aplicar migrations do banco
4. [ ] Seguir IMPLEMENTATION_GUIDE.md

---

## ESTRUTURA ESPERADA DO PROJETO

```
Budget Cortihouse/
├── docs/
│   ├── PRD.md                    # Requisitos
│   ├── USER_FLOWS.md             # Fluxos de usuário
│   ├── TECH_DECISIONS.md         # Decisões técnicas ✅
│   ├── IMPLEMENTATION_GUIDE.md   # Guia de implementação ✅
│   ├── HOSPITAL_RULES.md         # Regras hospitalares
│   ├── CALCULATIONS.md           # Fórmulas
│   ├── INTERVIEW_SCRIPT.md       # Roteiro entrevista
│   └── STATUS.md                 # Este arquivo ✅
├── app/                          # Código Next.js (a criar)
└── README.md                     # Visão geral ✅
```

---

*Status atualizado automaticamente durante o planejamento*
