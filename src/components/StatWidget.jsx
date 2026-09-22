import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GRADIENTS, useTheme } from '../context/ThemeContext'

/* Quick-stat card — icon bubble + big number + label. Used in the
   3-across "Quick Stats" row on Home. */
export default function StatWidget({ icon, value, label, gradient = 'coral', onPress, style }) {
  const { colors, isDark } = useTheme()
  const Wrap = onPress ? TouchableOpacity : View
  return (
    <Wrap
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.glassBorder, shadowColor: isDark ? '#000' : '#8890B5' },
        style,
      ]}
    >
      <LinearGradient colors={GRADIENTS[gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bubble}>
        <Text style={styles.icon}>{icon}</Text>
      </LinearGradient>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.label, { color: colors.sub }]} numberOfLines={1}>{label}</Text>
    </Wrap>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 20, padding: 14, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  bubble: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  icon: { fontSize: 17 },
  value: { fontSize: 19, fontWeight: '900', marginBottom: 1 },
  label: { fontSize: 11, fontWeight: '600' },
})
