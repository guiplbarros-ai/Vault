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

export default function SignupPage() {
  const { signUp } = useAuth()
  const { showToast } = useToast()
  const { initialized } = useRequireGuest() // Redireciona se já autenticado
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

    if (password !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'As senhas não coincidem.',
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(email, password, name)

      if (error) {
        showToast({
          type: 'error',
          title: 'Erro ao criar conta',
          message: error.message,
        })
        setLoading(false)
      } else {
        showToast({
          type: 'success',
          title: 'Conta criada!',
          message: 'Você já pode fazer login.',
        })
        
        // Redireciona para login após cadastro bem-sucedido
        setTimeout(() => {
          router.replace('/login')
        }, 1500)
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
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl2 bg-white dark:bg-graphite-800 border border-slate-200 dark:border-graphite-700 p-8 md:p-12 shadow-card dark:shadow-cardDark">
          <div className="mb-6 text-center">
            <img src="/icon-64x64.png" alt="Cortex Ledger" className="mx-auto h-10 w-10" />
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-graphite-100">Cortex Ledger</h1>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-graphite-100">Criar conta</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-graphite-300">
            Preencha os campos abaixo para criar sua conta
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700 dark:text-graphite-200">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

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
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-graphite-200">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-600 dark:text-graphite-300">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-brand-600 hover:text-brand-700 transition-colors">
              Fazer login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
