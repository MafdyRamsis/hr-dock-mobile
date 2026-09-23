import { useState } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

/*
 * Shared avatar: renders the employee's uploaded photo (photo_url) when
 * present and loads successfully, otherwise falls back to the existing
 * initials-in-a-circle look used everywhere in this app. Pass either
 * `backgroundColor` (solid circle) or `gradient` (array of colors, e.g.
 * from ThemeContext's GRADIENTS) for the fallback's background — exactly
 * one of the two should be given, matching how each screen already styled
 * its circle.
 */
export default function Avatar({
  uri,
  firstName = '',
  lastName = '',
  size = 44,
  backgroundColor,
  gradient,
  borderRadius,
  style,
  textStyle,
}) {
  const [failed, setFailed] = useState(false)
  const radius = borderRadius ?? size / 2
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: radius, backgroundColor: '#e2e8f0' }, style]}
        onError={() => setFailed(true)}
      />
    )
  }

  const content = (
    <Text style={[{ color: 'white', fontWeight: '800', fontSize: size * 0.4 }, textStyle]}>
      {initials}
    </Text>
  )

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        style={[styles.center, { width: size, height: size, borderRadius: radius }, style]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {content}
      </LinearGradient>
    )
  }

  return (
    <View style={[styles.center, { width: size, height: size, borderRadius: radius, backgroundColor: backgroundColor || '#E8583C' }, style]}>
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
})
