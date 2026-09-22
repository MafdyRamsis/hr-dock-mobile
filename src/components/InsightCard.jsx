import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GRADIENTS, useTheme } from '../context/ThemeContext'

/* A single "Dock AI" observation — data-driven, computed server-side
   (streaks, leave balance, payslip, birthdays...), never decorative
   filler. Used on Home and the Pulse tab feed. */
export default function InsightCard({ icon, text, style }) {
  const { colors, isDark } = useTheme()
  return (
    <View style={[ic.card, { backgroundColor: colors.card, borderColor: colors.glassBorder, shadowColor: isDark ? '#000' : '#8890B5' }, style]}>
      <LinearGradient colors={GRADIENTS.coral} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ic.dot} />
      <Text style={ic.icon}>{icon}</Text>
      <Text style={[ic.text, { color: colors.text2 }]}>{text}</Text>
    </View>
  )
}

const ic = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 13, marginBottom: 9, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2, overflow: 'hidden' },
  dot:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  icon: { fontSize: 17, marginRight: 10 },
  text: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
})
