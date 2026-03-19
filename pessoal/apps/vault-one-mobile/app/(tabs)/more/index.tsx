import { signOut } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { LogOut, User, Info } from 'lucide-react-native'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function MoreScreen() {
  const user = useAuthStore((s) => s.user)

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut()
          } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Erro ao sair')
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-app" edges={['top']}>
      <View className="px-5 pt-4 pb-6">
        <Text className="text-fg-primary text-2xl font-bold">Mais</Text>
      </View>

      <View className="px-5">
        {/* Profile */}
        <View className="bg-bg-card rounded-xl p-4 mb-4 flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-accent items-center justify-center mr-4">
            <User size={24} color="#eaedeb" />
          </View>
          <View>
            <Text className="text-fg-primary font-semibold text-base">
              {user?.user_metadata?.nome || 'Usuario'}
            </Text>
            <Text className="text-fg-muted text-sm">{user?.email}</Text>
          </View>
        </View>

        {/* App Info */}
        <View className="bg-bg-card rounded-xl overflow-hidden mb-4">
          <View className="flex-row items-center px-4 py-3.5">
            <Info size={20} color="#939f9a" />
            <Text className="text-fg-secondary text-sm ml-3 flex-1">Versao</Text>
            <Text className="text-fg-muted text-sm">0.1.0</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-bg-card rounded-xl flex-row items-center px-4 py-3.5"
          activeOpacity={0.7}
        >
          <LogOut size={20} color="#F07167" />
          <Text className="text-error text-sm font-medium ml-3">Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
