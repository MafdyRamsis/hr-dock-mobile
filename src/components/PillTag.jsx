import { View, Text, StyleSheet } from 'react-native'

/* Full-pill tag — used for category chips, priority markers, leave types. */
export default function PillTag({ label, color = '#8854D0', bg, textColor, icon, size = 'md', style }) {
  const isSm = size === 'sm'
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bg || `${color}1A`, paddingHorizontal: isSm ? 9 : 12, paddingVertical: isSm ? 4 : 6 },
        style,
      ]}
    >
      {icon ? <Text style={{ fontSize: isSm ? 10 : 12, marginRight: 4 }}>{icon}</Text> : null}
      <Text style={[styles.text, { color: textColor || color, fontSize: isSm ? 10 : 11.5 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontWeight: '700' },
})
