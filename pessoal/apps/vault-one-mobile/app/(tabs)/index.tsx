import { useAccounts, useTotalBalance } from '@/hooks/use-accounts'
import { useMonthSummary, useRecentTransactions } from '@/hooks/use-transactions'
import { useRouter } from 'expo-router'
import { Plus } from 'lucide-react-native'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useCallback } from 'react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function DashboardScreen() {
  const router = useRouter()
  const totalBalance = useTotalBalance()
  const { data: summary, refetch: refetchSummary } = useMonthSummary()
  const { data: recentTx, refetch: refetchTx } = useRecentTransactions(8)
  const { refetch: refetchAccounts } = useAccounts()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetchSummary(), refetchTx(), refetchAccounts()])
    setRefreshing(false)
  }, [refetchSummary, refetchTx, refetchAccounts])

  const monthResult = summary?.result ?? 0

  return (
    <SafeAreaView className="flex-1 bg-bg-app" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3A8F6E" />
        }
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-fg-secondary text-sm">Vault One</Text>
          <Text className="text-fg-primary text-3xl font-bold mt-1">
            {formatCurrency(totalBalance)}
          </Text>
          <Text className="text-fg-muted text-xs mt-1">Saldo total</Text>
        </View>

        {/* Month Summary */}
        <View className="px-5 mb-6">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-bg-card rounded-xl p-4">
              <Text className="text-fg-muted text-xs">Receitas</Text>
              <Text className="text-success text-lg font-bold mt-1">
                {formatCurrency(summary?.income ?? 0)}
              </Text>
            </View>
            <View className="flex-1 bg-bg-card rounded-xl p-4">
              <Text className="text-fg-muted text-xs">Despesas</Text>
              <Text className="text-error text-lg font-bold mt-1">
                {formatCurrency(summary?.expense ?? 0)}
              </Text>
            </View>
            <View className="flex-1 bg-bg-card rounded-xl p-4">
              <Text className="text-fg-muted text-xs">Resultado</Text>
              <Text
                className={`text-lg font-bold mt-1 ${monthResult >= 0 ? 'text-success' : 'text-error'}`}
              >
                {formatCurrency(monthResult)}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-fg-primary text-lg font-semibold">Recentes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text className="text-link text-sm">Ver tudo</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-bg-card rounded-xl overflow-hidden">
            {recentTx?.map((tx, i) => (
              <View
                key={tx.id}
                className={`flex-row items-center justify-between px-4 py-3.5 ${i > 0 ? 'border-t border-divider' : ''}`}
              >
                <View className="flex-1 mr-3">
                  <Text className="text-fg-primary text-sm" numberOfLines={1}>
                    {tx.descricao}
                  </Text>
                  <Text className="text-fg-muted text-xs mt-0.5">{formatDate(tx.data)}</Text>
                </View>
                <Text
                  className={`font-semibold ${tx.tipo === 'receita' ? 'text-success' : 'text-error'}`}
                >
                  {tx.tipo === 'receita' ? '+' : '-'} {formatCurrency(Math.abs(Number(tx.valor)))}
                </Text>
              </View>
            ))}

            {(!recentTx || recentTx.length === 0) && (
              <View className="py-8 items-center">
                <Text className="text-fg-muted">Nenhuma transacao recente</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB Quick Add */}
      <TouchableOpacity
        onPress={() => router.push('/(modals)/quick-add')}
        className="absolute bottom-24 right-5 w-14 h-14 rounded-full bg-accent items-center justify-center"
        style={{ elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#eaedeb" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}
