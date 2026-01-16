# Modo Demonstração - Guia Completo

## Visão Geral

O **Modo Demo** do Cortex Cash permite que você experimente o sistema com dados fictícios antes de adicionar suas informações reais. É ideal para:

- 🎯 Explorar todas as funcionalidades sem comprometer dados reais
- 📊 Visualizar relatórios e dashboards com dados realistas
- 🧪 Testar o sistema antes de começar a usar de verdade
- 🎓 Aprender como o sistema funciona

## Como Ativar o Modo Demo

### Primeira Execução

Ao abrir o Cortex Cash pela primeira vez, você verá um **wizard de onboarding** com duas opções:

1. **Modo Demo** - Popula o sistema com dados de exemplo
2. **Começar do Zero** - Inicia com banco de dados vazio

Se escolher "Modo Demo", o sistema irá:
- Ativar automaticamente o modo demonstração
- Popular o banco com dados de exemplo
- Exibir um banner laranja no topo da tela

### Via Configurações

Você também pode ativar/desativar o modo demo a qualquer momento:

1. Acesse **Settings** (Configurações) no menu lateral
2. Role até a seção **"Modo Demonstração"**
3. Ative o switch **"Ativar Modo Demo"**
4. Clique em **"Popular com Dados de Exemplo"** para adicionar dados fictícios

## Dados Populados

Quando você popula o banco com dados demo, o sistema cria:

### 🏦 Instituições Financeiras (5)
- Nubank
- Inter
- Itaú
- Bradesco
- Santander

### 💳 Contas Bancárias (6)
- **Conta Corrente Principal** (Nubank) - R$ 4.250,00
- **Conta Poupança** (Inter) - R$ 15.000,00
- **Conta Investimentos** (Itaú) - R$ 50.000,00
- **Conta Reserva Emergência** (Bradesco) - R$ 20.000,00
- **Conta Carteira Digital** (PicPay) - R$ 500,00
- **Conta Dólar** (Wise) - R$ 10.000,00

### 📂 Categorias (39)
Categorias padrão organizadas por tipo:
- **Receitas**: Salário, Freelance, Investimentos, etc.
- **Despesas Fixas**: Aluguel, Condomínio, Internet, etc.
- **Despesas Variáveis**: Alimentação, Transporte, Lazer, etc.
- **Investimentos**: Ações, Renda Fixa, Cripto, etc.

### 💰 Transações (100+)
Três meses de transações realistas incluindo:
- **Salário mensal** (dia 5 de cada mês)
- **Despesas fixas** (aluguel, condomínio, planos, etc.)
- **Despesas variáveis** (supermercado, restaurantes, uber, etc.)
- **Despesas ocasionais** (roupas, eletrônicos, lazer, etc.)
- **Investimentos mensais** (aportes em diferentes classes)

## Banner de Modo Demo

Quando o modo demo está ativo, um **banner laranja** aparece no topo da tela com:

```
⚠️ Modo Demonstração Ativo
Você está usando dados fictícios. Acesse Settings para sair do modo demo.
```

### Dispensar o Banner
- Clique no **X** no canto direito do banner para ocultá-lo
- O banner reaparecerá na próxima sessão (ao recarregar a página)
- Para removê-lo permanentemente, desative o Modo Demo em Settings

## Gerenciar Dados Demo

### Popular Novamente
Se você já populou os dados mas quer resetar:

1. Acesse **Settings → Modo Demonstração**
2. Clique em **"Limpar Dados Demo"** (botão vermelho)
3. Confirme a ação
4. Clique em **"Popular com Dados de Exemplo"** novamente

### Limpar Todos os Dados

⚠️ **ATENÇÃO**: Esta ação irá **remover TODAS as contas e transações** do banco!

1. Acesse **Settings → Modo Demonstração**
2. Clique em **"Limpar Dados Demo"**
3. Confirme a ação no popup
4. Todos os dados serão apagados

### Estatísticas em Tempo Real

A seção de Demo Mode em Settings mostra:
- **Número de contas** cadastradas
- **Número de transações** registradas

Esses números atualizam automaticamente após popular ou limpar dados.

## Desativar Modo Demo

Para começar a usar o sistema com seus dados reais:

1. Acesse **Settings → Modo Demonstração**
2. **(Opcional)** Clique em **"Limpar Dados Demo"** para remover dados fictícios
3. Desative o switch **"Ativar Modo Demo"**
4. O banner laranja desaparecerá
5. Agora você pode começar a cadastrar suas contas e transações reais

## Persistência de Dados

### LocalStorage
As configurações do modo demo são salvas no **localStorage** do navegador:
- `cortex-cash-demo-mode`: Estado do modo (ativado/desativado)
- `cortex-cash-demo-data-populated`: Flag indicando se dados foram populados
- `demo-banner-dismissed`: Flag de sessão para ocultar banner temporariamente

### IndexedDB
Os dados fictícios (contas, transações, categorias) são salvos no **IndexedDB**:
- Persistem mesmo após fechar o navegador
- São compartilhados com dados reais (não há separação física)
- Podem ser limpos a qualquer momento via Settings

## FAQ

### 1. Posso misturar dados demo com dados reais?
Sim, mas **não é recomendado**. O ideal é limpar os dados demo antes de começar a usar com dados reais.

### 2. Os dados demo afetam meus relatórios?
Sim! Se você tiver dados demo e dados reais juntos, os relatórios mostrarão ambos. Por isso recomendamos limpar antes de usar de verdade.

### 3. Posso editar os dados demo?
Sim! Todos os dados demo podem ser editados ou excluídos normalmente através da interface.

### 4. O modo demo consome a quota de IA?
Não! O modo demo não faz chamadas à API de IA. A quota mostrada na sidebar é apenas ilustrativa quando em modo demo.

### 5. Como sei se estou em modo demo?
- Banner laranja no topo da tela
- Badge "DEMO" na seção de Settings
- Switch ativado em Settings → Modo Demonstração

### 6. Posso resetar apenas as transações mas manter as contas?
No momento não há essa opção. A limpeza remove **todas as contas e transações** de uma vez. Se precisar dessa funcionalidade, você pode fazer manualmente pela interface.

## Próximos Passos

Após explorar o modo demo:

1. **Desative o modo demo** em Settings
2. **Limpe os dados demo** para começar do zero
3. **Cadastre suas instituições** financeiras reais
4. **Cadastre suas contas** bancárias e cartões
5. **Importe ou adicione transações** manualmente
6. **Configure orçamentos** e metas financeiras
7. **Explore os relatórios** com seus dados reais

---

**Dúvidas?** Consulte a [documentação completa](./README.md) ou abra uma issue no repositório.
