import { View } from 'react-native'
import { useTheme } from '../context/ThemeContext'

export default function Card({ children, style }) {
  const { colors } = useTheme()
  return (
    <View style={[{
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colors.isDark ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    }, style]}>
      {children}
    </View>
  )
}
