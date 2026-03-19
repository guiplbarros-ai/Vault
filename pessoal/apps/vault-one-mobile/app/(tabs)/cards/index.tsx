import { useCards } from '@/hooks/use-cards'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useCallback } from 'react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function CardsScreen() {
  const { data: cards, refetch, isLoading } = useCards()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  return (
    <SafeAreaView className="flex-1 bg-bg-app" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="text-fg-primary text-2xl font-bold">Cartoes</Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3A8F6E" />
        }
      >
        {cards?.map((card) => (
          <View
            key={card.id}
            className="rounded-2xl p-5 mb-4 overflow-hidden"
            style={{ backgroundColor: card.cor || '#3A8F6E' }}
          >
            <View className="flex-row items-start justify-between mb-6">
              <View>
                <Text className="text-white/70 text-xs uppercase tracking-wider">
                  {card.bandeira || 'Cartao'}
                </Text>
                <Text className="text-white text-xl font-bold mt-1">{card.nome}</Text>
              </View>
            </View>

            {card.ultimos_digitos && (
              <Text className="text-white/80 text-base font-mono tracking-widest mb-4">
                •••• {card.ultimos_digitos}
              </Text>
            )}

            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-white/70 text-xs">Limite</Text>
                <Text className="text-white text-lg font-bold">
                  {formatCurrency(card.limite_total)}
                </Text>
              </View>
              <Text className="text-white/60 text-xs">
                Vence dia {card.dia_vencimento}
              </Text>
            </View>
          </View>
        ))}

        {(!cards || cards.length === 0) && (
          <View className="py-16 items-center">
            <Text className="text-fg-muted">Nenhum cartao cadastrado</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
