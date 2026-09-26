import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GRADIENTS, useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LanguageContext'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const PALETTE = ['coral', 'mint', 'sunshine', 'lavender']

/* One row of the monthly recognition leaderboard. */
export default function LeaderboardRow({ rank, name, department, points, kudosCount, isMe }) {
  const { colors } = useTheme()
  const { tr } = useLang()
  return (
    <View style={[r.row, { backgroundColor: isMe ? `${colors.coral}14` : colors.card, borderColor: isMe ? colors.coral : colors.glassBorder }]}>
      <View style={r.rankWrap}>
        {MEDAL[rank]
          ? <Text style={r.medal}>{MEDAL[rank]}</Text>
          : <Text style={[r.rankNum, { color: colors.sub }]}>{rank}</Text>}
      </View>
      <LinearGradient colors={GRADIENTS[PALETTE[rank % PALETTE.length]]} style={r.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={r.avatarText}>{(name || '?').trim().charAt(0).toUpperCase()}</Text>
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[r.name, { color: colors.text }]} numberOfLines={1}>{name}{isMe ? tr(' (you)', ' (أنت)') : ''}</Text>
        <Text style={[r.dept, { color: colors.sub }]} numberOfLines={1}>{department} · {kudosCount} {tr('kudos', 'تقدير', 'شكر')}</Text>
      </View>
      <Text style={[r.points, { color: colors.coral }]}>{points} {tr('pts', 'نقطة', 'نقطة')}</Text>
    </View>
  )
}

const r = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 11, marginBottom: 8, gap: 10 },
  rankWrap:  { width: 22, alignItems: 'center' },
  medal:     { fontSize: 17 },
  rankNum:   { fontSize: 13, fontWeight: '800' },
  avatar:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText:{ color: 'white', fontWeight: '800', fontSize: 14 },
  name:      { fontSize: 13.5, fontWeight: '700' },
  dept:      { fontSize: 11, marginTop: 1 },
  points:    { fontSize: 13, fontWeight: '900' },
})
