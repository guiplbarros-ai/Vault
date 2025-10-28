# Documentação - Cortex Cash

## Estrutura de Documentação

```
docs/
├── README.md (este arquivo)
├── data-architecture/
│   ├── VERSIONING_STRATEGY.md    # Roadmap completo de versões
│   └── DATA_MODEL.md              # Modelo de dados detalhado
└── sample-files/
    ├── README.md
    ├── banco/
    │   ├── bradesco/
    │   │   └── formato-explicado.md
    │   ├── inter/
    │   ├── santander/
    │   └── nubank/
    ├── cartao/
    │   ├── amex/
    │   ├── aeternum/
    │   ├── bradesco-cartao/
    │   └── nubank-cartao/
    ├── investimentos/
    │   ├── clear/
    │   ├── xp/
    │   └── rico/
    └── templates/
```

---

## Documentos Principais

### 📘 [PRD - Product Requirements Document](../Cortex%20Cash%20PRD.md)
Documento mestre do produto com:
- Visão e objetivos
- Roadmap de versões (v0.1 → v3.0)
- Escopo de cada versão
- Decisões de produto
- UX/UI guidelines
- Análise de formatos de arquivo

### 📐 [Estratégia de Versionamento](./data-architecture/VERSIONING_STRATEGY.md)
Detalhamento completo de como o projeto evolui:
- **v0.1**: MVP local, single-user, sem auth
- **v0.2**: Classificação manual com categorias
- **v0.3**: Regras e IA
- **v1.0**: Multi-usuário com Supabase e RLS
- **v1.1**: Cartões, faturas e parceladas
- **v1.2**: Orçamento completo
- **v2.0**: Mobile
- **v3.0**: Open Finance

Inclui:
- Schema SQL completo de cada versão
- Scripts de migração entre versões
- Considerações de performance
- Exemplos de código

### 📊 [Modelo de Dados](./data-architecture/DATA_MODEL.md)
Documentação técnica do banco de dados:
- Diagrama ER
- Schema SQL (SQLite v0.x e PostgreSQL v1.0+)
- Índices e otimizações
- Queries comuns
- Estratégias de backup
- Validações e constraints

### 📁 [Formatos de Arquivo](./sample-files/README.md)
Guia dos formatos de extrato suportados:
- Estrutura de cada instituição
- Exemplos anonimizados
- Documentação de formato
- Peculiaridades e edge cases

---

## Fluxo de Desenvolvimento

### 1. Planejamento (Você está aqui ✓)
- [x] PRD definido
- [x] Roadmap de versões criado
- [x] Arquitetura de dados planejada
- [x] Estrutura de pastas criada

### 2. v0.1 - Setup e Importação
**Próximos Passos**:
1. Setup do projeto Next.js
2. Configurar SQLite local (sql.js ou Dexie.js)
3. Implementar schema v0.1
4. Criar tela de importação
5. Parser CSV/OFX
6. Preview e confirmação
7. Dashboard básico

**Referências**:
- Schema: `docs/data-architecture/DATA_MODEL.md` seção v0.1
- Formatos: `docs/sample-files/banco/bradesco/formato-explicado.md`

### 3. v0.2 - Categorias
1. Adicionar tabela `categorias`
2. Seed de categorias padrão
3. UI de classificação manual
4. Dashboard por categoria

### 4. v0.3 - Regras e IA
1. Motor de regras
2. Integração OpenAI
3. Painel de custos
4. Explicabilidade

### 5. v1.0 - Supabase
1. Setup Supabase
2. Implementar Auth
3. Migrar schema com RLS
4. Script de migração de dados
5. Realtime sync

---

## Como Usar Esta Documentação

### Para Desenvolvimento de Features

1. **Consulte o PRD** para entender o contexto e objetivos
2. **Veja o VERSIONING_STRATEGY** para saber em qual versão a feature entra
3. **Consulte o DATA_MODEL** para entender a estrutura de dados
4. **Use os sample-files** para testar importação com dados reais

### Para Migração Entre Versões

1. **Leia VERSIONING_STRATEGY** seção da versão alvo
2. **Execute o script de migração** fornecido
3. **Valide dados migrados** com queries de checagem
4. **Faça backup** antes de qualquer migração

