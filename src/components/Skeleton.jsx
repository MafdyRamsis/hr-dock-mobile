import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { useTheme } from '../context/ThemeContext'

export default function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }) {
  const { colors } = useTheme()
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [])

  return (
    <Animated.View
      style={[{
        width,
        height,
        borderRadius,
        backgroundColor: colors.cardAlt,
        opacity,
      }, style]}
    />
  )
}

// Pre-built skeleton layouts for common patterns
export function SkeletonCard({ rows = 2, style }) {
  const { colors, isDark } = useTheme()
  return (
    <View style={[{
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: isDark ? '#000' : '#8890B5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    }, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ marginBottom: i < rows - 1 ? 12 : 0 }}>
          <Skeleton height={13} width={i === 0 ? '55%' : '80%'} style={{ marginBottom: 8 }} />
          <Skeleton height={11} width={i === 0 ? '35%' : '60%'} />
        </View>
      ))}
    </View>
  )
}

export function SkeletonRow({ style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }, style]}>
      <Skeleton width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton height={13} width="60%" />
        <Skeleton height={11} width="40%" />
      </View>
      <Skeleton width={56} height={22} borderRadius={8} />
    </View>
  )
}
