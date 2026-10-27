import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { ThemeProvider, useTheme } from '../src/context/ThemeContext'
import { LanguageProvider, useLang } from '../src/context/LanguageContext'
import * as Notifications from 'expo-notifications'
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

  // Tapping a push opens the screen it is about: request decisions → Requests,
  // anything else → the notifications list.
  useEffect(() => {
    if (!user) return
    const sub = Notifications.addNotificationResponseReceivedListener(r => {
      const type = r?.notification?.request?.content?.data?.type || ''
      router.push(/_decided$/.test(type) ? '/(tabs)/requests' : '/notifications')
    })
    return () => sub.remove()
  }, [user])

  const { refreshTone } = useLang()
  useEffect(() => {
    if (user) { registerForPushNotifications(); refreshTone() }
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
