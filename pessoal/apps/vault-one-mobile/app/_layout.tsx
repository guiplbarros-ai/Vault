import '../global.css'
import { AuthProvider } from '@/providers/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import { useAuthStore } from '@/stores/auth.store'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [isAuthenticated, isLoading, segments])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-app">
        <ActivityIndicator size="large" color="#3A8F6E" />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AuthGate>
          <StatusBar style="light" />
          <Slot />
        </AuthGate>
      </AuthProvider>
    </QueryProvider>
  )
}
