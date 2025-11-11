'use client';

/**
 * Página de Login
 * Agent CORE: Sistema de Autenticação
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, senha });
      router.push('/'); // Redireciona para dashboard
    } catch (err: any) {
      console.error('Erro ao fazer login:', err);

      // Usa a mensagem de erro do serviço se disponível, senão usa genérica
      if (err.message) {
        setError(err.message);
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, #152821 0%, #111f1c 40%, #0e1c19 70%, #0a1512 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <Card
        className="w-full max-w-md"
        style={{
          backgroundColor: '#1a362f',
          border: '1px solid #2d5247',
          borderRadius: '18px',
          boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.3)',
        }}
      >
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="Cortex Cash"
              className="h-16 w-16 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold" style={{ color: '#F7FAF9' }}>
            Bem-vindo de volta
          </CardTitle>
          <CardDescription style={{ color: '#BBC5C2' }}>
            Entre com seu email e senha para acessar sua conta
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert
                variant="destructive"
                style={{
                  backgroundColor: '#2e1f1f',
                  border: '1px solid #F07167',
                  borderRadius: '14px',
                }}
              >
                <AlertCircle className="h-4 w-4" style={{ color: '#F07167' }} />
                <AlertDescription style={{ color: '#F07167' }}>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: '#F7FAF9' }}>Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={isLoading}
                style={{
                  backgroundColor: '#13251f',
                  border: '1px solid #2d5247',
                  color: '#F7FAF9',
                  borderRadius: '10px',
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" style={{ color: '#F7FAF9' }}>Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                disabled={isLoading}
                style={{
                  backgroundColor: '#13251f',
                  border: '1px solid #2d5247',
                  color: '#F7FAF9',
                  borderRadius: '10px',
                }}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              style={{
                backgroundColor: '#3A8F6E',
                color: '#F7FAF9',
                borderRadius: '12px',
                border: 'none',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            <div className="text-sm text-center" style={{ color: '#94a8a1' }}>
              Não tem uma conta?{' '}
              <Link
                href="/register"
                className="hover:underline font-medium"
                style={{ color: '#8FCDBD' }}
              >
                Cadastre-se
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
