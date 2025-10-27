'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

export default function LoginPage() {
  const { signIn } = useAuth()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      showToast({
        type: 'error',
        title: 'Erro ao fazer login',
        message: error.message,
      })
      setLoading(false)
    } else {
      console.log('🚀 Login bem-sucedido! Redirecionando imediatamente...')
      // Redirect immediately
      window.location.href = '/'
    }
  }

  return (
    <div
      className="min-h-screen bg-bg px-4 py-14"
      style={{
        background:
          'radial-gradient(60% 45% at 50% 0%, rgba(40,31,32,0.08) 0%, rgba(0,0,0,0) 60%), linear-gradient(180deg, rgba(251,226,185,0.35) 0%, rgba(252,246,210,0.8) 60%)',
      }}
    >
      <div
        className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-2xl ring-1 ring-line/25 md:grid-cols-2"
        style={{
          boxShadow:
            '0 26px 70px rgba(40,31,32,0.28), 0 10px 28px rgba(40,31,32,0.14)',
          background:
            'linear-gradient(135deg, rgba(198,195,154,0.42) 0%, rgba(251,226,185,0.75) 100%)',
        }}
      >
        {/* Painel ilustrativo (lado esquerdo) */}
        <div className="relative hidden md:block bg-elev p-8">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-2xl" />
            <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-line/10 blur-2xl" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-center">
            <div className="mb-6 flex items-center gap-3">
              <img src="/icon-64x64.png" alt="Cortex Ledger" className="h-10 w-10 rounded-lg" />
              <h1 className="text-2xl font-bold text-text">Cortex Ledger</h1>
            </div>
            <h2 className="text-3xl font-bold text-text">Bem-vindo de volta!</h2>
            <p className="mt-3 max-w-sm text-muted">
              Controle financeiro local-first com IA. Importação inteligente, categorização
              automática e relatórios claros.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-text">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Importação CSV/OFX
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Regras e categorias
                automáticas
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Relatórios elegantes
              </li>
            </ul>
          </div>
        </div>

        {/* Formulário (lado direito) */}
        <div className="bg-elev p-7 md:p-12 md:border-l md:border-line/25">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 text-center md:hidden">
              <img src="/icon-64x64.png" alt="Cortex Ledger" className="mx-auto h-10 w-10" />
              <h1 className="mt-3 text-2xl font-bold text-text">Cortex Ledger</h1>
            </div>

            <h2 className="text-xl font-semibold text-text">Entrar</h2>
            <p className="mt-1 text-sm text-muted">
              Digite seu email e senha para acessar sua conta
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-surface border-line/25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-surface border-line/25"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 text-muted">
                  <input type="checkbox" className="h-4 w-4 rounded border-line/50" />
                  Lembrar-me
                </label>
                <Link href="#" className="text-brand hover:underline">
                  Esqueci minha senha
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading} loading={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              Não tem uma conta?{' '}
              <Link href="/signup" className="text-brand hover:underline">
                Criar conta
              </Link>
            </div>

            <div className="mt-6 text-center text-xs text-muted">
              <p>Contas de teste:</p>
              <p className="mt-1">alice@exemplo.com / senha123</p>
              <p>bob@exemplo.com / senha123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
