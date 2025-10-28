'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useRequireGuest } from '@/hooks/use-require-guest'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

export default function LoginPage() {
  const { signIn } = useAuth()
  const { showToast } = useToast()
  const { initialized } = useRequireGuest() // Redireciona se já autenticado
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Não renderiza até verificar autenticação
  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-graphite-950">
        <div className="text-center">
          <div className="mb-4 mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
          <p className="text-sm text-slate-600 dark:text-graphite-300">Carregando...</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        showToast({
          type: 'error',
          title: 'Erro ao fazer login',
          message: error.message,
        })
        setLoading(false)
      } else {
        // Login bem-sucedido - redireciona
        console.log('✅ Redirecionando para /home')
        router.replace('/home')
      }
    } catch (err) {
      console.error('❌ Erro inesperado:', err)
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'Ocorreu um erro inesperado. Tente novamente.',
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-graphite-950 px-4 py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-xl2 md:grid-cols-2 shadow-card dark:shadow-cardDark">
        {/* Painel ilustrativo (lado esquerdo) */}
        <div className="relative hidden md:block bg-brand-600 p-10">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-center text-[color:var(--brand-contrast)]">
            <div className="mb-6 flex items-center gap-3">
              <img src="/icon-64x64.png" alt="Cortex Ledger" className="h-10 w-10 rounded-lg" />
              <h1 className="text-2xl font-bold">Cortex Ledger</h1>
            </div>
            <h2 className="text-3xl font-bold">Bem-vindo de volta!</h2>
            <p className="mt-3 max-w-sm opacity-90">
              Controle financeiro local-first com IA. Importação inteligente, categorização
              automática e relatórios claros.
            </p>

            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> Importação CSV/OFX
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> Regras e categorias
                automáticas
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> Relatórios elegantes
              </li>
            </ul>
          </div>
        </div>

        {/* Formulário (lado direito) */}
        <div className="bg-white dark:bg-graphite-800 p-8 md:p-12 border-l border-slate-200 dark:border-graphite-700">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 text-center md:hidden">
              <img src="/icon-64x64.png" alt="Cortex Ledger" className="mx-auto h-10 w-10" />
              <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-graphite-100">Cortex Ledger</h1>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-graphite-100">Entrar</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-graphite-300">
              Digite seu email e senha para acessar sua conta
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-graphite-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-slate-50 dark:bg-graphite-900 border-slate-300 dark:border-graphite-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-graphite-200">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-slate-50 dark:bg-graphite-900 border-slate-300 dark:border-graphite-600"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 text-slate-600 dark:text-graphite-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 dark:border-graphite-600 text-brand-600 focus:ring-2 focus:ring-brand-400 focus:ring-offset-0"
                  />
                  Lembrar-me
                </label>
                <Link href="/forgot-password" className="text-brand-600 hover:text-brand-700 transition-colors">
                  Esqueci minha senha
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-slate-600 dark:text-graphite-300">
              Não tem uma conta?{' '}
              <Link href="/signup" className="text-brand-600 hover:text-brand-700 transition-colors">
                Criar conta
              </Link>
            </div>

            <div className="mt-6 text-center text-xs">
              <p className="text-slate-600 dark:text-graphite-300">Contas de teste:</p>
              <div className="mt-2 space-y-1">
                <p className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-graphite-700 text-slate-700 dark:text-graphite-200 inline-block text-xs">
                  alice@exemplo.com / senha123
                </p>
                <br />
                <p className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-graphite-700 text-slate-700 dark:text-graphite-200 inline-block text-xs">
                  bob@exemplo.com / senha123
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
