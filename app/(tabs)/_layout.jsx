import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { BlurView } from 'expo-blur'
import { BRAND, useTheme } from '../../src/context/ThemeContext'
import { useLang } from '../../src/context/LanguageContext'
import { useAuth } from '../../src/context/AuthContext'

// Distinct solid colors per category — no gradients, no low-opacity fades,
// so each tab reads clearly at a glance (active and inactive alike).
const TAB_COLORS = {
  home:       BRAND.coral,     // #4F46E5 indigo
  attendance: BRAND.mint,      // #059669 emerald
  leave:      BRAND.sunshine,  // #D97706 amber
  pulse:      BRAND.lavender,  // #6366F1 violet
  team:       '#0EA5E9',       // sky blue
  requests:   '#DB2777',       // rose
  payslips:   '#15803D',       // money green
}

const Icon = ({ emoji, focused, color }) => (
  <View
    style={{
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: focused ? color : `${color}22`,
      shadowColor: color,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: focused ? 0.3 : 0,
      shadowRadius: 6,
      elevation: focused ? 2 : 0,
    }}
  >
    <Text style={{ fontSize: 16 }}>{emoji}</Text>
  </View>
)

export default function TabLayout() {
  const { colors, isDark } = useTheme()
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

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarShowLabel: true,
      tabBarActiveTintColor: colors.text,
      tabBarInactiveTintColor: colors.sub,
      tabBarLabelStyle: { fontSize: 9.5, fontWeight: '700', marginTop: 2 },
      tabBarStyle: {
        position: 'absolute',
        left: 10,
        right: 10,
        bottom: 22,
        height: 70,
        borderRadius: 24,
        borderTopWidth: 0,
        backgroundColor: 'transparent',
        elevation: 0,
        shadowColor: '#2A2E45',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: isDark ? 0.4 : 0.18,
        shadowRadius: 24,
      },
      tabBarBackground: () => (
        <BlurView
          intensity={isDark ? 50 : 65}
          tint={isDark ? 'dark' : 'light'}
          style={{
            flex: 1,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.glassBorder,
            backgroundColor: isDark ? 'rgba(26,27,40,0.6)' : 'rgba(255,255,255,0.62)',
          }}
        />
      ),
      tabBarItemStyle: { paddingTop: 6 },
    }}>
      <Tabs.Screen name="index" options={{ title: lead ? tr('Overview', 'نظرة عامة') : t('tab_home'), tabBarIcon: ({ focused }) => <Icon emoji="⌂" focused={focused} color={TAB_COLORS.home} /> }} />
      <Tabs.Screen name="attendance" options={{ href: !lead && can('attendance') ? undefined : null, title: t('tab_attendance'), tabBarIcon: ({ focused }) => <Icon emoji="◴" focused={focused} color={TAB_COLORS.attendance} /> }} />
      <Tabs.Screen name="team" options={{ href: lead && can('workforce_overview') ? undefined : null, title: executive ? tr('Workforce', 'القوى العاملة') : tr('My Team', 'فريقي'), tabBarIcon: ({ focused }) => <Icon emoji="♙" focused={focused} color={TAB_COLORS.team} /> }} />
      <Tabs.Screen name="approvals" options={{ href: lead && !executive && can('team_approvals') ? undefined : null, title: tr('Approvals', 'الموافقات'), tabBarIcon: ({ focused }) => <Icon emoji="✓" focused={focused} color={TAB_COLORS.requests} /> }} />
      <Tabs.Screen name="forecast" options={{ href: executive && can('payroll_forecast') ? undefined : null, title: tr('Payroll', 'الرواتب'), tabBarIcon: ({ focused }) => <Icon emoji="¤" focused={focused} color={TAB_COLORS.payslips} /> }} />
      <Tabs.Screen name="performance" options={{ href: lead && can('performance_overview') ? undefined : null, title: tr('Performance', 'الأداء'), tabBarIcon: ({ focused }) => <Icon emoji="↗" focused={focused} color={TAB_COLORS.pulse} /> }} />
      <Tabs.Screen name="requests" options={{ href: !lead && can('requests') ? undefined : null, title: t('tab_requests'), tabBarIcon: ({ focused }) => <Icon emoji="≡" focused={focused} color={TAB_COLORS.requests} /> }} />
      <Tabs.Screen name="payslips" options={{ href: !lead && can('payslips') ? undefined : null, title: tr('Pay', 'راتبي'), tabBarIcon: ({ focused }) => <Icon emoji="¤" focused={focused} color={TAB_COLORS.payslips} /> }} />
      <Tabs.Screen name="more" options={{ title: tr('More', 'المزيد'), tabBarIcon: ({ focused }) => <Icon emoji="⋯" focused={focused} color={TAB_COLORS.leave} /> }} />
      <Tabs.Screen name="leave" options={{ href: null }} />
      <Tabs.Screen name="pulse" options={{ href: null }} />
    </Tabs>
  )
}
