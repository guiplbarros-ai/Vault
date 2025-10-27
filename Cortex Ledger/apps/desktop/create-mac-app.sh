#!/bin/bash

# Script para criar um aplicativo macOS simples que abre a aplicação no Chrome

APP_NAME="Cortex Ledger"
APP_DIR="$APP_NAME.app"
URL="http://localhost:3000"

echo "🚀 Criando aplicativo macOS: $APP_NAME"

# Remove app anterior se existir
rm -rf "$APP_DIR"

# Cria estrutura do app
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# Cria o Info.plist
cat > "$APP_DIR/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundleDisplayName</key>
    <string>$APP_NAME</string>
    <key>CFBundleIdentifier</key>
    <string>com.cortexledger.app</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>launch</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Cria o script de lançamento
cat > "$APP_DIR/Contents/MacOS/launch" << 'EOF'
#!/bin/bash

# URL da aplicação
URL="http://localhost:3000"

# Verifica se o servidor está rodando
if ! curl -s "$URL" > /dev/null 2>&1; then
    osascript -e 'display dialog "O servidor Next.js não está rodando!\n\nPor favor, execute:\npnpm dev:web" buttons {"OK"} default button "OK" with icon stop with title "Cortex Ledger"'
    exit 1
fi

# Abre no Chrome
if [ -d "/Applications/Google Chrome.app" ]; then
    open -a "Google Chrome" "$URL"
elif [ -d "/Applications/Chromium.app" ]; then
    open -a "Chromium" "$URL"
else
    # Fallback para navegador padrão
    open "$URL"
fi
EOF

# Torna o script executável
chmod +x "$APP_DIR/Contents/MacOS/launch"

# Copia o ícone
if [ -f "icon.icns" ]; then
    cp icon.icns "$APP_DIR/Contents/Resources/icon.icns"
    echo "✅ Ícone adicionado"
else
    echo "⚠️  Ícone não encontrado, criando um básico..."
    # Cria um ícone temporário se não existir
    ./create-icon.sh
    cp icon.icns "$APP_DIR/Contents/Resources/icon.icns"
fi

echo "✅ Aplicativo criado: $APP_DIR"
echo ""
echo "Para instalar:"
echo "  1. Arraste '$APP_DIR' para /Applications"
echo "  2. Ou execute: cp -r '$APP_DIR' /Applications/"
echo ""
echo "Para testar agora:"
echo "  open '$APP_DIR'"
