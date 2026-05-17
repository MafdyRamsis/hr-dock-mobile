import { useEffect } from 'react'
import { Alert } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Updates from 'expo-updates'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { ThemeProvider, useTheme } from '../src/context/ThemeContext'
import { registerForPushNotifications } from '../src/utils/notifications'

async function checkForUpdate() {
  try {
    if (!Updates.isEnabled) return
    const update = await Updates.checkForUpdateAsync()
    if (!update.isAvailable) return
    await Updates.fetchUpdateAsync()
    Alert.alert(
      'Update Available',
      'A new version has been downloaded. Restart now to apply it.',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart', onPress: () => Updates.reloadAsync() },
      ]
    )
  } catch {}
}

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
    checkForUpdate()
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
