import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'

/* Achievement badge — locked (dim, outline) or unlocked (bright, glowing).
   Computed server-side from real attendance/kudos data, not decorative. */
export default function BadgeChip({ emoji, label, description, unlocked, style }) {
  const { colors, isDark } = useTheme()
  return (
    <View
      style={[
        b.card,
        {
          backgroundColor: unlocked ? colors.card : colors.cardAlt,
          borderColor: unlocked ? `${colors.coral}40` : colors.glassBorder,
          shadowColor: unlocked ? colors.coral : 'transparent',
          shadowOpacity: unlocked ? 0.1 : 0,
          opacity: unlocked ? 1 : 0.55,
        },
        style,
      ]}
    >
      <Text style={[b.emoji, !unlocked && { opacity: 0.4 }]}>{emoji}</Text>
      <Text style={[b.label, { color: colors.text }]} numberOfLines={1}>{label}</Text>
      <Text style={[b.desc, { color: colors.sub }]} numberOfLines={2}>{description}</Text>
    </View>
  )
}

const b = StyleSheet.create({
  card:  { width: 108, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 1 },
  emoji: { fontSize: 26, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '800', textAlign: 'center', marginBottom: 3 },
  desc:  { fontSize: 9.5, textAlign: 'center', lineHeight: 12.5 },
})
