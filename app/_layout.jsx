import { useEffect } from 'react'
import { I18nManager, View, Text, TouchableOpacity } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { ThemeProvider, useTheme } from '../src/context/ThemeContext'
import { LanguageProvider, useLang } from '../src/context/LanguageContext'
import * as Notifications from 'expo-notifications'
import { registerForPushNotifications, pushTarget } from '../src/utils/notifications'

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
  // a request waiting for your approval → Approvals, anything else → the
  // notifications list.
  useEffect(() => {
    if (!user) return
    const sub = Notifications.addNotificationResponseReceivedListener(r => {
      router.push(pushTarget(r?.notification?.request?.content?.data?.type))
    })
    return () => sub.remove()
  }, [user])

  const { refreshTone } = useLang()
  useEffect(() => {
    if (user) { if (!user.is_demo) registerForPushNotifications(); refreshTone() }
  }, [user])

  return null
}

// Shown on every screen of the read-only demo workspace, so a visitor always
// knows the data is made up and can leave the demo in one tap.
function DemoBanner() {
  const { user, logout } = useAuth()
  const { tr } = useLang()
  const insets = useSafeAreaInsets()
  if (!user?.is_demo) return null
  return (
    <View style={{ backgroundColor: '#E8583C', paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '700', flex: 1 }}>
        {tr('Demo · sample data, changes are off', 'عرض تجريبي · بيانات وهمية ولا يمكن التعديل', 'ديمو · بيانات وهمية ومفيش تعديل')}
      </Text>
      <TouchableOpacity accessibilityRole="button" onPress={logout} hitSlop={8}>
        <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '800', textDecorationLine: 'underline' }}>{tr('Exit demo', 'إنهاء العرض', 'اخرج من الديمو')}</Text>
      </TouchableOpacity>
    </View>
  )
}

function ThemedApp() {
  const { isDark } = useTheme()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'light'} />
      <DemoBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

// A mistake while drawing any screen shows this instead of closing the app.
// It sits outside the theme/language providers, so it styles itself and reads
// the layout direction for the language.
export function ErrorBoundary({ retry }) {
  const ar = I18nManager.isRTL
  return (
    <View style={{ flex: 1, backgroundColor: '#0F1E33', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
        {ar ? 'حدث خطأ في هذه الشاشة' : 'Something went wrong on this screen'}
      </Text>
      <Text style={{ color: '#B8C4D4', textAlign: 'center', marginBottom: 24, lineHeight: 21 }}>
        {ar ? 'بياناتك بأمان. حاول مرة أخرى، وإذا تكرر الخطأ أبلغ الموارد البشرية.' : 'Your data is safe. Try again, and if it keeps happening let HR know.'}
      </Text>
      <TouchableOpacity accessibilityRole="button" onPress={retry} style={{ backgroundColor: '#14B8A6', paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>{ar ? 'حاول مرة أخرى' : 'Try again'}</Text>
      </TouchableOpacity>
    </View>
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
