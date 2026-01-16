# Regras de Negócio - Budget Cortihouse

## 1. VISÃO GERAL DO NEGÓCIO

### 1.1 Modelo de Negócio

A Cortihouse Cortinas opera em dois modelos:

1. **Produção Própria**
   - Compra tecidos e materiais
   - Confecciona as cortinas
   - Instala no cliente

2. **Revenda de Fornecedores**
   - Parceiros: Kazza Persianas, Liber Persianas
   - Compra produtos prontos
   - Aplica markup sobre o custo
   - Faz a instalação

### 1.2 Segmentos Atendidos

| Segmento | Particularidades |
|----------|------------------|
| Residencial | Padrão, maior volume |
| Hospitalar | Materiais específicos, trilhos especiais, certificações |
| Palco/Teatro | Dimensões grandes, tecidos especiais, possível motorização |
| Comercial | Escritórios, lojas - geralmente produtos de fornecedores |

---

## 2. CATÁLOGO DE PRODUTOS

### 2.1 Produtos de Produção Própria

#### Cortinas de Tecido
- Cortina de Trilho (tradicional)
- Cortina de Varão
- Cortina Wave
- Painel (japonês)
- Blackout (tecido)
- Voil

#### Cortinas Hospitalares
- [ ] **TODO:** Detalhar tipos específicos
- Características: materiais antibacterianos, laváveis
- Trilhos específicos (curvos, embutidos)

#### Cortinas de Palco
- [ ] **TODO:** Detalhar tipos (frontal, bambolinas, pernas, fundo)
- Características: tecidos pesados (veludo), grandes dimensões

### 2.2 Produtos de Fornecedores

#### Kazza Persianas
- [ ] **TODO:** Listar produtos disponíveis
- Modelo de precificação: Custo + Markup

#### Liber Persianas
- [ ] **TODO:** Listar produtos disponíveis
- Modelo de precificação: Custo + Markup

---

## 3. REGRAS DE CÁLCULO

### 3.1 Instalação

**Regra:** Valor fixo incluso no serviço total
- Não é cobrado separadamente
- Está embutido na margem do produto

### 3.2 Fator de Franzido (por tipo de cortina)

O fator de franzido determina quanto tecido é necessário para a largura da janela.

| Tipo de Cortina | Fator de Franzido | Exemplo (janela 2m) |
|-----------------|-------------------|---------------------|
| Cortina Trilho | [ ] TODO | [ ] TODO |
| Cortina Varão | [ ] TODO | [ ] TODO |
| Cortina Wave | [ ] TODO | [ ] TODO |
| Blackout | [ ] TODO | [ ] TODO |
| Voil | [ ] TODO | [ ] TODO |
| Painel | [ ] TODO | [ ] TODO |

### 3.3 Cálculo de Tecido

```
FÓRMULA BASE:
Largura do Tecido = Largura da Janela × Fator de Franzido
Altura do Tecido = Altura Desejada + Margem (barra superior + inferior)

QUANTIDADE TOTAL:
Metros de Tecido = (Largura do Tecido × Altura do Tecido) / Largura do Rolo

Considerações:
- Largura padrão do rolo: [ ] TODO (geralmente 2.80m ou 3.00m)
- Emenda necessária quando: [ ] TODO
- Perda de corte: [ ] TODO (geralmente 5-10%)
```

### 3.4 Cálculo de Trilhos/Varões

```
FÓRMULA:
Comprimento do Trilho = Largura da Janela + Margem Lateral (X cm de cada lado)

Suportes necessários:
- Até Xm: [ ] TODO suportes
- De Xm a Xm: [ ] TODO suportes
- Acima de Xm: [ ] TODO suportes
```

### 3.5 Produtos de Fornecedores

```
FÓRMULA:
Preço Final = Custo do Fornecedor × (1 + Markup%)

Markup padrão: [ ] TODO (%)
Variações de markup: [ ] TODO
```

---

## 4. REGRAS POR SEGMENTO

