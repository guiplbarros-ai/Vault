# Roteiro de Entrevista - Regras de Negócio

**Objetivo:** Coletar regras de negócio com a Vanda para configurar o sistema.

> **NOTA:** Os preços de materiais e serviços são gerenciados em `/precos` no sistema.

---

## RESUMO DE STATUS

| Categoria | Confirmado | Pendente |
|-----------|------------|----------|
| Hospitalares | 90% | Preços no sistema |
| Residenciais | 10% | Fatores de franzido, regras |
| Comercial | 30% | Markups, descontos |
| Fretes | 0% | Todos os valores |

---

## BLOCO 1: CORTINAS HOSPITALARES ✅

> A maioria das regras hospitalares já foi confirmada. Esta seção serve para **validação**.

### 1.1 Regras Confirmadas (validar se ainda estão corretas)

| Regra | Valor Atual | Ainda válido? |
|-------|-------------|---------------|
| Fator de franzido | **1.65×** | ☐ Sim ☐ Não |
| Altura do vinil | **2.00m** (fixo) | ☐ Sim ☐ Não |
| Espaçamento entre ganchos | **15cm** | ☐ Sim ☐ Não |
| Preço da curva de trilho | **R$ 30,00** | ☐ Sim ☐ Não |

### 1.2 Altura da Tela Colméia (validar)

| Pé Direito | Altura Tela | Rebaixamento | OK? |
|------------|-------------|--------------|-----|
| ≤ 2.60m | 0.60m | Não | ☐ |
| 2.61m - 3.10m | 0.90m | Não | ☐ |
| > 3.10m | 0.90m | **SIM** | ☐ |

### 1.3 Trilho Suíço Luxo - Suportes

| Comprimento | Qtd Suportes | OK? |
|-------------|--------------|-----|
| Até 1.5m | 2 | ☐ |
| 1.5m - 3.0m | 3 | ☐ |
| Acima | 1 por metro + 1 | ☐ |

---

## BLOCO 2: CORTINAS RESIDENCIAIS ⏳

> Esta seção tem **muitas lacunas** - prioridade alta na entrevista.

### 2.1 Fatores de Franzido

| Tipo de Cortina | Fator | Exemplo (janela 2m) |
|-----------------|-------|---------------------|
| Cortina de trilho tradicional | _____ × | _____ m |
| Cortina wave | _____ × | _____ m |
| Blackout | _____ × | _____ m |
| Voil | _____ × | _____ m |
| Painel japonês | 1.0× (sem franzido?) | ☐ Confirmar |

**Perguntas adicionais:**
- O fator muda conforme o tecido (leve/pesado)? _____
- Voil e blackout usados juntos usam mesmo fator? _____

### 2.2 Medidas e Margens

| Pergunta | Resposta |
|----------|----------|
| Margem do trilho além da janela (cada lado) | _____ cm |
| Largura mínima aceita para produção | _____ m |
| Margem de altura para barra (cima + baixo) | _____ cm |
| Largura padrão do rolo de tecido | _____ m |

### 2.3 Emendas de Tecido

| Pergunta | Resposta |
|----------|----------|
| A partir de que largura precisa emenda? | _____ m |
| Cobra valor extra por emenda? | ☐ Sim ☐ Não |
| Se sim, quanto? | R$ _____ |

---

## BLOCO 3: REGRAS COMERCIAIS ⏳

### 3.1 Confirmados

| Regra | Valor |
|-------|-------|
| Desconto à vista | **3%** ✅ |
| Taxa de retorno (instalador não atendido) | **R$ 100,00** ✅ |
| Validade do orçamento | **15 dias** ✅ |
| Prazo de entrega | **15 dias úteis** ✅ |

### 3.2 Pendentes

| Pergunta | Resposta |
|----------|----------|
| Desconto máximo permitido? | _____ % |
| Desconto por quantidade (ex: +5 cortinas)? | ☐ Sim ☐ Não → _____ % |
| Desconto para cliente recorrente? | ☐ Sim ☐ Não → _____ % |
| Arredondamento do valor final? | ☐ Centavos ☐ Reais ☐ Dezena |

### 3.3 Condições de Pagamento

**À Vista (com 3% desconto):**
| Etapa | Percentual | Forma |
|-------|------------|-------|
| No pedido | **40%** ✅ | _____ |
| Na entrega | **60%** ✅ | PIX ✅ |

**Parcelado (sem desconto):**
| Etapa | Percentual | Forma |
|-------|------------|-------|
| No pedido | **30%** ✅ | _____ |
| Saldo | **70%** ✅ | 2× cartão ✅ |

| Pergunta | Resposta |
|----------|----------|
| Aceita boleto? | ☐ Sim ☐ Não |
| Parcela em quantas vezes máx? | _____ × |
| Juros no parcelamento? | ☐ Sim ☐ Não → _____ % |

---

## BLOCO 4: FORNECEDORES (Kazza / Liber) ⏳

| Pergunta | Kazza | Liber |
|----------|-------|-------|
| Markup padrão | _____ % (30%?) | _____ % (30%?) |
| Markup muda por produto? | ☐ Sim ☐ Não | ☐ Sim ☐ Não |
| Prazo de entrega do fornecedor | _____ dias | _____ dias |
| Quem faz instalação? | ☐ Nós ☐ Eles | ☐ Nós ☐ Eles |

**Produtos que revende de cada:**
- Kazza: _____
- Liber: _____

---

## BLOCO 5: FRETES 🆕

| Destino | Valor | Incluso no orçamento? |
|---------|-------|----------------------|
| BH e região metropolitana | R$ _____ | ☐ Sim ☐ Não |
| Interior de MG (até X km) | R$ _____ | ☐ Não |
| São Paulo | R$ _____ | ☐ Não |
| Outros estados | R$ _____ /km | ☐ Não |

| Pergunta | Resposta |
|----------|----------|
| Frete grátis a partir de quanto? | R$ _____ |
| Cobra ICMS para SP? | **6%** (confirmar) |

---

## BLOCO 6: INSTALAÇÃO ✅

> Já confirmado - apenas validar

| Regra | Valor | OK? |
|-------|-------|-----|
| Dias de instalação | Seg a Qui | ☐ |
| Horário manhã | 8h - 11h | ☐ |
| Horário tarde | 13h - 16h | ☐ |
| Taxa retorno | R$ 100,00 | ☐ |

---

## PRIORIDADES PARA PRÓXIMA CONVERSA

### Alta Prioridade (precisa para sistema funcionar)
- [ ] Fatores de franzido residenciais (todos os tipos)
- [ ] Confirmar markups Kazza e Liber
- [ ] Valores de frete

### Média Prioridade
- [ ] Margem do trilho além da janela
- [ ] Largura mínima aceita
- [ ] Regras de emenda de tecido

### Baixa Prioridade (já funciona sem)
- [ ] Desconto por quantidade
- [ ] Desconto cliente recorrente

---

## ANOTAÇÕES DA CONVERSA

**Data:** ___/___/______

**Participantes:** _____

### Notas:

```
(usar este espaço para anotações livres durante a conversa)



```

---

## COMO ATUALIZAR O SISTEMA

Após coletar as informações:

1. **Preços:** Acesse `/precos` e atualize os valores
2. **Constantes:** Atualizar `src/constants/calculation.ts`
3. **Documentação:** Atualizar `docs/HOSPITAL_RULES.md` e `docs/BUSINESS_RULES.md`

---

*Roteiro v3.0 - Reorganizado por prioridade e status*
