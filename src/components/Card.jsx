import { View, StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'

export default function Card({ children, style }) {
  const { colors, isDark } = useTheme()
  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.glassBorder, shadowColor: isDark ? '#000' : '#8890B5' },
      style,
    ]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
})