### 4.1 Residencial

**Características:**
- Cálculo padrão
- Maior variedade de tecidos
- Preços mais competitivos

### 4.2 Hospitalar

**Características:**
- Tecidos antibacterianos/antimicrobianos
- Trilhos especiais (curvos para leitos, embutidos em forros)
- Acessórios específicos
- Possível necessidade de certificações

**Diferenças no cálculo:**
- [ ] TODO: Detalhar todas as diferenças

### 4.3 Palco/Teatro

**Características:**
- Grandes dimensões
- Tecidos pesados (veludo, brim)
- Possível motorização
- Estrutura de sustentação especial

**Tipos de cortinas de palco:**
- [ ] Cortina frontal (boca de cena)
- [ ] Bambolinas (horizontais no alto)
- [ ] Pernas (laterais)
- [ ] Fundo/Ciclorama

**Diferenças no cálculo:**
- [ ] TODO: Detalhar todas as diferenças

### 4.4 Comercial

**Características:**
- Geralmente produtos de fornecedores (persianas)
- Foco em praticidade e durabilidade
- Possível grande quantidade

---

## 5. DESCONTOS E CONDIÇÕES

### 5.1 Regras de Desconto

- [ ] **TODO:** Desconto por pagamento à vista?
- [ ] **TODO:** Desconto por quantidade?
- [ ] **TODO:** Desconto para clientes recorrentes?
- [ ] **TODO:** Margem de negociação permitida?

### 5.2 Formas de Pagamento

- [ ] **TODO:** Quais formas aceitas?
- [ ] **TODO:** Parcelamento? Quantas vezes?
- [ ] **TODO:** Entrada obrigatória?

### 5.3 Prazos

- [ ] **TODO:** Validade do orçamento (ex: 15 dias)
- [ ] **TODO:** Prazo de produção por tipo
- [ ] **TODO:** Prazo de instalação

---

## 6. FLUXO DO ORÇAMENTO

### 6.1 Etapas

1. **Contato Inicial**
   - Cliente entra em contato (WhatsApp/telefone/loja)
   - Coleta de informações básicas

2. **Visita Técnica** (quando necessário)
   - Medição in loco
   - Avaliação do ambiente
   - Sugestões de produtos

3. **Elaboração do Orçamento**
   - Cálculos de materiais
   - Aplicação de preços
   - Definição de prazo

4. **Apresentação**
   - Envio por WhatsApp/email
   - PDF profissional

5. **Negociação** (se houver)
   - Ajustes no orçamento
   - Aplicação de descontos

6. **Aprovação**
   - Confirmação do cliente
   - Agendamento de produção/instalação

---

## 7. INFORMAÇÕES DO ORÇAMENTO

### 7.1 Dados do Cliente (necessários)

- Nome completo
- Telefone (WhatsApp)
- Endereço completo (para instalação)
- [ ] Email?
- [ ] CPF/CNPJ?

### 7.2 Dados do Orçamento

- Número do orçamento (sequencial)
- Data de emissão
- Validade
- Ambientes/itens detalhados
- Valor total
- Condições de pagamento
- Prazo de entrega/instalação

### 7.3 Apresentação

**Nível de detalhamento para o cliente:**
- [ ] **TODO:** Mostra valor de cada material separado?
- [ ] **TODO:** Ou apenas valor total por ambiente/item?

---

## PENDÊNCIAS DE LEVANTAMENTO

Lista de informações ainda necessárias:

1. [ ] Tabelas de preço de tecidos
2. [ ] Tabelas de preço de trilhos/varões
3. [ ] Tabelas de preço de fornecedores (Kazza, Liber)
4. [ ] Fatores de franzido por tipo
5. [ ] Detalhes de cortinas hospitalares
6. [ ] Detalhes de cortinas de palco
7. [ ] Regras de desconto
8. [ ] Formas de pagamento aceitas
9. [ ] Markup padrão sobre fornecedores

---

*Documento em construção - Atualizado conforme levantamento*
