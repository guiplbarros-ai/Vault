'use client';

/**
 * Página de Diagnóstico de Autenticação
 * Verifica usuários, sessão e associação de dados
 */

import { useEffect, useState } from 'react';
import { getDB } from '@/lib/db/client';
import { authService } from '@/lib/services/auth.service';
import { getCurrentUserId } from '@/lib/db/seed-usuarios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function AuthDiagnosticPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runDiagnostic() {
      try {
        const db = getDB();

        // 1. Verificar sessão atual
        const session = authService.getSession();
        const currentUser = await authService.getCurrentUser();
        const currentUserId = getCurrentUserId();

        // 2. Listar todos os usuários
        const allUsers = await db.usuarios.toArray();

        // 3. Contar dados por usuário
        const contasPorUsuario: Record<string, number> = {};
        const transacoesPorUsuario: Record<string, number> = {};
        const categoriasPorUsuario: Record<string, number> = {};

        const contas = await db.contas.toArray();
        const transacoes = await db.transacoes.toArray();
        const categorias = await db.categorias.toArray();

        for (const conta of contas) {
          if (conta.usuario_id) {
            contasPorUsuario[conta.usuario_id] = (contasPorUsuario[conta.usuario_id] || 0) + 1;
          }
        }

        for (const transacao of transacoes) {
          if (transacao.usuario_id) {
            transacoesPorUsuario[transacao.usuario_id] = (transacoesPorUsuario[transacao.usuario_id] || 0) + 1;
          }
        }

        for (const categoria of categorias) {
          if (categoria.usuario_id) {
            categoriasPorUsuario[categoria.usuario_id] = (categoriasPorUsuario[categoria.usuario_id] || 0) + 1;
          }
        }

        setData({
          session,
          currentUser,
          currentUserId,
          allUsers,
          contasPorUsuario,
          transacoesPorUsuario,
          categoriasPorUsuario,
          totalContas: contas.length,
          totalTransacoes: transacoes.length,
          totalCategorias: categorias.length,
        });
      } catch (error) {
        console.error('Erro no diagnóstico:', error);
        setData({ error: String(error) });
      } finally {
        setLoading(false);
      }
    }

    runDiagnostic();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Carregando diagnóstico...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Erro no Diagnóstico</CardTitle>
            <CardDescription>{data.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Diagnóstico de Autenticação</h1>
        <p className="text-muted-foreground">Verificação de usuário e associação de dados</p>
      </div>

      {/* Sessão Atual */}
      <Card>
        <CardHeader>
          <CardTitle>Sessão Atual</CardTitle>
          <CardDescription>Informações do usuário logado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.session ? (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">Sessão ativa</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm break-all">{data.session.userId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{data.session.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{data.session.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge>{data.session.role}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expira em</p>
                  <p className="text-sm">{new Date(data.session.expiresAt).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">getCurrentUserId()</p>
                  <p className="font-mono text-sm break-all">{data.currentUserId}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span>Nenhuma sessão ativa</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usuário Atual */}
      {data.currentUser && (
        <Card>
          <CardHeader>
            <CardTitle>Dados do Usuário no Banco</CardTitle>
            <CardDescription>Registro completo do usuário</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-mono text-sm break-all">{data.currentUser.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{data.currentUser.nome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{data.currentUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge>{data.currentUser.role}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={data.currentUser.ativo ? 'default' : 'destructive'}>
                  {data.currentUser.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tem senha_hash?</p>
                <Badge variant={data.currentUser.senha_hash ? 'default' : 'destructive'}>
                  {data.currentUser.senha_hash ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="text-sm">{new Date(data.currentUser.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Último acesso</p>
                <p className="text-sm">
                  {data.currentUser.ultimo_acesso
                    ? new Date(data.currentUser.ultimo_acesso).toLocaleString('pt-BR')
                    : 'Nunca'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Todos os Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Usuários ({data.allUsers.length})</CardTitle>
          <CardDescription>Lista completa de usuários no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.allUsers.map((user: any) => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{user.nome}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">{user.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={user.ativo ? 'default' : 'destructive'}>
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge>{user.role}</Badge>
                    {user.id === data.currentUserId && (
                      <Badge variant="outline" className="bg-primary/10">
                        Atual
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contas</p>
                    <p className="font-medium">{data.contasPorUsuario[user.id] || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Transações</p>
                    <p className="font-medium">{data.transacoesPorUsuario[user.id] || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Categorias</p>
                    <p className="font-medium">{data.categoriasPorUsuario[user.id] || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Banco de Dados</CardTitle>
          <CardDescription>Total de registros no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold">{data.totalContas}</p>
              <p className="text-sm text-muted-foreground">Total de Contas</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold">{data.totalTransacoes}</p>
              <p className="text-sm text-muted-foreground">Total de Transações</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold">{data.totalCategorias}</p>
              <p className="text-sm text-muted-foreground">Total de Categorias</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verificação Final */}
      <Card className={
        data.session && data.currentUser && data.currentUser.ativo
          ? 'border-green-500'
          : 'border-yellow-500'
      }>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data.session && data.currentUser && data.currentUser.ativo ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Sistema Funcionando Corretamente
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Atenção
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              {data.session ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Sessão de autenticação ativa</span>
            </li>
            <li className="flex items-center gap-2">
              {data.currentUser ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Usuário encontrado no banco</span>
            </li>
            <li className="flex items-center gap-2">
              {data.currentUser?.ativo ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Usuário ativo</span>
            </li>
            <li className="flex items-center gap-2">
              {data.currentUser?.senha_hash ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Senha configurada</span>
            </li>
            <li className="flex items-center gap-2">
              {data.session?.userId === data.currentUserId ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Sessão sincronizada com getCurrentUserId()</span>
            </li>
          </ul>

          {data.session && data.currentUser && data.currentUser.ativo && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm">
                ✅ <strong>Tudo pronto!</strong> Quando você criar contas, transações ou categorias,
                elas serão automaticamente associadas ao usuário <strong>{data.currentUser.nome}</strong>
              </p>
              <p className="text-xs mt-2 font-mono text-muted-foreground break-all">
                ID: {data.currentUser.id}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
