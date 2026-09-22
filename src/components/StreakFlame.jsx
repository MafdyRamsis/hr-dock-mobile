import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GRADIENTS, useTheme } from '../context/ThemeContext'

/* Check-in streak badge — a glowing flame + day count. Used on Home and
   the Pulse tab. */
export default function StreakFlame({ days = 0, size = 'md' }) {
  const { colors, isDark } = useTheme()
  const sm = size === 'sm'
  if (!days) {
    return (
      <View style={[st.pill, { backgroundColor: colors.cardAlt, borderColor: colors.glassBorder }]}>
        <Text style={{ fontSize: sm ? 13 : 15 }}>💤</Text>
        <Text style={[st.text, { color: colors.sub, fontSize: sm ? 11 : 12.5 }]}>No streak yet</Text>
      </View>
    )
  }
  return (
    <LinearGradient
      colors={GRADIENTS.sunshine}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[st.pill, st.lit, { shadowColor: GRADIENTS.sunshine[1], shadowOpacity: isDark ? 0.5 : 0.3 }]}
    >
      <Text style={{ fontSize: sm ? 13 : 15 }}>🔥</Text>
      <Text style={[st.text, { color: '#2A1600', fontSize: sm ? 11 : 12.5 }]}>{days}-day streak</Text>
    </LinearGradient>
  )
}

const st = StyleSheet.create({
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, alignSelf: 'flex-start' },
  lit:   { borderWidth: 0, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4 },
  text:  { fontWeight: '800' },
})
