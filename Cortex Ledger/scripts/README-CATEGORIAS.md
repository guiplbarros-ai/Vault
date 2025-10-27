# Como Inserir as Categorias Padrão

Existem 3 formas de inserir as categorias no Cortex Ledger:

## Opção 1: Via Interface Web (Recomendado quando estiver pronta)

Quando a página de categorias estiver implementada, você poderá importar as categorias diretamente pela interface.

## Opção 2: Via Script Node.js (Após Login)

1. Faça login na aplicação web primeiro em http://localhost:3000/login
2. Execute o script:

```bash
cd "/Users/guilhermebarros/Documents/Coding/Cortex Ledger"
node scripts/seed-categorias.mjs
```

O script detectará automaticamente seu usuário logado e inserirá as categorias.

## Opção 3: Via SQL Editor do Supabase (Manual)

1. Obtenha seu User ID:
   - Acesse: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/auth/users
   - Copie o ID do seu usuário

2. Abra o SQL Editor:
   - Acesse: https://supabase.com/dashboard/project/xborrshstfcvzrxyqyor/sql/new

3. Abra o arquivo `supabase/seed-categorias.sql`

4. Substitua TODAS as ocorrências de `'SEU_USER_ID_AQUI'` pelo seu User ID real

5. Execute o SQL

## Categorias Incluídas

O seed inclui **~110 categorias** organizadas em **17 grupos**:

### Despesas (88 categorias):
- 🏠 **Moradia** (11): Aluguel, Condomínio, IPTU, Energia, Água, Gás, Internet, etc.
- 🍔 **Alimentação** (8): Supermercado, Feira, Restaurantes, Delivery, etc.
- 🚗 **Transporte** (10): Combustível, Uber, IPVA, Seguro, Manutenção, etc.
- 💊 **Saúde** (8): Plano de Saúde, Médico, Dentista, Farmácia, Academia, etc.
- 📚 **Educação** (6): Mensalidade, Cursos, Material Escolar, Livros, etc.
- 👕 **Vestuário** (4): Roupas, Calçados, Acessórios, Lavanderia
- 🎭 **Lazer** (9): Cinema, Viagens, Hotéis, Games, Streaming, etc.
- 💄 **Cuidados Pessoais** (4): Cabelo, Estética, Cosméticos, Perfumes
- 🐕 **Pets** (4): Alimentação Pet, Veterinário, Pet Shop, etc.
- 🏦 **Finanças** (9): Empréstimos, Cartão de Crédito, Seguros, Investimentos, etc.
- 💻 **Tecnologia** (4): Eletrônicos, Software, Cloud, Manutenção
- 👨‍👩‍👧 **Família** (5): Presentes, Festas, Babá, Pensão Alimentícia, etc.
- 💼 **Trabalho** (4): Material de Escritório, Equipamentos, etc.
- 💝 **Doações** (3): Caridade, Igreja, ONGs
- 📋 **Impostos** (3): IRPF, ISS, Outros
- ❓ **Outros** (2): Diversos, Não Categorizado

### Receitas (15 categorias):
- 💰 **Receitas**: Salário, Freelance, Bônus, 13º, Férias, PLR, Dividendos, Aluguel Recebido, Reembolso, Cashback, etc.

### Transferências (4 categorias):
- 🔄 **Transferências**: Entre Contas, Pagamento de Fatura, Aplicações/Resgates

## Personalização

Você pode:
- Desativar categorias que não usa (campo `ativa = false`)
- Adicionar novas categorias personalizadas
- Ajustar a ordem de exibição (campo `ordem`)
- Editar nomes para sua preferência

## Estrutura da Tabela

```sql
categoria (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  grupo text,
  nome text NOT NULL,
  ativa boolean DEFAULT true,
  ordem int DEFAULT 0,
  created_at timestamptz DEFAULT now()
)
```

## Troubleshooting

**Erro: "Usuário não autenticado"**
- Certifique-se de fazer login na aplicação web primeiro
- O script usa suas credenciais da sessão atual

**Erro: "duplicate key value"**
- Algumas categorias já foram inseridas
- O script filtra automaticamente categorias existentes

**Erro: "permission denied"**
- Verifique se as políticas RLS estão configuradas corretamente
- O user_id precisa corresponder ao auth.uid()
