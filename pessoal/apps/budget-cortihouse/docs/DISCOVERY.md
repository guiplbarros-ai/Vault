# Descoberta e Levantamento de Requisitos

Este documento contém todas as perguntas e informações necessárias para entender completamente o negócio da Cortihouse Cortinas e construir um sistema de orçamentação adequado.

---

## 1. SOBRE O NEGÓCIO

### 1.1 Informações Gerais
- [ ] Qual o nome completo da empresa?
- [ ] CNPJ (para aparecer nos orçamentos)?
- [ ] Endereço completo?
- [ ] Telefones de contato?
- [ ] Email?
- [ ] Logo da empresa (para os orçamentos)?

### 1.2 Contexto Atual
- [ ] Como os orçamentos são feitos hoje? (Excel, papel, outro sistema?)
- [ ] Quanto tempo leva para fazer um orçamento atualmente?
- [ ] Quais são as maiores dificuldades no processo atual?
- [ ] O que não pode faltar em um orçamento?

---

## 2. TIPOS DE CORTINAS E PRODUTOS

### 2.1 Cortinas Residenciais

#### Tipos de cortinas oferecidos:
- [ ] Cortina de Trilho (tradicional)
- [ ] Cortina de Varão
- [ ] Persiana Horizontal
- [ ] Persiana Vertical
- [ ] Persiana Rolô
- [ ] Cortina Romana
- [ ] Cortina Wave
- [ ] Painel (japonês)
- [ ] Blackout
- [ ] Voil
- [ ] Outros? Quais?

#### Para cada tipo de cortina:
- [ ] Quais materiais/tecidos estão disponíveis?
- [ ] Qual a faixa de preço por metro de cada material?
- [ ] Existe largura máxima do tecido (para calcular emendas)?
- [ ] Quais cores disponíveis?

### 2.2 Cortinas Hospitalares

- [ ] Quais tipos de cortinas hospitalares são oferecidos?
- [ ] Materiais específicos (antibacterianos, laváveis)?
- [ ] Existem normas/certificações obrigatórias?
- [ ] O cálculo é diferente do residencial? Como?
- [ ] Há requisitos especiais de instalação?
- [ ] Trilhos específicos para hospitais?

### 2.3 Cortinas de Palco

- [ ] Tipos de cortinas de palco (frontal, bambolinas, pernas, fundo)?
- [ ] Materiais específicos (veludo, sintéticos)?
- [ ] Como funciona o cálculo para palco?
- [ ] Há motorizações/automações?
- [ ] Requisitos especiais de instalação?

---

## 3. REGRAS DE CÁLCULO - DETALHAMENTO CRÍTICO

### 3.1 Medidas Básicas

- [ ] Como são medidas as janelas? (largura x altura)
- [ ] A cortina deve ter quantos cm a mais que a janela? (lateral e superior)
- [ ] Qual a altura padrão do chão? (ex: 2cm do chão)
- [ ] Como calcular quando a cortina vai até o teto?

### 3.2 Cálculo de Tecido

- [ ] Qual o fator de franzido padrão? (ex: 2x, 2.5x, 3x a largura)
- [ ] O fator muda por tipo de cortina?
- [ ] Como calcular quando precisa de emenda no tecido?
- [ ] Há perda de tecido no corte? Quanto considerar?
- [ ] Como calcular forro? Sempre usa?

### 3.3 Cálculo de Trilhos/Varões

- [ ] Como dimensionar o trilho? (largura da janela + quanto?)
- [ ] Tipos de trilhos disponíveis e preços?
- [ ] Tipos de varões disponíveis e preços?
- [ ] Suportes: quantos por metro de trilho/varão?
- [ ] Preço dos suportes?

### 3.4 Acessórios

Lista de acessórios e como são calculados:
- [ ] Ganchos/argolas - quantidade por metro?
- [ ] Ponteiras de varão - sempre 2?
- [ ] Abraçadeiras - opcionais?
- [ ] Presilhas/ilhós - quantidade como?
- [ ] Outros acessórios?

### 3.5 Mão de Obra

- [ ] Como é cobrada a instalação? (por peça? por metro? por serviço?)
- [ ] Valores de instalação por tipo de cortina?
- [ ] Há diferença de preço por complexidade?
- [ ] Visita técnica é cobrada?
- [ ] Deslocamento é cobrado? Como?

---

## 4. ESTRUTURA DO ORÇAMENTO

### 4.1 Informações do Cliente

- [ ] Quais dados do cliente são necessários?
  - Nome
  - Telefone
  - Email
  - Endereço
  - CPF/CNPJ?
  - Outros?

### 4.2 Informações do Ambiente

- [ ] Como identificar cada ambiente? (ex: Sala, Quarto 1, Cozinha)
- [ ] Pode ter mais de uma janela por ambiente?
- [ ] Que informações de cada janela/local precisam ser registradas?

