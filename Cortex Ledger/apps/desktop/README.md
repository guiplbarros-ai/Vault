# Cortex Ledger - Aplicativo macOS

Aplicativo macOS simples que abre o Cortex Ledger no Chrome.

## O que faz

Este é um aplicativo nativo do macOS que:
- Aparece no Dock e no Launchpad com um ícone personalizado
- Quando clicado, verifica se o servidor Next.js está rodando
- Abre a aplicação no Google Chrome (ou navegador padrão)
- Não consome recursos quando não está em uso

## Como usar

### 1. Instalar o aplicativo

O aplicativo já foi instalado em `/Applications/Cortex Ledger.app`

Você pode encontrá-lo:
- No Launchpad
- Na pasta Applications do Finder
- Pesquisando no Spotlight (Cmd + Espaço)

### 2. Iniciar o servidor

Antes de abrir o aplicativo, inicie o servidor Next.js:

```bash
cd /Users/guilhermebarros/Documents/Coding/Cortex\ Ledger
pnpm dev:web
```

### 3. Abrir a aplicação

- Clique no ícone do Cortex Ledger no Dock/Launchpad
- Ou execute: `open "/Applications/Cortex Ledger.app"`

A aplicação será aberta no Chrome em `http://localhost:3000`

### 4. Adicionar ao Dock permanentemente

1. Abra o aplicativo uma vez
2. Clique com o botão direito no ícone do Dock
3. Selecione: Opções → Manter no Dock

## Recriar o aplicativo

Se precisar recriar o aplicativo com modificações:

```bash
cd apps/desktop
./create-mac-app.sh
cp -r "Cortex Ledger.app" /Applications/
```

## Personalizar

### Mudar o ícone

1. Substitua o arquivo `icon.icns` por um novo ícone
2. Execute `./create-mac-app.sh` novamente

### Mudar a URL

Edite o arquivo `create-mac-app.sh` e altere a linha:
```bash
URL="http://localhost:3000"
```

### Usar outro navegador

O script tenta usar o Chrome primeiro, mas você pode modificá-lo em `create-mac-app.sh`:
- Linha que começa com `if [ -d "/Applications/Google Chrome.app" ]`

## Estrutura do aplicativo

```
Cortex Ledger.app/
├── Contents/
│   ├── Info.plist          # Informações do aplicativo
│   ├── MacOS/
│   │   └── launch          # Script que abre o navegador
│   └── Resources/
│       └── icon.icns       # Ícone do aplicativo
```

## Troubleshooting

**Aplicativo não abre:**
- Verifique se o servidor está rodando: `curl http://localhost:3000`
- Execute: `pnpm dev:web` antes de abrir o app

**Erro de permissão:**
```bash
xattr -cr "/Applications/Cortex Ledger.app"
```

**Chrome não abre:**
- O script usa o navegador padrão se o Chrome não estiver instalado
- Você pode modificar o script para usar outro navegador
