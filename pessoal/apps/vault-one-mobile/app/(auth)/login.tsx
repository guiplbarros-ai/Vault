import { signIn } from '@/services/auth.service'
import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha email e senha')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
    } catch (error: any) {
      Alert.alert('Erro ao entrar', error?.message || 'Verifique suas credenciais')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg-app"
    >
      <View className="flex-1 justify-center px-8">
        {/* Logo / Title */}
        <View className="items-center mb-12">
          <Text className="text-4xl font-bold text-fg-primary">Vault One</Text>
          <Text className="text-fg-secondary mt-2">Seu controle financeiro</Text>
        </View>

        {/* Form */}
        <View className="space-y-4">
          <View>
            <Text className="text-fg-secondary text-sm mb-1.5">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#7d8884"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-bg-card-2 border border-border rounded-xl px-4 py-3.5 text-fg-primary text-base"
            />
          </View>

          <View>
            <Text className="text-fg-secondary text-sm mb-1.5">Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#7d8884"
              secureTextEntry
              className="bg-bg-card-2 border border-border rounded-xl px-4 py-3.5 text-fg-primary text-base"
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-accent rounded-xl py-4 items-center mt-4"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#eaedeb" />
            ) : (
              <Text className="text-fg-primary font-semibold text-base">Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
