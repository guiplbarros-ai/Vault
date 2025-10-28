'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useRequireGuest } from '@/hooks/use-require-guest'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const { showToast } = useToast()
  const { initialized } = useRequireGuest()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

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
      const { error } = await resetPassword(email)

      if (error) {
        showToast({
          type: 'error',
          title: 'Erro ao enviar email',
          message: error.message,
        })
        setLoading(false)
      } else {
        setEmailSent(true)
        showToast({
          type: 'success',
          title: 'Email enviado!',
          message: 'Verifique sua caixa de entrada para redefinir sua senha.',
        })
        setLoading(false)
      }
    } catch (err) {
      console.error('Erro inesperado:', err)
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'Ocorreu um erro inesperado. Tente novamente.',
      })
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-graphite-950 px-4 py-16">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl2 bg-white dark:bg-graphite-800 border border-slate-200 dark:border-graphite-700 p-8 md:p-12 shadow-card dark:shadow-cardDark">
            <div className="mb-6 text-center">
              <img src="/icon-64x64.png" alt="Cortex Ledger" className="mx-auto h-10 w-10" />
              <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-graphite-100">Cortex Ledger</h1>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-slate-900 dark:text-graphite-100">Email enviado!</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-graphite-300">
                Enviamos um link de redefinição de senha para <strong>{email}</strong>.
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-graphite-300">
                Verifique sua caixa de entrada (e spam) e siga as instruções para criar uma nova senha.
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Voltar para login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-graphite-950 px-4 py-16">
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl2 bg-white dark:bg-graphite-800 border border-slate-200 dark:border-graphite-700 p-8 md:p-12 shadow-card dark:shadow-cardDark">
          <div className="mb-6 text-center">
            <img src="/icon-64x64.png" alt="Cortex Ledger" className="mx-auto h-10 w-10" />
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-graphite-100">Cortex Ledger</h1>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-graphite-100">Esqueceu sua senha?</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-graphite-300">
            Digite seu email e enviaremos um link para redefinir sua senha
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
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-600 dark:text-graphite-300">
            Lembrou sua senha?{' '}
            <Link href="/login" className="text-brand-600 hover:text-brand-700 transition-colors">
              Fazer login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
