import { useAccounts, useTotalBalance } from '@/hooks/use-accounts'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useCallback } from 'react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const TIPO_LABELS: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupanca',
  investimento: 'Investimento',
  carteira: 'Carteira',
}

export default function AccountsScreen() {
  const { data: accounts, refetch, isLoading } = useAccounts()
  const totalBalance = useTotalBalance()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  return (
    <SafeAreaView className="flex-1 bg-bg-app" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-fg-primary text-2xl font-bold">Contas</Text>
        <Text className="text-fg-secondary text-sm mt-1">
          Saldo total: {formatCurrency(totalBalance)}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3A8F6E" />
        }
      >
        {accounts?.map((account) => (
          <View key={account.id} className="bg-bg-card rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-fg-primary text-base font-semibold">{account.nome}</Text>
                <Text className="text-fg-muted text-xs mt-0.5">
                  {TIPO_LABELS[account.tipo] || account.tipo}
                </Text>
              </View>
              <Text
                className={`text-lg font-bold ${Number(account.saldo_atual) >= 0 ? 'text-success' : 'text-error'}`}
              >
                {formatCurrency(Number(account.saldo_atual))}
              </Text>
            </View>
          </View>
        ))}

        {(!accounts || accounts.length === 0) && (
          <View className="py-16 items-center">
            <Text className="text-fg-muted">Nenhuma conta cadastrada</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
