'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { useAccounts } from '@/lib/hooks/use-accounts'
import { AccountsList } from '@/components/contas/accounts-list'
import type { Account } from '@/lib/hooks/use-accounts'

// Lazy load AccountForm (only when modal opens)
const AccountForm = dynamic(() => import('@/components/contas/account-form').then(mod => ({ default: mod.AccountForm })), {
  loading: () => <div className="p-6 text-center text-sm text-slate-600 dark:text-graphite-300">Carregando formulário...</div>
})

export default function ContasPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const { data: accounts, isLoading, error } = useAccounts()

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingAccount(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-graphite-100">Contas</h1>
          <p className="text-slate-600 dark:text-graphite-300 mt-1">Gerencie suas contas bancárias e cartões</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-600 dark:text-red-400">
              Erro ao carregar contas. Verifique sua conexão.
            </p>
          </CardContent>
        </Card>
      ) : !accounts || accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma conta cadastrada</CardTitle>
            <CardDescription>
              Crie sua primeira conta para começar a gerenciar suas finanças.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AccountsList accounts={accounts} onEdit={handleEdit} />
      )}

      {/* Modal - Account Form */}
      <Modal
        isOpen={showForm}
        onClose={handleCloseForm}
        title={editingAccount ? 'Editar Conta' : 'Nova Conta'}
        size="md"
      >
        <AccountForm account={editingAccount} onClose={handleCloseForm} />
      </Modal>
    </div>
  )
}
