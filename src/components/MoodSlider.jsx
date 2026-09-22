import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'

const MOODS = [
  { v: 1, emoji: '😞', label: 'Rough' },
  { v: 2, emoji: '😕', label: 'Meh' },
  { v: 3, emoji: '🙂', label: 'Okay' },
  { v: 4, emoji: '😄', label: 'Good' },
  { v: 5, emoji: '🤩', label: 'Great' },
]

/* One-tap daily mood check-in — five faces, pick one. */
export default function MoodSlider({ value, onChange, disabled }) {
  const { colors } = useTheme()
  return (
    <View style={m.row}>
      {MOODS.map(mo => {
        const active = value === mo.v
        return (
          <TouchableOpacity
            key={mo.v}
            disabled={disabled}
            onPress={() => onChange?.(mo.v)}
            activeOpacity={0.8}
            style={[
              m.item,
              {
                backgroundColor: active ? `${colors.mint}22` : colors.cardAlt,
                borderColor: active ? colors.mint : colors.glassBorder,
                transform: [{ scale: active ? 1.08 : 1 }],
              },
            ]}
          >
            <Text style={m.emoji}>{mo.emoji}</Text>
            <Text style={[m.label, { color: active ? colors.mint : colors.sub }]}>{mo.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const m = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  item:  { flex: 1, alignItems: 'center', borderRadius: 16, borderWidth: 1.5, paddingVertical: 10 },
  emoji: { fontSize: 22, marginBottom: 4 },
  label: { fontSize: 9.5, fontWeight: '700' },
})
