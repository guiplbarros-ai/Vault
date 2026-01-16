# Assets do Cortex Cash

Esta pasta contém todos os recursos visuais da aplicação.

## Estrutura de Pastas

```
public/assets/
├── icons/          # Ícones da aplicação (favicon, app icons)
├── images/         # Imagens gerais (ilustrações, etc)
├── logos/          # Logotipos (Cortex Cash, instituições)
└── backgrounds/    # Imagens de fundo
```

## Organização

### `/icons`
- `favicon.ico` - Favicon do site
- `icon-192.png` - Ícone PWA 192x192
- `icon-512.png` - Ícone PWA 512x512
- `apple-touch-icon.png` - Ícone para iOS

### `/images`
- Imagens ilustrativas
- Gráficos decorativos
- Imagens de placeholder

### `/logos`
- `cortex-cash-logo.svg` - Logo principal
- `cortex-cash-logo-white.svg` - Logo versão branca
- Logos de bancos e instituições (Bradesco, Santander, etc)

### `/backgrounds`
- Imagens de fundo para telas específicas
- Padrões e texturas

## Como Usar

No código Next.js, referencie os assets assim:

```tsx
import Image from 'next/image'

// Imagem estática
<Image
  src="/assets/logos/cortex-cash-logo.svg"
  alt="Cortex Cash"
  width={200}
  height={50}
/>

// Como background via CSS
<div style={{ backgroundImage: 'url(/assets/backgrounds/pattern.svg)' }}>
```

## Formatos Recomendados

- **Logos**: SVG (vetorial, escalável)
- **Ícones**: PNG com transparência ou SVG
- **Imagens**: WebP ou PNG otimizado
- **Backgrounds**: SVG para padrões, WebP para fotos

## Otimização

Antes de adicionar imagens:
1. Comprima usando TinyPNG ou Squoosh
2. Use WebP quando possível
3. Mantenha logos em SVG
4. Tamanhos recomendados:
   - Favicon: 32x32, 16x16
   - PWA icons: 192x192, 512x512
   - Logos: até 1000px de largura
   - Backgrounds: máximo 2000px

## Cores do Tema

Para referência ao criar assets:

- **Primary**: `#d4af37` (Dourado)
- **Accent**: `#2d9b9b` (Teal)
- **Background**: `#0a1f2e` (Azul escuro)
- **Foreground**: `#e8dcc4` (Bege claro)
