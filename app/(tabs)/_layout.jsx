import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../src/context/ThemeContext'
import { useLang } from '../../src/context/LanguageContext'
import { useAuth } from '../../src/context/AuthContext'

// One calm style for every tab, like the web app's side menu: muted grey
// icons and labels, teal for the tab you are on. Outline icons from
// @expo/vector-icons (bundled with Expo); the filled version marks the
// active tab so it doesn't rely on colour alone.
const Icon = ({ name, focused, color }) => (
  <Ionicons name={focused ? name : `${name}-outline`} size={23} color={color} />
)

export default function TabLayout() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const { t, tr } = useLang()
  const { can = () => false, logout, user } = useAuth() || {}
  // HR/Admin can switch mobile features off per role (Fawry 2.7.0 parity).
  const lead = ['manager', 'ceo', 'admin', 'hr_manager'].includes(user?.role)
  const executive = user?.role === 'ceo'

  if (!can('app')) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
        {tr('The mobile app is not enabled for your role', 'تطبيق الجوال غير مفعّل لدورك', 'تطبيق الموبايل مش متاح لدورك')}
      </Text>
      <Text style={{ fontSize: 13, color: colors.sub, textAlign: 'center', marginTop: 8 }}>
        {tr('Please contact HR, or use HR Dock on the web.', 'يرجى التواصل مع الموارد البشرية أو استخدام HR Dock على الويب.', 'كلّم الـ HR أو استخدم HR Dock على الويب.')}
      </Text>
      {logout && <Text onPress={logout} style={{ marginTop: 18, color: colors.text, fontWeight: '700' }}>{tr('Sign out', 'تسجيل الخروج', 'اخرج')}</Text>}
    </View>
  )

  // Employees: Home · Requests · Attendance · Pay · More.
  // Managers/HR: Home · Team · Approvals · My requests · More.
  // CEO: Home · Workforce · Payroll · Performance · More.
  // Everything else (leave, attendance for leads, performance for managers…)
  // is one tap away under More, so the bar never has more than five tabs.
  const show = ok => (ok ? undefined : null)
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarShowLabel: true,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.sub,
      // Labels must fit inside the bar at any system text size.
      tabBarAllowFontScaling: false,
      tabBarLabelPosition: 'below-icon',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      // A plain bar fixed to the bottom, above the phone's own navigation
      // area (insets.bottom), so labels are never squeezed or hidden.
      tabBarStyle: {
        height: 60 + insets.bottom,
        paddingTop: 6,
        paddingBottom: 6 + insets.bottom,
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarItemStyle: { paddingTop: 0 },
    }}>
      <Tabs.Screen name="index" options={{ title: t('tab_home'), tabBarIcon: ({ focused, color }) => <Icon name="home" focused={focused} color={color} /> }} />
      <Tabs.Screen name="requests" options={{ href: show(!executive && can('requests')), title: lead ? tr('My requests', 'طلباتي') : t('tab_requests'), tabBarIcon: ({ focused, color }) => <Icon name="list" focused={focused} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ href: show(!lead && can('attendance')), title: t('tab_attendance'), tabBarIcon: ({ focused, color }) => <Icon name="time" focused={focused} color={color} /> }} />
      <Tabs.Screen name="payslips" options={{ href: show(!lead && can('payslips')), title: tr('Pay', 'راتبي'), tabBarIcon: ({ focused, color }) => <Icon name="wallet" focused={focused} color={color} /> }} />
      <Tabs.Screen name="team" options={{ href: show(lead && can('workforce_overview')), title: executive ? tr('Workforce', 'القوى العاملة') : tr('Team', 'الفريق'), tabBarIcon: ({ focused, color }) => <Icon name="people" focused={focused} color={color} /> }} />
      <Tabs.Screen name="approvals" options={{ href: show(lead && !executive && can('team_approvals')), title: tr('Approvals', 'الموافقات'), tabBarIcon: ({ focused, color }) => <Icon name="checkmark-done-circle" focused={focused} color={color} /> }} />
      <Tabs.Screen name="forecast" options={{ href: show(executive && can('payroll_forecast')), title: tr('Payroll', 'الرواتب'), tabBarIcon: ({ focused, color }) => <Icon name="cash" focused={focused} color={color} /> }} />
      <Tabs.Screen name="performance" options={{ href: show(executive && can('performance_overview')), title: tr('Performance', 'الأداء'), tabBarIcon: ({ focused, color }) => <Icon name="trending-up" focused={focused} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: tr('More', 'المزيد'), tabBarIcon: ({ focused, color }) => <Icon name="ellipsis-horizontal-circle" focused={focused} color={color} /> }} />
      <Tabs.Screen name="leave" options={{ href: null }} />
      <Tabs.Screen name="pulse" options={{ href: null }} />
    </Tabs>
  )
}