### Para Adicionar Nova Instituição

1. Vá para `docs/sample-files/<tipo>/<instituicao>/`
2. Coloque arquivo de exemplo **anonimizado**
3. Crie `formato-explicado.md` seguindo o modelo do Bradesco
4. Documente:
   - Separador e encoding
   - Linha de cabeçalho
   - Formato de data e valores
   - Colunas presentes
   - Padrões comuns de descrição
   - Edge cases

---

## Convenções de Documentação

### Markdown
- Use títulos semânticos (# para principal, ## para seções)
- Code blocks com syntax highlighting
- Tabelas para dados estruturados
- Diagramas ASCII para ERs simples
- Links relativos entre documentos

### SQL
- Uppercase para palavras-chave SQL
- snake_case para nomes
- Comentários inline para lógica complexa
- Exemplos de dados sempre anonimizados

### Versionamento
- Versões seguem `v[MAJOR].[MINOR]` (ex: v0.1, v1.0)
- Breaking changes = MAJOR
- Features novas = MINOR
- Bugfixes = mantém versão

---

## Contribuindo

### Adicionando Documentação

1. Coloque no diretório apropriado
2. Atualize este README se criar nova seção
3. Use linguagem clara e objetiva
4. Inclua exemplos quando relevante
5. Mantenha consistência com docs existentes

### Atualizando PRD

- PRD é o documento mestre
- Mudanças significativas devem ser refletidas no PRD
- Use versionamento de seções se necessário
- Marque seções obsoletas claramente

### Documentando Formatos de Arquivo

- Sempre anonimize dados
- Documente **todas** as colunas
- Inclua edge cases
- Forneça exemplos de heurísticas de classificação

---

## Recursos Externos

### Tecnologias
- [Next.js 14](https://nextjs.org/docs)
- [sql.js](https://sql.js.org/) - SQLite em WASM
- [Supabase](https://supabase.com/docs) - PostgreSQL + Auth + Storage
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

### Padrões
- [OFX Specification](https://www.ofx.net/)
- [Open Finance Brasil](https://openfinancebrasil.org.br/)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) - Datas e timestamps
- [RFC 4122](https://www.rfc-editor.org/rfc/rfc4122) - UUIDs

---

## FAQ

### Por que começar local (v0.1) e não direto no Supabase?

**Resposta**: Desenvolvimento iterativo e validação rápida. A v0.1 permite:
- Testar importação e parser sem overhead de auth
- Validar UX sem latência de rede
- Iterar rapidamente sem custos de infra
- Aprender o domínio antes de complexidade de multi-user

### Como garantir compatibilidade entre versões?

**Resposta**: Campos preparados e migrations:
- Schema v0.1 já tem colunas para features futuras (null inicialmente)
- Migrations são aditivas, não destrutivas
- Scripts de migração testados entre cada versão
- Validação de integridade pós-migração

### Posso pular versões (ex: ir direto para v1.0)?

**Resposta**: Não recomendado, mas possível:
- Cada versão adiciona complexidade
- Testar features isoladamente é mais fácil
- Mas se você já conhece bem o domínio, pode consolidar v0.x

### Como testar migração v0.3 → v1.0 sem perder dados?

**Resposta**:
1. Export completo do SQLite (`db.export()`)
2. Salvar em arquivo local
3. Testar migração em ambiente de dev Supabase
4. Validar todos os dados
5. Só então fazer em produção (mesmo sendo single-user)

---

## Status da Documentação

- ✅ PRD completo
- ✅ Roadmap de versões definido
- ✅ Modelo de dados v0.1-v1.0
- ✅ Estrutura de sample-files
- ✅ Exemplo de formato (Bradesco)
- ⏳ Documentar demais instituições (Inter, Santander, Amex, Aeternum)
- ⏳ Criar seeds de categorias
- ⏳ Documentar API de classificação IA
- ⏳ Guia de deploy (v1.0+)

---

## Contato

Para dúvidas sobre a documentação ou sugestões de melhoria, abra uma issue ou entre em contato com o PO (Guilherme).
