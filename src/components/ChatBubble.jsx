import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GRADIENTS, useTheme } from '../context/ThemeContext'

/* One message bubble in the Dock AI assistant chat — user (right, gradient)
   or assistant (left, glass card). */
export default function ChatBubble({ role, text }) {
  const { colors, isDark } = useTheme()
  const isUser = role === 'user'
  if (isUser) {
    return (
      <View style={[cb.row, { justifyContent: 'flex-end' }]}>
        <LinearGradient colors={GRADIENTS.coral} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[cb.bubble, cb.userBubble]}>
          <Text style={cb.userText}>{text}</Text>
        </LinearGradient>
      </View>
    )
  }
  return (
    <View style={[cb.row, { justifyContent: 'flex-start' }]}>
      <View style={cb.aiAvatar}>
        <Text style={{ fontSize: 13 }}>✨</Text>
      </View>
      <View style={[cb.bubble, cb.aiBubble, { backgroundColor: colors.card, borderColor: colors.glassBorder, shadowColor: isDark ? '#000' : '#8890B5' }]}>
        <Text style={[cb.aiText, { color: colors.text2 }]}>{text}</Text>
      </View>
    </View>
  )
}

const cb = StyleSheet.create({
  row:       { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  bubble:    { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble:{ borderBottomRightRadius: 4 },
  userText:  { color: 'white', fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  aiAvatar:  { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(124,108,255,0.18)', alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 2 },
  aiBubble:  { borderBottomLeftRadius: 4, borderWidth: 1, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 1 },
  aiText:    { fontSize: 13.5, lineHeight: 19, fontWeight: '500' },
})
