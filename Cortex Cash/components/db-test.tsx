'use client';

import { useEffect, useState } from 'react';
import { categoriaService } from '@/lib/services/categoria.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Categoria } from '@/lib/types';

export function DBTest() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('🔄 DBTest: Carregando categorias...');
        const cats = await categoriaService.listCategorias();
        console.log('✅ DBTest: Categorias carregadas:', cats.length);
        setCategorias(cats);
      } catch (err) {
        console.error('❌ DBTest: Erro ao carregar categorias:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teste de Database (Dexie.js)</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erro no Database</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const despesas = categorias.filter((c) => c.tipo === 'despesa');
  const receitas = categorias.filter((c) => c.tipo === 'receita');
  const ativas = categorias.filter((c) => c.ativa);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste de Database (Dexie.js)</CardTitle>
        <CardDescription>
          Verificando conexão e dados seed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total de Categorias</p>
            <p className="text-2xl font-bold">{categorias.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Despesas</p>
            <p className="text-2xl font-bold text-destructive">{despesas.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Receitas</p>
            <p className="text-2xl font-bold text-green-500">{receitas.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Ativas</p>
            <p className="text-2xl font-bold">{ativas.length}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Primeiras 5 Categorias:</p>
          <ul className="space-y-1 text-sm">
            {categorias.slice(0, 5).map((cat) => (
              <li key={cat.id} className="flex items-center gap-2">
                <span className="text-lg">{cat.icone}</span>
                <span className="font-medium">{cat.nome}</span>
                <span className="text-muted-foreground">
                  ({cat.tipo})
                </span>
                {cat.grupo && (
                  <span className="text-xs text-muted-foreground">
                    → {cat.grupo}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">
            ✅ Database Dexie.js funcionando corretamente!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
