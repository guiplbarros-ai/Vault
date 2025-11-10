'use client';

/**
 * Página de Promoção a Admin
 * Permite promover um usuário específico a administrador
 */

import { useEffect, useState } from 'react';
import { getDB } from '@/lib/db/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PromoteAdminPage() {
  const [email, setEmail] = useState('guilhermeplbarros@gmail.com');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const db = getDB();
      const allUsers = await db.usuarios.toArray();
      setUsers(allUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  }

  async function promoteToAdmin() {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Digite um email' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const db = getDB();

      // Buscar usuário por email
      const usuario = await db.usuarios
        .where('email')
        .equalsIgnoreCase(email.trim())
        .first();

      if (!usuario) {
        setMessage({ type: 'error', text: `Usuário com email ${email} não encontrado` });
        setLoading(false);
        return;
      }

      if (usuario.role === 'admin') {
        setMessage({ type: 'error', text: `${usuario.nome} já é admin` });
        setLoading(false);
        return;
      }

      // Promover a admin
      await db.usuarios.update(usuario.id, {
        role: 'admin',
        updated_at: new Date(),
      });

      setMessage({
        type: 'success',
        text: `✅ ${usuario.nome} promovido a administrador com sucesso!`,
      });

      // Recarregar lista
      await loadUsers();
    } catch (error) {
      console.error('Erro ao promover usuário:', error);
      setMessage({ type: 'error', text: 'Erro ao promover usuário' });
    } finally {
      setLoading(false);
    }
  }

  async function demoteFromAdmin(userId: string) {
    setLoading(true);
    setMessage(null);

    try {
      const db = getDB();
      const usuario = await db.usuarios.get(userId);

      if (!usuario) {
        setMessage({ type: 'error', text: 'Usuário não encontrado' });
        setLoading(false);
        return;
      }

      await db.usuarios.update(userId, {
        role: 'user',
        updated_at: new Date(),
      });

      setMessage({
        type: 'success',
        text: `${usuario.nome} removido de administrador`,
      });

      await loadUsers();
    } catch (error) {
      console.error('Erro ao remover admin:', error);
      setMessage({ type: 'error', text: 'Erro ao remover admin' });
    } finally {
      setLoading(false);
    }
  }

  const adminUsers = users.filter((u) => u.role === 'admin');
  const regularUsers = users.filter((u) => u.role === 'user');

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciar Administradores</h1>
        <p className="text-muted-foreground">Promover usuários a administradores do sistema</p>
      </div>

      {/* Promover Usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Promover a Administrador
          </CardTitle>
          <CardDescription>Digite o email do usuário para promover a admin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email do Usuário</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button onClick={promoteToAdmin} disabled={loading} className="w-full">
            {loading ? 'Processando...' : 'Promover a Administrador'}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Admins */}
      <Card>
        <CardHeader>
          <CardTitle>Administradores Atuais ({adminUsers.length})</CardTitle>
          <CardDescription>Usuários com privilégios de administrador</CardDescription>
        </CardHeader>
        <CardContent>
          {adminUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum administrador cadastrado</p>
          ) : (
            <div className="space-y-3">
              {adminUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{user.nome}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => demoteFromAdmin(user.id)}
                      disabled={loading}
                    >
                      Remover Admin
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Usuários Regulares */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Regulares ({regularUsers.length})</CardTitle>
          <CardDescription>Usuários sem privilégios administrativos</CardDescription>
        </CardHeader>
        <CardContent>
          {regularUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário regular</p>
          ) : (
            <div className="space-y-3">
              {regularUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{user.nome}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">User</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmail(user.email);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Promover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-blue-600 dark:text-blue-400">
            ℹ️ Sobre Permissões de Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• Administradores têm acesso a todas as funcionalidades do sistema</li>
            <li>• Podem visualizar dados de todos os usuários</li>
            <li>• Têm acesso a páginas administrativas (como Dev Tools)</li>
            <li>• Podem promover/remover outros administradores</li>
            <li>• Esta é uma configuração permanente até ser revertida</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
