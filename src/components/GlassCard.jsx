import { View, StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'

/* Soft, rounded, lightly-bordered card used throughout the new design
   system. Not a literal blur (RN shadows + translucency read better than
   real blur over scrolling content), but matches the glassmorphism look. */
export default function GlassCard({ children, style, padding = 18, radius = 22, noBorder }) {
  const { colors, isDark } = useTheme()
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.card,
          borderRadius: radius,
          padding,
          borderColor: colors.glassBorder,
          borderWidth: noBorder ? 0 : 1,
          shadowColor: isDark ? '#000' : '#8890B5',
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 3,
  },
})
