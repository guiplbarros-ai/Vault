#!/bin/bash
# Hook para validar que secrets não estão sendo commitados

# Padrões de secrets comuns
PATTERNS=(
    'OPENAI_API_KEY=[^$]'
    'ANTHROPIC_API_KEY=[^$]'
    'sk-[a-zA-Z0-9]{20,}'
    'password\s*=\s*["\047][^"\047]+'
    'secret\s*=\s*["\047][^"\047]+'
)

# Arquivos para verificar (do stdin se disponível)
FILES=""
if [ -t 0 ]; then
    # Não há input do stdin, verificar arquivos staged
    FILES=$(git diff --cached --name-only 2>/dev/null || echo "")
else
    # Ler do stdin
    while read -r file; do
        FILES="$FILES $file"
    done
fi

# Se não há arquivos, sair com sucesso
if [ -z "$FILES" ]; then
    exit 0
fi

FOUND_SECRETS=0

for pattern in "${PATTERNS[@]}"; do
    for file in $FILES; do
        if [ -f "$file" ]; then
            if grep -qE "$pattern" "$file" 2>/dev/null; then
                echo "⚠️  Possível secret encontrado em: $file"
                echo "    Padrão: $pattern"
                FOUND_SECRETS=1
            fi
        fi
    done
done

if [ $FOUND_SECRETS -eq 1 ]; then
    echo ""
    echo "❌ Secrets detectados! Use variáveis de ambiente em vez de hardcode."
    exit 1
fi

exit 0
