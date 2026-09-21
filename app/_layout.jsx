import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { ThemeProvider, useTheme } from '../src/context/ThemeContext'
import { LanguageProvider } from '../src/context/LanguageContext'
import { registerForPushNotifications } from '../src/utils/notifications'

function Guard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    const onChangePw = segments[0] === 'change-password'
    const mustChange = !!user?.must_change_password
    if (!user && !inAuth) router.replace('/(auth)')
    else if (user && mustChange && !onChangePw) router.replace('/change-password')
    else if (user && !mustChange && (inAuth || onChangePw)) router.replace('/(tabs)')
  }, [user, loading, user?.must_change_password])

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
      <LanguageProvider>
        <AuthProvider>
          <Guard />
          <ThemedApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
