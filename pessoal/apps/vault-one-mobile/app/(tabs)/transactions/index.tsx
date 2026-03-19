import { useRecentTransactions } from '@/hooks/use-transactions'
import { useState } from 'react'
import { View, Text, TextInput, FlatList, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function TransactionsScreen() {
  const { data: transactions, refetch, isLoading } = useRecentTransactions(50)
  const [search, setSearch] = useState('')

  const filtered = transactions?.filter((tx) =>
    search ? tx.descricao.toLowerCase().includes(search.toLowerCase()) : true
  )

  return (
    <SafeAreaView className="flex-1 bg-bg-app" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-fg-primary text-2xl font-bold">Transacoes</Text>
      </View>

      <View className="px-5 mb-3">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar..."
          placeholderTextColor="#7d8884"
          className="bg-bg-card-2 border border-border rounded-xl px-4 py-3 text-fg-primary"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3A8F6E" />
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View className="h-px bg-divider" />}
        renderItem={({ item: tx }) => (
          <View className="flex-row items-center justify-between py-3.5">
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
        )}
        ListEmptyComponent={
          <View className="py-16 items-center">
            <Text className="text-fg-muted">Nenhuma transacao encontrada</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
