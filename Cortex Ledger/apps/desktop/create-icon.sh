#!/bin/bash

# Script para criar um ícone básico para macOS
# Cria uma pasta iconset e converte para icns

mkdir -p icon.iconset

# Cria um ícone SVG simples
cat > temp-icon.svg << 'EOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(59,130,246);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(147,51,234);stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Fundo com gradiente -->
  <rect width="512" height="512" rx="115" fill="url(#grad1)"/>

  <!-- Letra "C" estilizada -->
  <path d="M 256 120 A 136 136 0 0 1 392 256 A 136 136 0 0 1 256 392"
        stroke="white"
        stroke-width="45"
        fill="none"
        stroke-linecap="round"/>

  <!-- Detalhes decorativos -->
  <circle cx="360" cy="200" r="12" fill="white" opacity="0.8"/>
  <circle cx="340" cy="320" r="8" fill="white" opacity="0.6"/>

  <!-- Linha decorativa inferior -->
  <rect x="180" y="420" width="152" height="6" rx="3" fill="white" opacity="0.7"/>
</svg>
EOF

# Verifica se o sips está disponível (ferramenta nativa do macOS)
if command -v sips &> /dev/null; then
    # Cria as diferentes resoluções necessárias para o icns
    sips -s format png -z 16 16 temp-icon.svg --out icon.iconset/icon_16x16.png
    sips -s format png -z 32 32 temp-icon.svg --out icon.iconset/icon_16x16@2x.png
    sips -s format png -z 32 32 temp-icon.svg --out icon.iconset/icon_32x32.png
    sips -s format png -z 64 64 temp-icon.svg --out icon.iconset/icon_32x32@2x.png
    sips -s format png -z 128 128 temp-icon.svg --out icon.iconset/icon_128x128.png
    sips -s format png -z 256 256 temp-icon.svg --out icon.iconset/icon_128x128@2x.png
    sips -s format png -z 256 256 temp-icon.svg --out icon.iconset/icon_256x256.png
    sips -s format png -z 512 512 temp-icon.svg --out icon.iconset/icon_256x256@2x.png
    sips -s format png -z 512 512 temp-icon.svg --out icon.iconset/icon_512x512.png
    sips -s format png -z 1024 1024 temp-icon.svg --out icon.iconset/icon_512x512@2x.png

    # Converte o iconset para icns
    iconutil -c icns icon.iconset -o icon.icns

    echo "Ícone criado com sucesso: icon.icns"
else
    echo "ERRO: sips não encontrado. Esta ferramenta é necessária no macOS."
    exit 1
fi

# Limpa arquivos temporários
rm -rf icon.iconset temp-icon.svg
