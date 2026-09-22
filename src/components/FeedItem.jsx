import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import GradientIconBubble from './GradientIconBubble'
import { useTheme } from '../context/ThemeContext'

/* "Today's Flow" style feed row — icon bubble, title/subtitle, optional
   progress bar and a right-side accessory (pill, avatar stack, chevron). */
export default function FeedItem({ icon, gradient = 'coral', title, subtitle, right, progress, progressColor, onPress, style }) {
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
      <GradientIconBubble icon={icon} gradient={gradient} size={42} radius={14} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.sub }]} numberOfLines={1}>{subtitle}</Text> : null}
        {progress != null && (
          <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
            <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: progressColor || '#2ED573' }]} />
          </View>
        )}
      </View>
      {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
    </Wrap>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 12, fontWeight: '500' },
  track: { height: 5, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
})
