'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true

    // Inicializa sessão
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.error('❌ Erro ao obter sessão:', error)
        } else {
          console.log('🔑 Sessão inicializada:', { hasSession: !!session, userId: session?.user?.id })
        }

        setSession(session)
        setUser(session?.user ?? null)
      } catch (err) {
        console.error('❌ Erro crítico ao obter sessão:', err)
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      
      console.log('🔄 Auth state changed:', event, { hasSession: !!session, userId: session?.user?.id })
      
      setSession(session)
      setUser(session?.user ?? null)
      
      // Sempre marca como não loading quando há mudança de estado
      if (loading) {
        setLoading(false)
      }
      if (!initialized) {
        setInitialized(true)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔐 Iniciando login...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ Erro no login:', error)
        throw error
      }

      console.log('✅ Login bem-sucedido:', { userId: data.user?.id })
      
      // Atualiza estado imediatamente
      setSession(data.session)
      setUser(data.user)
      
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    try {
      console.log('📝 Iniciando cadastro...')
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: name,
          },
        },
      })

      if (error) {
        console.error('❌ Erro no cadastro:', error)
        throw error
      }

      console.log('✅ Cadastro bem-sucedido')
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Fazendo logout...')
      await supabase.auth.signOut()

      // Atualiza estado imediatamente
      setSession(null)
      setUser(null)

      console.log('✅ Logout bem-sucedido')
    } catch (error) {
      console.error('❌ Erro no logout:', error)
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      console.log('🔑 Enviando email de reset de senha...')
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        console.error('❌ Erro ao enviar email:', error)
        throw error
      }

      console.log('✅ Email de reset enviado')
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }, [])

  const value = useMemo(() => ({
    user,
    session,
    loading,
    initialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }), [user, session, loading, initialized, signIn, signUp, signOut, resetPassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
