import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { ThemeProvider, useTheme } from '../src/context/ThemeContext'
import { registerForPushNotifications } from '../src/utils/notifications'

function Guard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    if (!user && !inAuth) router.replace('/(auth)')
    if (user && inAuth)  router.replace('/(tabs)')
  }, [user, loading])

  useEffect(() => {
    if (user) registerForPushNotifications()
  }, [user])

  return null
}

function ThemedApp() {
  const { isDark } = useTheme()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'light'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Guard />
        <ThemedApp />
      </AuthProvider>
    </ThemeProvider>
  )
}
