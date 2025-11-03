# Guia de Testes - Sistema de Backup/Restore

## Testes Automatizados

### Executar no Console do Navegador

1. Abra a aplicação em http://localhost:3000
2. Navegue até `/settings/backup`
3. Abra o DevTools (F12) e vá para o Console
4. Execute:
```javascript
// Importar e executar testes
import('/tests/backup.test').then(({ backupTests }) => backupTests.runAll());

// Ou use o helper global
testBackup();
```

5. Aguarde os resultados no console

### Resultados Esperados
✅ Todos os 6 testes devem passar:
- Export Database
- Validate Backup Structure
- Import with Replace Mode
- Import with Merge Mode
- Reject Invalid Backup
- Data Integrity Check

## Testes Manuais

### Teste 1: Export de Backup

**Objetivo:** Verificar que o backup é exportado corretamente

**Passos:**
1. Vá para `/settings/backup`
2. Clique em "Download Backup"
3. Um arquivo JSON deve ser baixado com nome `cortex-cash-backup-[timestamp].json`

**Verificações:**
- [ ] Arquivo foi baixado com sucesso
- [ ] Nome do arquivo contém timestamp
- [ ] Tamanho do arquivo > 0 bytes
- [ ] Arquivo pode ser aberto em editor de texto
- [ ] JSON é válido (estrutura legível)

---

### Teste 2: Validação de Backup

**Objetivo:** Verificar que backups inválidos são rejeitados

**Passos:**
1. Crie um arquivo `invalid-backup.json` com conteúdo inválido:
```json
{
  "invalid": "structure"
}
```
2. Vá para `/settings/backup`
3. Clique em "Select Backup File"
4. Selecione o arquivo inválido

**Resultado Esperado:**
- [ ] Sistema mostra erro de validação
- [ ] Mensagem explica o que está errado
- [ ] Botão "Import Backup" permanece desabilitado

---

### Teste 3: Preview de Backup

**Objetivo:** Verificar informações do backup antes de importar

**Passos:**
1. Exporte um backup válido (Teste 1)
2. Selecione esse backup para importar
3. Observe as informações exibidas

**Verificações:**
- [ ] Nome do arquivo aparece
- [ ] Tamanho do arquivo aparece
- [ ] Número de records aparece
- [ ] Data/timestamp do backup aparece
- [ ] Warnings (se houver) aparecem claramente

---

### Teste 4: Import de Backup (Replace Mode)

**⚠️ CUIDADO:** Este teste deleta todos os dados!

**Preparação:**
1. Exporte backup atual como segurança
2. Anote quantos registros existem no DB

**Passos:**
1. Selecione o backup exportado
2. Revise as informações
3. Clique em "Import Backup"
4. Aguarde conclusão

**Verificações:**
- [ ] Toast de sucesso aparece
- [ ] Mensagem mostra quantidade de records importados
- [ ] Página recarrega automaticamente
- [ ] Dados estão corretos após recarga
- [ ] Nenhum erro no console

---

### Teste 5: Import de Backup Parcial

**Objetivo:** Verificar merge mode (skip duplicates)

**Nota:** Este teste é mais complexo e requer modificação do código para forçar merge mode.

**Passos (conceitual):**
1. Adicione alguns dados novos manualmente
2. Importe backup antigo em modo merge
3. Verifique que dados novos não foram perdidos
4. Verifique que dados antigos não foram duplicados

---

### Teste 6: Clear All Data (Danger Zone)

**⚠️ EXTREMO CUIDADO:** Isso deleta TUDO permanentemente!

**Preparação:**
1. **OBRIGATÓRIO:** Exporte backup completo
2. **CONFIRME:** Backup está salvo e acessível

**Passos:**
1. Vá para `/settings/backup`
2. Role até "Danger Zone"
3. Clique em "Clear All Data"
4. Leia o warning
5. Clique em "Yes, Delete Everything"
6. Aguarde conclusão

**Verificações:**
- [ ] Confirmação foi solicitada (dois cliques necessários)
- [ ] Toast de sucesso aparece
- [ ] Página recarrega
- [ ] Dashboard mostra 0 transações/contas
- [ ] DB está completamente vazio

**Recuperação:**
1. Importe o backup feito na preparação
2. Verifique que todos os dados voltaram

---

## Cenários de Erro

### Cenário 1: Arquivo Corrompido

**Setup:**
1. Exporte backup válido
2. Abra o arquivo em editor
3. Delete caracteres aleatórios no meio
4. Salve

**Teste:**
- Tente importar o arquivo corrompido

**Resultado Esperado:**
- [ ] Erro de "Invalid JSON file" aparece
- [ ] Sistema não trava
- [ ] Dados existentes não são afetados

---

### Cenário 2: Backup de Versão Antiga

**Setup:**
1. Modifique um backup válido:
```json
{
  "metadata": {
    "version": "0.1",
    ...
  }
}
```

**Teste:**
- Tente importar

**Resultado Esperado:**
- [ ] Warning sobre diferença de versão
- [ ] Import ainda é permitido (backward compatibility)
- [ ] Dados são importados corretamente

---

### Cenário 3: Backup Muito Grande

**Setup:**
- Use banco de dados com 10k+ transações

**Teste:**
1. Tente exportar
2. Tente importar

**Verificações:**
- [ ] Export não trava o navegador
- [ ] Import mostra progresso
- [ ] Memória não estoura
- [ ] Dados são importados corretamente

---

## Checklist Final

Após todos os testes:

### Funcionalidade
- [ ] Export funciona sem erros
- [ ] Import (replace) funciona
- [ ] Import (merge) funciona
- [ ] Validação rejeita backups inválidos
- [ ] Clear all data funciona
- [ ] Preview mostra informações corretas

### UX
- [ ] Feedbacks visuais claros (toasts, alerts)
- [ ] Botões desabilitam durante operações
- [ ] Erros são mostrados de forma legível
- [ ] Confirmações pedidas para ações destrutivas
- [ ] Loading states aparecem quando necessário

### Segurança
- [ ] Nenhum dado sensível exposto em logs
- [ ] Backups não contêm senhas/tokens
- [ ] Confirmações duplas para ações perigosas
- [ ] Validação previne imports maliciosos

### Performance
- [ ] Export de 1k records < 2s
- [ ] Import de 1k records < 5s
- [ ] UI não trava durante operações
- [ ] Memória não vaza

---

## Relatório de Bugs

Se encontrar bugs, registre:
1. Qual teste falhou
2. Passos para reproduzir
3. Comportamento esperado vs atual
4. Screenshots/console errors
5. Dados do navegador (Chrome, Firefox, etc.)

---

## Notas

- Sempre mantenha um backup antes de testar imports
- Teste em ambiente de desenvolvimento primeiro
- Teste com diferentes volumes de dados
- Teste em diferentes navegadores
- Documente qualquer comportamento inesperado