### 4.3 Apresentação do Orçamento

- [ ] Como deve ser apresentado o orçamento para o cliente?
- [ ] Mostra detalhamento de materiais ou só valor final?
- [ ] Mostra valor unitário de cada item?
- [ ] Há desconto por quantidade/valor total?
- [ ] Forma de pagamento aparece? Quais condições?
- [ ] Prazo de validade do orçamento? (ex: 15 dias)
- [ ] Prazo de entrega/instalação aparece?

### 4.4 Formato de Saída

- [ ] PDF para enviar ao cliente?
- [ ] WhatsApp direto?
- [ ] Email?
- [ ] Imprimir?

---

## 5. FLUXO DE TRABALHO

### 5.1 Processo Atual

Descreva o passo a passo de como é feito um orçamento hoje:
1. Cliente entra em contato como? (WhatsApp, telefone, loja)
2. Quais informações são coletadas inicialmente?
3. Visita técnica é feita? Sempre?
4. Como as medidas são anotadas?
5. Como os cálculos são feitos?
6. Como o orçamento é apresentado ao cliente?
7. O que acontece após aprovação?

### 5.2 Dores do Processo Atual

- [ ] O que mais dá trabalho?
- [ ] Onde acontecem mais erros?
- [ ] O que os clientes mais reclamam?
- [ ] O que poderia ser mais rápido?

---

## 6. FUNCIONALIDADES DESEJADAS

### 6.1 Essenciais (Deve ter)

- [ ] Cadastrar novo orçamento
- [ ] Adicionar múltiplos ambientes/janelas
- [ ] Calcular automaticamente tecido, trilho, acessórios
- [ ] Gerar PDF do orçamento
- [ ] Enviar por WhatsApp
- [ ] Salvar orçamentos anteriores
- [ ] Buscar orçamento por cliente

### 6.2 Importantes (Deveria ter)

- [ ] Catálogo de tecidos com fotos
- [ ] Histórico de preços
- [ ] Duplicar orçamento existente
- [ ] Status do orçamento (enviado, aprovado, em produção, instalado)
- [ ] Agenda de instalações
- [ ] Relatório de vendas

### 6.3 Desejáveis (Poderia ter)

- [ ] App no celular para medições
- [ ] Tirar foto da janela e anexar
- [ ] Simulador visual da cortina
- [ ] Integração com fornecedores
- [ ] Controle financeiro

---

## 7. USUÁRIA E CONTEXTO DE USO

### 7.1 Perfil da Usuária Principal

- [ ] Usa smartphone? Qual?
- [ ] Usa computador? Notebook ou desktop?
- [ ] Quais aplicativos usa no dia a dia?
- [ ] Tem facilidade com WhatsApp?
- [ ] Como prefere: digitar ou selecionar opções?
- [ ] Tamanho de fonte confortável?
- [ ] Usa óculos?

### 7.2 Contexto de Uso

- [ ] Onde será usado o sistema? (escritório, loja, visita ao cliente)
- [ ] Precisa funcionar offline?
- [ ] Será usado em tablet? Celular? Computador?
- [ ] Quantos orçamentos são feitos por dia/semana/mês?

### 7.3 Outros Usuários

- [ ] Mais alguém usará o sistema?
- [ ] Precisa de níveis de acesso diferentes?

---

## 8. REGRAS DE NEGÓCIO ESPECIAIS

### 8.1 Descontos

- [ ] Existem regras de desconto? Quais?
- [ ] Desconto por pagamento à vista?
- [ ] Desconto por quantidade?
- [ ] Desconto para cliente recorrente?

### 8.2 Preços

- [ ] Preços são fixos ou mudam frequentemente?
- [ ] Quem pode alterar preços?
- [ ] Há margem de negociação?
- [ ] Preço mínimo existe?

### 8.3 Particularidades

- [ ] Há clientes especiais (construtoras, arquitetos)?
- [ ] Condições diferentes para cada tipo de cliente?
- [ ] Comissões para indicações?

---

## 9. CONCORRÊNCIA E REFERÊNCIAS

- [ ] Conhece algum sistema de orçamento de cortinas?
- [ ] Já usou algum? O que gostou/não gostou?
- [ ] Tem referência de orçamento de concorrente que achou bom?

---

## 10. PRÓXIMOS PASSOS

Após preencher este documento:
1. Validar entendimento das regras de cálculo
2. Criar fórmulas detalhadas para cada tipo de cortina
3. Desenhar fluxos de tela
4. Criar protótipos de baixa fidelidade
5. Validar com a usuária
6. Iniciar desenvolvimento

---

## ANOTAÇÕES E OBSERVAÇÕES

*Espaço para anotações durante as conversas de levantamento:*




---

*Documento criado em: [DATA]*
*Última atualização: [DATA]*
