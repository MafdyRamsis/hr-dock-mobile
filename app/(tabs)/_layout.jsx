import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { GRADIENTS, useTheme } from '../../src/context/ThemeContext'
import { useLang } from '../../src/context/LanguageContext'

const Icon = ({ emoji, focused, gradient }) => {
  if (focused) {
    return (
      <LinearGradient
        colors={GRADIENTS[gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', shadowColor: GRADIENTS[gradient][1], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 2 }}
      >
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
      </LinearGradient>
    )
  }
  return (
    <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, opacity: 0.38 }}>{emoji}</Text>
    </View>
  )
}

export default function TabLayout() {
  const { colors, isDark } = useTheme()
  const { t } = useLang()

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        position: 'absolute',
        left: 10,
        right: 10,
        bottom: 22,
        height: 64,
        borderRadius: 28,
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
            borderRadius: 28,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.glassBorder,
            backgroundColor: isDark ? 'rgba(26,27,40,0.6)' : 'rgba(255,255,255,0.62)',
          }}
        />
      ),
      tabBarItemStyle: { paddingTop: 4 },
    }}>
      <Tabs.Screen name="index"      options={{ title: t('tab_home'),       tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} gradient="coral" /> }} />
      <Tabs.Screen name="attendance" options={{ title: t('tab_attendance'), tabBarIcon: ({ focused }) => <Icon emoji="🕐" focused={focused} gradient="mint" /> }} />
      <Tabs.Screen name="leave"      options={{ title: t('tab_leave'),      tabBarIcon: ({ focused }) => <Icon emoji="🏖" focused={focused} gradient="sunshine" /> }} />
      <Tabs.Screen name="pulse"      options={{ title: t('tab_pulse'),      tabBarIcon: ({ focused }) => <Icon emoji="✨" focused={focused} gradient="coral" /> }} />
      <Tabs.Screen name="team"       options={{ title: t('tab_team'),       tabBarIcon: ({ focused }) => <Icon emoji="🤝" focused={focused} gradient="lavender" /> }} />
      <Tabs.Screen name="requests"   options={{ title: t('tab_requests'),   tabBarIcon: ({ focused }) => <Icon emoji="📋" focused={focused} gradient="lavender" /> }} />
      <Tabs.Screen name="payslips"   options={{ title: t('tab_payslips'),   tabBarIcon: ({ focused }) => <Icon emoji="💰" focused={focused} gradient="mint" /> }} />
      <Tabs.Screen name="more"       options={{ href: null }} />
    </Tabs>
  )
}
