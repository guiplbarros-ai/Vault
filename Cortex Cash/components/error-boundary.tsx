'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary component para capturar erros React
 *
 * Responsabilidade: Agent CORE (Infraestrutura)
 *
 * Features:
 * - Captura erros em componentes filhos
 * - UI elegante de erro
 * - Opção de retry
 * - Opção de voltar ao home
 * - Logs estruturados
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Atualizar state
    this.setState({
      error,
      errorInfo,
    })

    // Callback customizado
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log estruturado para debugging
    this.logError(error, errorInfo)
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    }

    // Em produção, você enviaria isso para um serviço de logging
    console.error('[ErrorBoundary] Detailed error log:', JSON.stringify(errorLog, null, 2))

    // Salvar no localStorage para análise posterior
    try {
      const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]')
      existingLogs.push(errorLog)
      // Manter apenas os últimos 10 erros
      const recentLogs = existingLogs.slice(-10)
      localStorage.setItem('error_logs', JSON.stringify(recentLogs))
    } catch (e) {
      console.error('Failed to save error log to localStorage:', e)
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  private handleGoHome = () => {
    this.handleReset()
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  public render() {
    if (this.state.hasError) {
      // Usar fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback
      }

      // UI padrão de erro
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card
            className="max-w-2xl w-full"
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
              borderColor: '#374151',
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-white text-xl">
                    Ops! Algo deu errado
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Encontramos um erro inesperado
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mensagem de erro */}
              <div
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                <p className="text-sm font-mono text-red-400 mb-2">
                  {this.state.error?.name}: {this.state.error?.message}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                  <details className="mt-3">
                    <summary className="text-xs text-white/50 cursor-pointer hover:text-white/70">
                      Stack trace (desenvolvimento)
                    </summary>
                    <pre className="text-xs text-white/50 mt-2 overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>

              {/* Sugestões */}
              <div className="space-y-2">
                <p className="text-white/70 text-sm font-semibold">O que você pode fazer:</p>
                <ul className="list-disc list-inside text-white/60 text-sm space-y-1">
                  <li>Tente atualizar a página</li>
                  <li>Verifique sua conexão com a internet</li>
                  <li>Limpe o cache do navegador</li>
                  <li>Se o problema persistir, entre em contato com o suporte</li>
                </ul>
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 text-white"
                  style={{
                    backgroundColor: '#18B0A4',
                    color: '#ffffff',
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                  style={{
                    borderColor: 'rgb(71, 85, 105)',
                    color: 'white',
                  }}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Voltar ao Início
                </Button>
              </div>

              {/* Info */}
              <p className="text-xs text-white/40 text-center pt-2">
                Este erro foi registrado automaticamente para análise
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
