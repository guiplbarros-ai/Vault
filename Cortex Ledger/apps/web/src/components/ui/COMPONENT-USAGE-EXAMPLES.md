# Componentes Base - Exemplos de Uso

Este arquivo contém exemplos de uso dos componentes base refatorados segundo o UI-FRONTEND-GUIDE.md.

## Button

### Variantes

```tsx
import { Button } from '@/components/ui/button'

// Primary (default)
<Button>Salvar</Button>
<Button variant="primary">Salvar</Button>

// Secondary
<Button variant="secondary">Cancelar</Button>

// Ghost
<Button variant="ghost">Ver detalhes</Button>

// Destructive
<Button variant="destructive">Excluir</Button>

// Link
<Button variant="link">Saiba mais</Button>
```

### Tamanhos

```tsx
<Button size="sm">Pequeno</Button>
<Button size="default">Padrão</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><Icon /></Button>
```

### Estados

```tsx
<Button disabled>Desabilitado</Button>
<Button loading>Carregando...</Button>
```

## Input

### Básico

```tsx
import { Input } from '@/components/ui/input'

<Input
  placeholder="Digite seu email"
  type="email"
/>
```

### Com Label

```tsx
<Input
  label="Email"
  placeholder="Digite seu email"
  type="email"
/>
```

### Com Erro

```tsx
<Input
  label="Senha"
  type="password"
  error="Senha deve ter no mínimo 8 caracteres"
/>
```

### Com Helper Text

```tsx
<Input
  label="Email"
  helperText="Usaremos este email para notificações"
  type="email"
/>
```

### Required

```tsx
<Input
  label="Nome"
  required
  placeholder="Digite seu nome"
/>
```

## Card

### Variantes

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// Default (adapta ao tema)
<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo do card
  </CardContent>
</Card>

// Light (força light mode)
<Card variant="light">
  <CardContent>Sempre em light mode</CardContent>
</Card>

// Dark (força dark mode)
<Card variant="dark">
  <CardContent>Sempre em dark mode</CardContent>
</Card>
```

### Com Hover Effect

```tsx
<Card hover>
  <CardContent>Card com efeito hover</CardContent>
</Card>
```

### Estrutura Completa

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Dashboard</CardTitle>
    <CardDescription>Visão geral das suas finanças</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo principal */}
  </CardContent>
  <CardFooter>
    <Button>Ver mais</Button>
  </CardFooter>
</Card>
```

## Badge

### Variantes Semânticas

```tsx
import { Badge } from '@/components/ui/badge'

<Badge variant="success">Sucesso</Badge>
<Badge variant="warning">Atenção</Badge>
<Badge variant="error">Erro</Badge>
<Badge variant="info">Informação</Badge>
<Badge variant="insight">Insight</Badge>
<Badge variant="neutral">Neutro</Badge>
```

### Variantes de Orçamento

```tsx
// <80% - Saudável
<Badge variant="healthy">75%</Badge>

// ≥80% - Atenção
<Badge variant="attention">85%</Badge>

// ≥100% - Estourado
<Badge variant="exceeded">105%</Badge>
```

### Helper Function para Orçamento

```tsx
import { Badge, getBudgetBadgeVariant } from '@/components/ui/badge'

function BudgetBadge({ percentage }: { percentage: number }) {
  const variant = getBudgetBadgeVariant(percentage)

  return <Badge variant={variant}>{percentage}%</Badge>
}

// Uso
<BudgetBadge percentage={75} />  // verde (healthy)
<BudgetBadge percentage={85} />  // amarelo (attention)
<BudgetBadge percentage={105} /> // vermelho (exceeded)
```

## Select

### Select Nativo (HTML)

```tsx
import { Select } from '@/components/ui/select'

<Select>
  <option value="">Selecione uma categoria</option>
  <option value="alimentacao">Alimentação</option>
  <option value="transporte">Transporte</option>
  <option value="lazer">Lazer</option>
</Select>
```

### Select com Radix UI (Componente Rico)

```tsx
import {
  RadixSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

<RadixSelect>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Selecione uma categoria" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="alimentacao">Alimentação</SelectItem>
    <SelectItem value="transporte">Transporte</SelectItem>
    <SelectItem value="lazer">Lazer</SelectItem>
  </SelectContent>
</RadixSelect>
```

### Select com Grupos

```tsx
import {
  RadixSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from '@/components/ui/select'

<RadixSelect>
  <SelectTrigger>
    <SelectValue placeholder="Selecione" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Despesas</SelectLabel>
      <SelectItem value="alimentacao">Alimentação</SelectItem>
      <SelectItem value="transporte">Transporte</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Receitas</SelectLabel>
      <SelectItem value="salario">Salário</SelectItem>
      <SelectItem value="freelance">Freelance</SelectItem>
    </SelectGroup>
  </SelectContent>
</RadixSelect>
```

## Toast

### Setup

```tsx
// Em app/layout.tsx ou _app.tsx
import { ToastProvider } from '@/components/ui/toast'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
```

### Uso

```tsx
import { useToast } from '@/components/ui/toast'

function MyComponent() {
  const { showToast } = useToast()

  const handleSuccess = () => {
    showToast({
      type: 'success',
      title: 'Sucesso!',
      message: 'Transação salva com sucesso',
      duration: 5000
    })
  }

  const handleError = () => {
    showToast({
      type: 'error',
      message: 'Erro ao salvar transação',
      duration: 0 // Não fecha automaticamente
    })
  }

  const handleWarning = () => {
    showToast({
      type: 'warning',
      title: 'Atenção',
      message: 'Você está próximo do limite do orçamento',
    })
  }

  const handleInfo = () => {
    showToast({
      type: 'info',
      message: 'Dados sincronizados com sucesso',
    })
  }

  return (
    <div>
      <Button onClick={handleSuccess}>Success Toast</Button>
      <Button onClick={handleError}>Error Toast</Button>
      <Button onClick={handleWarning}>Warning Toast</Button>
      <Button onClick={handleInfo}>Info Toast</Button>
    </div>
  )
}
```

## Cores e Tokens

Todos os componentes utilizam os tokens definidos no UI-FRONTEND-GUIDE.md:

### Brand Colors
- `brand-600` (#12B5A2) - Ação primária
- `brand-700` (#0EA08F) - Hover primário
- `brand-400` (#63E0D1) - Focus ring
- `brand-100` (#E9FCFA) - Backgrounds suaves

### Neutral Colors (Light Mode)
- `slate-50` a `slate-900` - Neutros para light mode

### Neutral Colors (Dark Mode)
- `graphite-950` a `graphite-100` - Neutros para dark mode

### Semantic Colors
- Success: `success-100` (bg), `success-600` (text/border)
- Warning: `warning-100` (bg), `warning-600` (text/border)
- Error: `error-100` (bg), `error-600` (text/border)
- Info: `info-100` (bg), `info-600` (text/border)
- Insight: `insight-100` (bg), `insight-600` (text/border)

## Acessibilidade

Todos os componentes foram refatorados com foco em acessibilidade:

- **Focus Rings**: Todos os elementos interativos têm focus ring visível com `ring-brand-400`
- **Contraste**: Todas as combinações de cores atendem AA WCAG
- **Estados**: Hover, focus, active e disabled bem definidos
- **Tamanhos Mínimos**: Alvos de toque com no mínimo 36x36px

## Responsividade

Os componentes se adaptam automaticamente ao tema do sistema (light/dark) usando:
- Classes `dark:` do Tailwind
- CSS variables definidas no globals.css
- Suporte a `prefers-color-scheme`
