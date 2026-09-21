import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { useTheme } from '../../src/context/ThemeContext'
import { useLang } from '../../src/context/LanguageContext'

const Icon = ({ emoji, focused }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
)

export default function TabLayout() {
  const { colors } = useTheme()
  const { t } = useLang()
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.tabBar,
        borderTopWidth: 0,
        height: 70,
        paddingBottom: 10,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 20,
      },
      tabBarActiveTintColor:   '#2BC4BE',
      tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    }}>
      <Tabs.Screen name="index"      options={{ title: t('tab_home'),       tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="attendance" options={{ title: t('tab_attendance'), tabBarIcon: ({ focused }) => <Icon emoji="🕐" focused={focused} /> }} />
      <Tabs.Screen name="leave"      options={{ title: t('tab_leave'),      tabBarIcon: ({ focused }) => <Icon emoji="🏖" focused={focused} /> }} />
      <Tabs.Screen name="requests"   options={{ title: t('tab_requests'),   tabBarIcon: ({ focused }) => <Icon emoji="📋" focused={focused} /> }} />
      <Tabs.Screen name="payslips"   options={{ title: t('tab_payslips'),   tabBarIcon: ({ focused }) => <Icon emoji="💰" focused={focused} /> }} />
      <Tabs.Screen name="more"       options={{ href: null }} />
    </Tabs>
  )
}
