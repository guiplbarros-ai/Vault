'use client';

import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequireAdmin } from "@/components/auth/require-admin";
import Link from "next/link";
import {
  Database,
  FileSpreadsheet,
  Building2,
  Wallet,
  Shield,
  RefreshCw,
  Wrench,
  Code2,
  Bug,
  TestTube,
  Terminal,
  Settings2,
  FileText,
  Sparkles,
  Users,
  ShieldCheck,
  UserCog,
  Activity,
} from "lucide-react";

interface DevTool {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'database' | 'testing' | 'utilities' | 'admin';
  status?: 'stable' | 'beta' | 'experimental';
}

const DEV_TOOLS: DevTool[] = [
  // Database Tools
  {
    title: "Seed Completo",
    description: "Popula o banco com dados de exemplo completos (instituições, contas, categorias, transações)",
    href: "/dev/seed",
    icon: Database,
    category: 'database',
    status: 'stable',
  },
  {
    title: "Seed Templates",
    description: "Cria templates de importação para diferentes bancos",
    href: "/dev/seed-templates",
    icon: FileSpreadsheet,
    category: 'database',
    status: 'stable',
  },
  {
    title: "Seed Regras",
    description: "Cria regras de classificação automática de transações",
    href: "/dev/seed-rules",
    icon: Sparkles,
    category: 'database',
    status: 'stable',
  },

  // Testing & Validation Tools
  {
    title: "Verificar Instituições",
    description: "Valida dados de instituições financeiras no banco",
    href: "/dev/check-institutions",
    icon: Building2,
    category: 'testing',
    status: 'stable',
  },
  {
    title: "Verificar Contas",
    description: "Valida dados de contas bancárias",
    href: "/dev/check-accounts",
    icon: Wallet,
    category: 'testing',
    status: 'stable',
  },
  {
    title: "Verificar Contas Pai",
    description: "Valida relacionamentos entre contas e contas pai",
    href: "/dev/check-parent-accounts",
    icon: Shield,
    category: 'testing',
    status: 'stable',
  },

  // Utility Tools
  {
    title: "Atualizar Logos de Bancos",
    description: "Atualiza URLs de logos de instituições financeiras",
    href: "/dev/update-bank-logos",
    icon: RefreshCw,
    category: 'utilities',
    status: 'stable',
  },
  {
    title: "Teste de Database",
    description: "Interface de teste para operações no banco de dados",
    href: "/dev/db-test",
    icon: TestTube,
    category: 'utilities',
    status: 'experimental',
  },

  // Admin Tools
  {
    title: "Gerenciar Administradores",
    description: "Promover e remover privilégios de administrador",
    href: "/settings?tab=admin",
    icon: ShieldCheck,
    category: 'admin',
    status: 'stable',
  },
  {
    title: "Diagnóstico de Autenticação",
    description: "Verificar sessão, usuários e associação de dados",
    href: "/auth-diagnostic",
    icon: Activity,
    category: 'admin',
    status: 'stable',
  },
  {
    title: "Gerenciar Usuários",
    description: "Criar, editar e gerenciar usuários do sistema",
    href: "/dev-tools/users",
    icon: Users,
    category: 'admin',
    status: 'beta',
  },
];

const CATEGORIES = {
  database: {
    title: "Ferramentas de Banco de Dados",
    description: "Seeds e população de dados",
    icon: Database,
  },
  testing: {
    title: "Ferramentas de Teste e Validação",
    description: "Validação de integridade dos dados",
    icon: Bug,
  },
  utilities: {
    title: "Utilitários",
    description: "Ferramentas auxiliares de manutenção",
    icon: Wrench,
  },
  admin: {
    title: "Administração",
    description: "Gerenciamento de usuários e permissões",
    icon: Shield,
  },
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;

  const styles = {
    stable: 'bg-green-500/10 text-green-400 border-green-500/20',
    beta: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    experimental: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}

export default function DevToolsPage() {
  const toolsByCategory = DEV_TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, DevTool[]>);

  return (
    <DashboardLayout>
      <RequireAdmin>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <PageHeader
              title="Dev Tools"
              description="Ferramentas de desenvolvimento e administração"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Terminal className="h-4 w-4" />
              <span>Apenas Admins</span>
            </div>
          </div>

          {/* Categories */}
          {Object.entries(CATEGORIES).map(([key, category]) => {
            const tools = toolsByCategory[key];
            if (!tools || tools.length === 0) return null;

            const Icon = category.icon;

            return (
              <div key={key} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{category.title}</h2>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    return (
                      <Link key={tool.href} href={tool.href}>
                        <Card className="h-full hover:bg-accent transition-colors cursor-pointer group">
                          <CardHeader>
                            <div className="flex items-start justify-between mb-2">
                              <div className="p-2 rounded-lg transition-colors bg-accent">
                                <ToolIcon className="h-5 w-5 text-primary" />
                              </div>
                              <StatusBadge status={tool.status} />
                            </div>
                            <CardTitle className="text-lg">{tool.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CardDescription>{tool.description}</CardDescription>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Warning Footer */}
          <Card className="border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-400" />
                <CardTitle className="text-yellow-400">Aviso Importante</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Estas ferramentas são destinadas apenas para desenvolvimento e administração.
                Algumas operações podem modificar ou deletar dados do sistema. Use com cuidado e
                sempre faça backup antes de executar operações destrutivas.
              </p>
            </CardContent>
          </Card>
        </div>
      </RequireAdmin>
    </DashboardLayout>
  );
}
