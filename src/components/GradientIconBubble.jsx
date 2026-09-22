import { Text } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GRADIENTS } from '../context/ThemeContext'

/* Rounded gradient bubble carrying an emoji/glyph — used for stat icons,
   feed-item icons, and category markers across the app. */
export default function GradientIconBubble({ icon, gradient = 'coral', size = 44, radius, style }) {
  const colors = GRADIENTS[gradient] || GRADIENTS.coral
  const r = radius ?? size / 2.6
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Text style={{ fontSize: size * 0.44 }}>{icon}</Text>
    </LinearGradient>
  )
}
