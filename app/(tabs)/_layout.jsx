import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { BlurView } from 'expo-blur'
import { BRAND, useTheme } from '../../src/context/ThemeContext'
import { useLang } from '../../src/context/LanguageContext'

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
  const { t } = useLang()

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
      <Tabs.Screen name="index"      options={{ title: t('tab_home'),       tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} color={TAB_COLORS.home} /> }} />
      <Tabs.Screen name="attendance" options={{ title: t('tab_attendance'), tabBarIcon: ({ focused }) => <Icon emoji="🕐" focused={focused} color={TAB_COLORS.attendance} /> }} />
      <Tabs.Screen name="leave"      options={{ title: t('tab_leave'),      tabBarIcon: ({ focused }) => <Icon emoji="🏖" focused={focused} color={TAB_COLORS.leave} /> }} />
      <Tabs.Screen name="pulse"      options={{ title: t('tab_pulse'),      tabBarIcon: ({ focused }) => <Icon emoji="✨" focused={focused} color={TAB_COLORS.pulse} /> }} />
      <Tabs.Screen name="team"       options={{ title: t('tab_team'),       tabBarIcon: ({ focused }) => <Icon emoji="🤝" focused={focused} color={TAB_COLORS.team} /> }} />
      <Tabs.Screen name="requests"   options={{ title: t('tab_requests'),   tabBarIcon: ({ focused }) => <Icon emoji="📋" focused={focused} color={TAB_COLORS.requests} /> }} />
      <Tabs.Screen name="payslips"   options={{ title: t('tab_payslips'),   tabBarIcon: ({ focused }) => <Icon emoji="💰" focused={focused} color={TAB_COLORS.payslips} /> }} />
      <Tabs.Screen name="more"       options={{ href: null }} />
    </Tabs>
  )
}
