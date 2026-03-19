import { useCategories } from '@/hooks/use-categories'
import { useAccounts } from '@/hooks/use-accounts'
import { createTransaction } from '@/services/transaction.service'
import { queryClient } from '@/lib/query-client'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { X } from 'lucide-react-native'
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function QuickAddScreen() {
  const router = useRouter()
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()

  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [contaId, setContaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const expenseCategories = categories?.filter((c) => c.tipo === tipo && !c.pai_id) ?? []

  const handleSave = async () => {
    const valorNum = Number.parseFloat(valor.replace(',', '.'))
    if (Number.isNaN(valorNum) || valorNum <= 0) {
      Alert.alert('Erro', 'Informe um valor valido')
      return
    }
    if (!contaId) {
      Alert.alert('Erro', 'Selecione uma conta')
      return
    }

    setLoading(true)
    try {
      await createTransaction({
        conta_id: contaId,
        categoria_id: categoriaId || undefined,
        data: new Date().toISOString(),
        descricao: descricao || (tipo === 'despesa' ? 'Despesa' : 'Receita'),
        valor: valorNum,
        tipo,
      })

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['month-summary'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      router.back()
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-app">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#939f9a" />
        </TouchableOpacity>
        <Text className="text-fg-primary text-lg font-semibold">Novo Lancamento</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-8">
        {/* Type Toggle */}
        <View className="flex-row bg-bg-card rounded-xl p-1 mb-6">
          <TouchableOpacity
            onPress={() => setTipo('despesa')}
            className={`flex-1 py-3 rounded-lg items-center ${tipo === 'despesa' ? 'bg-error/20' : ''}`}
          >
            <Text className={tipo === 'despesa' ? 'text-error font-semibold' : 'text-fg-muted'}>
              Despesa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTipo('receita')}
            className={`flex-1 py-3 rounded-lg items-center ${tipo === 'receita' ? 'bg-success/20' : ''}`}
          >
            <Text className={tipo === 'receita' ? 'text-success font-semibold' : 'text-fg-muted'}>
              Receita
            </Text>
          </TouchableOpacity>
        </View>

        {/* Value */}
        <View className="items-center mb-6">
          <Text className="text-fg-muted text-sm mb-2">Valor</Text>
          <TextInput
            value={valor}
            onChangeText={setValor}
            placeholder="0,00"
            placeholderTextColor="#4e5653"
            keyboardType="decimal-pad"
            className="text-4xl font-bold text-fg-primary text-center"
            style={{ minWidth: 120 }}
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-fg-secondary text-sm mb-1.5">Descricao (opcional)</Text>
          <TextInput
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Ex: Almoco, Uber..."
            placeholderTextColor="#7d8884"
            className="bg-bg-card-2 border border-border rounded-xl px-4 py-3 text-fg-primary"
          />
        </View>

        {/* Account */}
        <View className="mb-4">
          <Text className="text-fg-secondary text-sm mb-2">Conta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {accounts?.map((account) => (
              <TouchableOpacity
                key={account.id}
                onPress={() => setContaId(account.id)}
                className={`mr-2 px-4 py-2.5 rounded-xl border ${
                  contaId === account.id
                    ? 'bg-accent/20 border-accent'
                    : 'bg-bg-card border-border'
                }`}
              >
                <Text
                  className={contaId === account.id ? 'text-accent font-medium' : 'text-fg-secondary'}
                >
                  {account.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category */}
        <View className="mb-6">
          <Text className="text-fg-secondary text-sm mb-2">Categoria</Text>
          <View className="flex-row flex-wrap gap-2">
            {expenseCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategoriaId(cat.id === categoriaId ? null : cat.id)}
                className={`px-3 py-2 rounded-lg border ${
                  categoriaId === cat.id
                    ? 'bg-accent/20 border-accent'
                    : 'bg-bg-card border-border'
                }`}
              >
                <Text
                  className={`text-sm ${categoriaId === cat.id ? 'text-accent font-medium' : 'text-fg-secondary'}`}
                >
                  {cat.icone ? `${cat.icone} ` : ''}{cat.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className="bg-accent rounded-xl py-4 items-center"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#eaedeb" />
          ) : (
            <Text className="text-fg-primary font-semibold text-base">Salvar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
