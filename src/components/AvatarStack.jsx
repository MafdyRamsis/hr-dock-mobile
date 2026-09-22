import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GRADIENTS } from '../context/ThemeContext'

const PALETTE = ['coral', 'mint', 'sunshine', 'lavender']

/* Overlapping initials avatars — team/manager context, approvers, etc. */
export default function AvatarStack({ names = [], size = 26, max = 4 }) {
  const shown = names.slice(0, max)
  const overflow = Math.max(0, names.length - max)
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((n, i) => (
        <LinearGradient
          key={i}
          colors={GRADIENTS[PALETTE[i % PALETTE.length]]}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, marginLeft: i === 0 ? 0 : -size * 0.32 }]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{(n || '?').trim().charAt(0).toUpperCase()}</Text>
        </LinearGradient>
      ))}
      {overflow > 0 && (
        <View style={[styles.avatar, styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.32 }]}>
          <Text style={[styles.initial, { fontSize: size * 0.34 }]}>+{overflow}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  more: { backgroundColor: '#8A8DA3' },
  initial: { color: 'white', fontWeight: '800' },
})
