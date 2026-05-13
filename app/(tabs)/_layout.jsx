import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'

const Icon = ({ name, focused }) => {
  const icons = {
    home:       focused ? '🏠' : '🏠',
    attendance: focused ? '🕐' : '🕐',
    leave:      focused ? '🏖' : '🏖',
    payslips:   focused ? '💰' : '💰',
    more:       focused ? '☰' : '☰',
  }
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icons[name]}</Text>
  )
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#0F1829',
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
      <Tabs.Screen name="index"      options={{ title: 'Home',       tabBarIcon: ({ focused }) => <Icon name="home"       focused={focused} /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: ({ focused }) => <Icon name="attendance" focused={focused} /> }} />
      <Tabs.Screen name="leave"      options={{ title: 'Leave',      tabBarIcon: ({ focused }) => <Icon name="leave"      focused={focused} /> }} />
      <Tabs.Screen name="payslips"   options={{ title: 'Payslips',   tabBarIcon: ({ focused }) => <Icon name="payslips"   focused={focused} /> }} />
      <Tabs.Screen name="more"       options={{ title: 'More',       tabBarIcon: ({ focused }) => <Icon name="more"       focused={focused} /> }} />
    </Tabs>
  )
}
