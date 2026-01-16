# PWA Icons - Cortex Cash

## Status
⚠️ **PLACEHOLDER ICONS** - Os ícones atuais são placeholders e devem ser substituídos pelo logo real do Cortex Cash.

## Arquivos Necessários
- `icon-192.png` - Ícone 192x192px (necessário)
- `icon-512.png` - Ícone 512x512px (necessário)
- `icon.svg` - Arquivo SVG fonte (criado)

## Como Gerar os Ícones PNG

### Opção 1: Usando Ferramentas Online (Mais Fácil)
1. Acesse https://www.svgtopng.com/
2. Upload o arquivo `icon.svg`
3. Gere PNG em duas resoluções:
   - 192x192px → salve como `icon-192.png`
   - 512x512px → salve como `icon-512.png`
4. Salve os arquivos nesta pasta (`public/`)

### Opção 2: Usando Figma/Adobe Illustrator
1. Abra `icon.svg` no Figma ou Illustrator
2. Substitua pelo logo real do Cortex Cash
3. Exporte em duas resoluções:
   - 192x192px → `icon-192.png`
   - 512x512px → `icon-512.png`

### Opção 3: Usando ImageMagick (Command Line)
```bash
# Instalar ImageMagick (se não tiver)
brew install imagemagick

# Converter SVG para PNG
convert icon.svg -resize 192x192 icon-192.png
convert icon.svg -resize 512x512 icon-512.png
```

## Design Guidelines

### Cores
- Primary: #18B0A4 (Teal)
- Background: #0f172a (Dark Blue)
- Accent: #1AD4C4 (Light Teal)

### Recomendações
- Use o logo oficial do Cortex Cash
- Mantenha margens (safe area de 10%)
- Teste em diferentes fundos (claro e escuro)
- Garanta boa visibilidade em tamanhos pequenos

## Verificação
Após gerar os ícones, verifique:
- [ ] `icon-192.png` existe e tem 192x192px
- [ ] `icon-512.png` existe e tem 512x512px
- [ ] Os ícones aparecem corretamente no manifest
- [ ] PWA instala corretamente no mobile

## Manifestos Relacionados
- `/public/manifest.json` - Referencia os ícones
- `/app/layout.tsx` - Metadata PWA
