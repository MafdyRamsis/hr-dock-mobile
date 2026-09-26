import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { ls, fwd } from '../utils/rtl'
import { useLang } from '../context/LanguageContext'

const catLabel = (tr) => ({
  teamwork:     tr('Teamwork', 'روح الفريق', 'روح الفريق'),
  excellence:   tr('Excellence', 'التميّز', 'تميّز'),
  helping_hand: tr('Helping Hand', 'يد العون', 'إيد المساعدة'),
  innovation:   tr('Innovation', 'الابتكار', 'ابتكار'),
  leadership:   tr('Leadership', 'القيادة', 'قيادة'),
  positivity:   tr('Positivity', 'الإيجابية', 'طاقة إيجابية'),
})

/* One row in the company recognition feed. */
export default function KudosCard({ emoji, fromName, toName, category, message, points, when }) {
  const { colors } = useTheme()
  const { tr } = useLang()
  return (
    <View style={[k.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
      <View style={k.top}>
        <Text style={k.emoji}>{emoji}</Text>
        <Text style={[k.names, { color: colors.text }]} numberOfLines={1}>
          <Text style={{ fontWeight: '800' }}>{fromName}</Text> {fwd} <Text style={{ fontWeight: '800' }}>{toName}</Text>
        </Text>
        <Text style={[k.points, { color: colors.mint }]}>+{points}</Text>
      </View>
      {!!message && <Text style={[k.message, { color: colors.text2 }]}>{message}</Text>}
      <View style={k.bottom}>
        <Text style={[k.cat, { color: colors.sub }]}>{catLabel(tr)[category] || category}</Text>
        {!!when && <Text style={[k.when, { color: colors.muted }]}>{when}</Text>}
      </View>
    </View>
  )
}

const k = StyleSheet.create({
  card:    { borderRadius: 14, borderWidth: 1, padding: 13, marginBottom: 9 },
  top:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji:   { fontSize: 18 },
  names:   { flex: 1, fontSize: 13 },
  points:  { fontSize: 13, fontWeight: '900' },
  message: { fontSize: 12.5, marginTop: 7, lineHeight: 17 },
  bottom:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cat:     { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: ls(0.4) },
  when:    { fontSize: 10.5 },
})
