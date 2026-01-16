# Bradesco - Formato de Extrato

## Informações Gerais

- **Instituição**: Bradesco
- **Tipo**: Conta Corrente
- **Formatos Suportados**: CSV, OFX

---

## Formato CSV

### Características Técnicas

- **Separador**: `;` (ponto e vírgula)
- **Codificação**: ISO-8859-1 (Latin-1)
- **Formato de Data**: `DD/MM/YYYY`
- **Formato de Número**: vírgula como separador decimal (ex: `1.234,56`)
- **Linha de Cabeçalho**: Geralmente linha 5-8 (após informações do cliente)

### Estrutura do Arquivo

```
BRADESCO
Ag: 1234-5 Conta: 12345-6
Cliente: NOME DO CLIENTE
Período: 01/08/2024 a 31/08/2024

Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
01/08/2024;PIX RECEBIDO FULANO DE TAL;123456;1.500,00;;5.234,56
02/08/2024;UBER *TRIP HELP.COM BR;789012;;45,30;5.189,26
```

### Colunas

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| `Data` | Data | Data da transação | `01/08/2024` |
| `Histórico` | Texto | Descrição da transação | `PIX RECEBIDO FULANO` |
| `Docto.` | Texto | Número do documento (opcional) | `123456` |
| `Crédito (R$)` | Número | Valor de entrada (se aplicável) | `1.500,00` |
| `Débito (R$)` | Número | Valor de saída (se aplicável) | `45,30` |
| `Saldo (R$)` | Número | Saldo após transação | `5.189,26` |

### Normalização Necessária

1. **Data**: Converter `DD/MM/YYYY` → `YYYY-MM-DD`
2. **Valores**:
   - Converter vírgula para ponto decimal
   - Crédito = valor positivo
   - Débito = valor negativo
3. **Descrição**: Remover espaços extras e normalizar
4. **Tipo**: Inferir de palavras-chave:
   - PIX → Transferência
   - TED/DOC → Transferência
   - Compras com cartão → Débito
   - Juros/Tarifas → Encargo

### Padrões Comuns de Descrição

- `PIX RECEBIDO [NOME]` - Recebimento via PIX
- `PIX ENVIADO [NOME]` - Envio via PIX
- `TED [BANCO] [NOME]` - Transferência TED
- `DEB AUTOM [EMPRESA]` - Débito automático
- `TARIF [TIPO]` - Tarifas bancárias
- `PAGTO TITULO [NUM]` - Pagamento de boleto
- `REND POUPANÇA` - Rendimento
- `COMPRA CARTAO [FINAL]` - Compra no débito

---

## Formato OFX

### Características Técnicas

- **Versão**: OFX 1.0.2
- **Codificação**: UTF-8 ou ISO-8859-1
- **Formato de Data**: `YYYYMMDD` ou `YYYYMMDDHHMMSS`
- **Formato de Número**: ponto como separador decimal (ex: `1234.56`)

### Estrutura XML

```xml
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <CURDEF>BRL</CURDEF>
        <BANKACCTFROM>
          <BANKID>237</BANKID>
          <ACCTID>12345-6</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>20240801</DTSTART>
          <DTEND>20240831</DTEND>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20240802</DTPOSTED>
            <TRNAMT>-45.30</TRNAMT>
            <FITID>2024080212345</FITID>
            <NAME>UBER *TRIP HELP.COM BR</NAME>
            <MEMO>COMPRA</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
        <LEDGERBAL>
          <BALAMT>5189.26</BALAMT>
          <DTASOF>20240831</DTASOF>
        </LEDGERBAL>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
```

### Campos OFX

| Campo | Descrição | Mapeamento |
|-------|-----------|------------|
| `TRNTYPE` | Tipo da transação | `tipo` (DEBIT, CREDIT, etc.) |
| `DTPOSTED` | Data de lançamento | `data` |
| `TRNAMT` | Valor (+ ou -) | `valor` |
| `FITID` | ID único da transação | `id_externo` |
| `NAME` | Nome/descrição principal | `descricao` |
| `MEMO` | Descrição adicional | Concatenar com `NAME` |
| `CHECKNUM` | Número do cheque | `documento` |

### Tipos de Transação (TRNTYPE)

- `DEBIT` - Débito
- `CREDIT` - Crédito
- `PAYMENT` - Pagamento
- `CASH` - Saque
- `DIRECTDEP` - Depósito direto
- `DIRECTDEBIT` - Débito direto
- `INT` - Juros
- `DIV` - Dividendos
- `FEE` - Tarifa
- `SRVCHG` - Taxa de serviço
- `DEP` - Depósito
- `ATM` - Caixa eletrônico
- `POS` - Ponto de venda
- `XFER` - Transferência
- `CHECK` - Cheque
- `OTHER` - Outros

---

## Heurísticas de Classificação

### Transferências
- Descrições contendo: PIX, TED, DOC, TRANSF
- Pares com mesmo valor e ±1 dia

### Tarifas
- Descrições contendo: TARIF, TAXA, COBRANÇA, IOF, ANUIDADE

### Alimentação
- UBER EATS, IFOOD, RAPPI, restaurantes conhecidos

### Transporte
- UBER, 99, POSTO (gasolina), PEDÁGIO

### Assinaturas
- SPOTIFY, NETFLIX, AMAZON PRIME, etc.

---

## Exemplos de Transações Reais (Anonimizadas)

```csv
Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
01/08/2024;SALARIO MES 08/2024;001234;8.500,00;;8.500,00
02/08/2024;PIX ENVIADO ALUGUEL;001235;;2.300,00;6.200,00
03/08/2024;UBER *TRIP HELP.COM BR;001236;;32,50;6.167,50
03/08/2024;IFOOD *IFOOD.COM BR;001237;;65,80;6.101,70
05/08/2024;DEB AUTOM SPOTIFY;001238;;21,90;6.079,80
06/08/2024;TARIF PACOTE SERVICOS;001239;;29,90;6.049,90
10/08/2024;TED ENVIADA INVESTIMENTO;001240;;1.000,00;5.049,90
15/08/2024;PIX RECEBIDO FREELANCE;001241;1.500,00;;6.549,90
20/08/2024;COMPRA CARTAO 1234;001242;;850,00;5.699,90
25/08/2024;REND POUPANÇA;001243;15,45;;5.715,35
```

---

## Observações Importantes

1. **Linhas de Cabeçalho Variáveis**: O número de linhas antes do cabeçalho real pode variar
2. **Colunas Vazias**: Pode haver colunas "Unnamed" que devem ser ignoradas
3. **Saldo Inconsistente**: Às vezes o saldo reportado não bate com a matemática (usar com cuidado)
4. **Descrições Truncadas**: Algumas descrições são cortadas no CSV
5. **Caracteres Especiais**: Acentos e caracteres especiais podem ter problemas de encoding
