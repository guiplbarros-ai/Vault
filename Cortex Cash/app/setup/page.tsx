'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/app/providers/auth-provider';
import { usuarioService } from '@/lib/services/usuario.service';
import { authService } from '@/lib/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SetupPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      setLoading(true);
      const adminExists = await usuarioService.hasAdmin();
      setHasAdmin(adminExists);

      // Se já tem admin e usuário está logado, redireciona
      if (adminExists && user) {
        router.push('/');
      }
    } catch (error) {
      console.error('Erro ao verificar admin:', error);
      toast.error('Erro ao verificar sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.nome || !formData.email || !formData.senha || !formData.confirmarSenha) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (formData.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setSubmitting(true);

    try {
      // Registra o primeiro usuário
      await authService.register({
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
      });

      // Promove a admin usando o usuarioService
      const usuario = await usuarioService.getUsuarioByEmail(formData.email);
      if (usuario) {
        await usuarioService.updateUsuario(usuario.id, { role: 'admin' });
      }

      toast.success('Usuário admin criado com sucesso!');

      // Faz login automático
      await login({ email: formData.email, senha: formData.senha });

      // Redireciona para o dashboard
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (error: any) {
      console.error('Erro ao criar admin:', error);
      toast.error(error.message || 'Erro ao criar usuário admin');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, #152821 0%, #111f1c 40%, #0e1c19 70%, #0a1512 100%)',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: '#3A8F6E' }} />
          <p style={{ color: '#BBC5C2' }}>Verificando sistema...</p>
        </div>
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
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
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div
                className="p-4 rounded-full"
                style={{ backgroundColor: '#1a3329' }}
              >
                <CheckCircle className="h-12 w-12" style={{ color: '#5FC883' }} />
              </div>
            </div>
            <CardTitle className="text-2xl" style={{ color: '#F7FAF9' }}>Sistema Configurado</CardTitle>
            <CardDescription style={{ color: '#BBC5C2' }}>
              O sistema já possui um administrador configurado.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              onClick={() => router.push('/')}
              style={{
                backgroundColor: '#3A8F6E',
                color: '#F7FAF9',
                borderRadius: '12px',
                border: 'none',
              }}
            >
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
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
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-20 h-20 relative">
              <Image
                src="/logo.png"
                alt="Cortex Cash"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl" style={{ color: '#F7FAF9' }}>Configuração Inicial</CardTitle>
          <CardDescription style={{ color: '#BBC5C2' }}>
            Crie o primeiro usuário administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" style={{ color: '#F7FAF9' }}>Nome Completo</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome completo"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                disabled={submitting}
                required
                style={{
                  backgroundColor: '#13251f',
                  border: '1px solid #2d5247',
                  color: '#F7FAF9',
                  borderRadius: '10px',
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: '#F7FAF9' }}>Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={submitting}
                required
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
                placeholder="Mínimo 6 caracteres"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                disabled={submitting}
                required
                minLength={6}
                style={{
                  backgroundColor: '#13251f',
                  border: '1px solid #2d5247',
                  color: '#F7FAF9',
                  borderRadius: '10px',
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha" style={{ color: '#F7FAF9' }}>Confirmar Senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                placeholder="Digite a senha novamente"
                value={formData.confirmarSenha}
                onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                disabled={submitting}
                required
                minLength={6}
                style={{
                  backgroundColor: '#13251f',
                  border: '1px solid #2d5247',
                  color: '#F7FAF9',
                  borderRadius: '10px',
                }}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              style={{
                backgroundColor: '#3A8F6E',
                color: '#F7FAF9',
                borderRadius: '12px',
                border: 'none',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Administrador'
              )}
            </Button>
          </form>

          <div
            className="mt-6 p-4 rounded-lg"
            style={{
              backgroundColor: '#152b26',
              border: '1px solid #2d5247',
              borderRadius: '14px',
            }}
          >
            <p className="text-xs" style={{ color: '#94a8a1' }}>
              Este será o primeiro usuário do sistema com privilégios de administrador.
              Você poderá criar mais usuários posteriormente através das configurações.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
