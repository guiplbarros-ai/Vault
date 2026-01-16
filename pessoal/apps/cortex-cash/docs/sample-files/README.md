# Arquivos de Exemplo para Importação

Esta pasta contém arquivos de exemplo que documentam os formatos de extratos suportados pelo Cortex Cash.

## Estrutura

```
sample-files/
├── banco/
│   ├── bradesco/
│   │   ├── extrato-corrente.csv
│   │   ├── extrato-corrente.ofx
│   │   └── formato-explicado.md
│   ├── inter/
│   ├── santander/
│   └── nubank/
├── cartao/
│   ├── amex/
│   │   ├── fatura-exemplo.csv
│   │   └── formato-explicado.md
│   ├── aeternum/
│   ├── bradesco-cartao/
│   └── nubank-cartao/
├── investimentos/
│   ├── clear/
│   ├── xp/
│   └── rico/
└── templates/
    └── template-mapping.json
```

## Como Usar

1. Coloque seus arquivos de exemplo **anonimizados** nas pastas correspondentes
2. Crie um arquivo `formato-explicado.md` para cada instituição documentando:
   - Separador usado (`,`, `;`, `\t`)
   - Codificação (UTF-8, ISO-8859-1)
   - Linha onde começa o cabeçalho
   - Colunas presentes e seus significados
   - Peculiaridades (valores com vírgula, datas em formatos específicos, etc.)
   - Exemplos de descrições típicas

## Formato do Arquivo de Documentação

Veja `banco/bradesco/formato-explicado.md` como exemplo de documentação completa.

## Dados Sensíveis

⚠️ **IMPORTANTE**: Sempre anonimize seus dados antes de colocar nesta pasta:
- Substitua valores reais por valores fictícios
- Mantenha apenas a estrutura e padrões
- Remova informações pessoais (nomes, CPF, endereços, etc.)
