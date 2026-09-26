import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme, GRADIENTS } from '../../src/context/ThemeContext'
import api from '../../src/services/api'
import LeaderboardRow from '../../src/components/LeaderboardRow'
import KudosCard from '../../src/components/KudosCard'
import MoodSlider from '../../src/components/MoodSlider'
import { SkeletonCard } from '../../src/components/Skeleton'
import { ls, fwd } from '../../src/utils/rtl'
import { useLang } from '../../src/context/LanguageContext'

const categories = (tr) => [
  { v: 'teamwork',     emoji: '🤝', label: tr('Teamwork', 'روح الفريق') },
  { v: 'excellence',   emoji: '⭐', label: tr('Excellence', 'التميّز', 'تميّز') },
  { v: 'helping_hand', emoji: '🙌', label: tr('Helping Hand', 'يد العون', 'إيد المساعدة') },
  { v: 'innovation',   emoji: '💡', label: tr('Innovation', 'الابتكار', 'ابتكار') },
  { v: 'leadership',   emoji: '🧭', label: tr('Leadership', 'القيادة', 'قيادة') },
  { v: 'positivity',   emoji: '☀️', label: tr('Positivity', 'الإيجابية', 'طاقة إيجابية') },
]
const tabs = (tr) => [
  { key: 'feed', label: tr('Recognition', 'التقدير', 'الشكر') },
  { key: 'leaderboard', label: tr('Leaderboard', 'لوحة المتصدرين', 'الترتيب') },
  { key: 'directory', label: tr('Team', 'الفريق') },
]
const timeAgo = (iso, tr) => {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return tr('just now', 'منذ لحظات', 'دلوقتي')
  if (mins < 60) return tr(`${mins}m ago`, `منذ ${mins} د`, `من ${mins} د`)
  if (mins < 1440) return tr(`${Math.floor(mins / 60)}h ago`, `منذ ${Math.floor(mins / 60)} س`, `من ${Math.floor(mins / 60)} س`)
  return tr(`${Math.floor(mins / 1440)}d ago`, `منذ ${Math.floor(mins / 1440)} يوم`, `من ${Math.floor(mins / 1440)} يوم`)
}

export default function TeamScreen() {
  const { user } = useAuth()
  const { colors, isDark } = useTheme()
  const { tr, t } = useLang()
  const isLead = ['admin', 'hr_manager', 'manager'].includes(user?.role)

  const [tab, setTab] = useState('feed')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feed, setFeed] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [employees, setEmployees] = useState([])
  const [events, setEvents] = useState([])
  const [todayMood, setTodayMood] = useState(null)
  const [teamPulse, setTeamPulse] = useState(null)
  const [moodSaving, setMoodSaving] = useState(false)

  const [showGive, setShowGive] = useState(false)
  const [search, setSearch] = useState('')
  const [pickTo, setPickTo] = useState(null)
  const [category, setCategory] = useState('teamwork')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      const calls = [
        api.get('/kudos?limit=30'),
        api.get('/kudos/leaderboard'),
        api.get('/employees?limit=300&status=active'),
        api.get('/ai/context'),
        api.get('/pulse/today'),
      ]
      if (isLead) calls.push(api.get('/pulse/team-summary'))
      const results = await Promise.allSettled(calls)
      if (results[0].status === 'fulfilled') setFeed(results[0].value.data.data || [])
      if (results[1].status === 'fulfilled') setLeaderboard(results[1].value.data.data || [])
      if (results[2].status === 'fulfilled') {
        const raw = results[2].value.data.data
        setEmployees((Array.isArray(raw) ? raw : raw?.rows || []).filter(e => e.id !== user?.employee_id))
      }
      if (results[3].status === 'fulfilled') setEvents(results[3].value.data.data?.todayEvents || [])
      if (results[4].status === 'fulfilled') setTodayMood(results[4].value.data.data)
      if (isLead && results[5]?.status === 'fulfilled') setTeamPulse(results[5].value.data.data)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [isLead, user])

  useEffect(() => { load() }, [])

  const submitMood = async (mood) => {
    setMoodSaving(true)
    try {
      const r = await api.post('/pulse/checkin', { mood })
      setTodayMood(r.data.data)
    } catch { Alert.alert(tr('Error', 'خطأ', 'حصلت مشكلة'), tr('Could not save your check-in. Please try again.', 'تعذّر حفظ إجابتك. حاول مرة أخرى.', 'معرفناش نحفظ إجابتك. يلا نجرّب تاني.')) }
    finally { setMoodSaving(false) }
  }

  const openGive = (emp) => { setPickTo(emp || null); setCategory('teamwork'); setMessage(''); setSearch(''); setShowGive(true) }

  const submitKudos = async () => {
    if (!pickTo) { Alert.alert(tr('Pick a colleague', 'اختر زميلًا', 'اختار زميل'), tr('Choose who you want to recognize first.', 'اختر أولًا الزميل الذي تريد تقديره.', 'اختار الأول الزميل اللي هنشكره.')); return }
    setSending(true)
    try {
      await api.post('/kudos', { to_employee_id: pickTo.id, category, message: message.trim() })
      setShowGive(false)
      await load()
      Alert.alert(tr('🎉 Sent!', '🎉 تم الإرسال!', '🎉 اتبعت!'), tr(`Your kudos to ${pickTo.first_name} ${pickTo.last_name} is on its way.`, `تم إرسال تقديرك إلى ${pickTo.first_name} ${pickTo.last_name}.`, `الشكر اتبعت لـ ${pickTo.first_name} ${pickTo.last_name}.`))
    } catch (err) {
      Alert.alert(tr('Error', 'خطأ', 'حصلت مشكلة'), err.response?.data?.message || tr('Failed to send kudos.', 'تعذّر إرسال التقدير.', 'معرفناش نبعت الشكر. يلا نجرّب تاني.'))
    } finally { setSending(false) }
  }

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(q))
  }, [employees, search])

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <SkeletonCard rows={2} style={{ marginBottom: 14 }} />
        <SkeletonCard rows={2} />
      </ScrollView>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.coral} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.text }]}>{t('tab_team')}</Text>
          <TouchableOpacity onPress={() => openGive()} activeOpacity={0.85}>
            <LinearGradient colors={GRADIENTS.lavender} style={s.giveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={s.giveBtnText}>+ {tr('Give Kudos', 'أرسل تقديرًا', 'اشكر زميل')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Celebrations */}
        {events.length > 0 && (
          <View style={[s.celebrateCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            {events.map((e, i) => (
              <Text key={i} style={[s.celebrateText, { color: colors.text2 }]}>
                {e.type === 'birthday' ? '🎂' : '🎉'} {e.name} — {e.type === 'birthday' ? tr('Happy Birthday!', 'عيد ميلاد سعيد!') : tr('Work Anniversary!', 'ذكرى سنوية للعمل معنا!', 'سنة جديدة معانا!')}
              </Text>
            ))}
          </View>
        )}

        {/* Mood check-in */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder, shadowColor: isDark ? '#000' : '#8890B5' }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>{tr("How's your day going?", 'كيف يسير يومك؟', 'يومك ماشي إزاي؟')}</Text>
          <Text style={[s.cardSub, { color: colors.sub }]}>
            {todayMood ? tr('Thanks for checking in today!', 'شكرًا لمشاركتك اليوم!', 'شكرًا إنك شاركتنا النهارده!') : tr('Only the team average is ever shared — your answer stays private.', 'لا يُعرض إلا متوسط الفريق، وتبقى إجابتك سرية.', 'بنعرض متوسط الفريق بس — إجابتك بتفضل سرية.')}
          </Text>
          <MoodSlider value={todayMood?.mood} onChange={submitMood} disabled={moodSaving} />
        </View>

        {/* Manager/HR aggregate */}
        {isLead && teamPulse && (
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder, shadowColor: isDark ? '#000' : '#8890B5' }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>{tr('Team pulse today', 'نبض الفريق اليوم', 'نبض الفريق النهارده')}</Text>
            <Text style={[s.pulseBig, { color: colors.coral }]}>
              {teamPulse.today.avg_mood ? `${teamPulse.today.avg_mood} / 5` : '—'}
            </Text>
            <Text style={[s.cardSub, { color: colors.sub }]}>
              {tr(`${teamPulse.today.responses} of ${teamPulse.headcount} checked in today`, `شارك ${teamPulse.today.responses} من ${teamPulse.headcount} اليوم`, `${teamPulse.today.responses} من ${teamPulse.headcount} شاركوا النهارده`)}
            </Text>
          </View>
        )}

        {/* Tabs */}
        <View style={s.tabRow}>
          {tabs(tr).map(tb => (
            <TouchableOpacity key={tb.key} onPress={() => setTab(tb.key)} activeOpacity={0.8}
              style={[s.tabBtn, tab === tb.key && { backgroundColor: colors.coral }]}>
              <Text style={[s.tabText, { color: tab === tb.key ? 'white' : colors.sub }]}>{tb.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'feed' && (
          feed.length === 0
            ? <Text style={{ color: colors.sub, textAlign: 'center', marginTop: 20 }}>{tr('No kudos yet — be the first to recognize a teammate!', 'لا توجد تقديرات بعد — كن أول من يقدّر زميلًا!', 'لسه مفيش شكر — يلا نبدأ ونشكر زميل!')}</Text>
            : feed.map(k => (
              <KudosCard key={k.id} emoji={k.emoji} fromName={k.from_name} toName={k.to_name}
                category={k.category} message={k.message} points={k.points} when={timeAgo(k.created_at, tr)} />
            ))
        )}

        {tab === 'leaderboard' && (
          leaderboard.length === 0
            ? <Text style={{ color: colors.sub, textAlign: 'center', marginTop: 20 }}>{tr('No kudos given this month yet.', 'لم تُمنح تقديرات هذا الشهر بعد.', 'لسه مفيش شكر الشهر ده.')}</Text>
            : leaderboard.map((r, i) => (
              <LeaderboardRow key={r.employee_id} rank={i + 1} name={r.name} department={r.department}
                points={r.points} kudosCount={r.kudos_count} isMe={r.employee_id === user?.employee_id} />
            ))
        )}

        {tab === 'directory' && (
          employees.length === 0
            ? <Text style={{ color: colors.sub, textAlign: 'center', marginTop: 20 }}>{tr('No colleagues found.', 'لم يتم العثور على زملاء.', 'مش لاقيين زملاء.')}</Text>
            : employees.map(e => (
              <TouchableOpacity key={e.id} onPress={() => openGive(e)} activeOpacity={0.8}
                style={[s.dirRow, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                <View style={[s.dirAvatar, { backgroundColor: `${colors.lavender}33` }]}>
                  <Text style={{ color: colors.lavender, fontWeight: '800' }}>{e.first_name?.[0]}{e.last_name?.[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.dirName, { color: colors.text }]}>{e.first_name} {e.last_name}</Text>
                  <Text style={[s.dirRole, { color: colors.sub }]} numberOfLines={1}>{[e.position_title, e.department_name].filter(Boolean).join(' · ') || '—'}</Text>
                </View>
                <Text style={{ color: colors.lavender, fontSize: 12, fontWeight: '700' }}>{tr('Kudos', 'تقدير', 'اشكر')} {fwd}</Text>
              </TouchableOpacity>
            ))
        )}
      </ScrollView>

      {/* Give Kudos modal */}
      <Modal visible={showGive} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGive(false)}>
        <SafeAreaView style={[s.modalSafe, { backgroundColor: colors.bg }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{tr('Give Kudos', 'أرسل تقديرًا', 'اشكر زميل')}</Text>
            <TouchableOpacity onPress={() => setShowGive(false)}>
              <Text style={{ fontSize: 22, color: colors.sub }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={[s.formLabel, { color: colors.sub }]}>{tr('To', 'إلى', 'لمين')}</Text>
            {pickTo ? (
              <TouchableOpacity onPress={() => setPickTo(null)} style={[s.pickedRow, { backgroundColor: colors.cardAlt }]}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{pickTo.first_name} {pickTo.last_name}</Text>
                <Text style={{ color: colors.sub, fontSize: 12 }}>{tr('Change', 'تغيير', 'غيّر')}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={[s.input, { borderColor: colors.border2, backgroundColor: colors.input, color: colors.text }]}
                  placeholder={tr('Search colleague…', 'ابحث عن زميل…', 'دوّر على زميل…')} placeholderTextColor={colors.muted}
                  value={search} onChangeText={setSearch}
                />
                <ScrollView style={{ maxHeight: 160, marginTop: 8 }} nestedScrollEnabled>
                  {filteredEmployees.slice(0, 30).map(e => (
                    <TouchableOpacity key={e.id} onPress={() => setPickTo(e)} style={s.pickOption}>
                      <Text style={{ color: colors.text }}>{e.first_name} {e.last_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={[s.formLabel, { color: colors.sub, marginTop: 18 }]}>{tr('Category', 'الفئة', 'النوع')}</Text>
            <View style={s.catGrid}>
              {categories(tr).map(c => (
                <TouchableOpacity key={c.v} onPress={() => setCategory(c.v)} activeOpacity={0.8}
                  style={[s.catChip, { borderColor: category === c.v ? colors.lavender : colors.border2, backgroundColor: category === c.v ? `${colors.lavender}22` : colors.cardAlt }]}>
                  <Text>{c.emoji}</Text>
                  <Text style={[s.catText, { color: category === c.v ? colors.lavender : colors.text2 }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.formLabel, { color: colors.sub, marginTop: 18 }]}>{tr('Message (optional)', 'رسالة (اختياري)', 'رسالة (مش إجباري)')}</Text>
            <TextInput
              style={[s.input, s.textarea, { borderColor: colors.border2, backgroundColor: colors.input, color: colors.text }]}
              placeholder={tr('What did they do?', 'ما الذي قام به؟', 'عمل إيه حلو؟')} placeholderTextColor={colors.muted}
              value={message} onChangeText={setMessage} multiline numberOfLines={4} textAlignVertical="top"
            />

            <TouchableOpacity onPress={submitKudos} disabled={sending} activeOpacity={0.85} style={{ marginTop: 22, marginBottom: 40 }}>
              <LinearGradient colors={GRADIENTS.lavender} style={[s.submitBtn, sending && { opacity: 0.6 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {sending ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>{tr('Send Kudos', 'إرسال التقدير', 'ابعت الشكر')}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 130 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900' },
  giveBtn: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  giveBtnText: { color: 'white', fontWeight: '800', fontSize: 12.5 },
  celebrateCard: { borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 12, gap: 4 },
  celebrateText: { fontSize: 12.5, fontWeight: '700' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 14, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 4 },
  cardSub: { fontSize: 12, marginBottom: 12, lineHeight: 16 },
  pulseBig: { fontSize: 30, fontWeight: '900', marginBottom: 2 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  tabText: { fontSize: 12.5, fontWeight: '800' },
  dirRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 8 },
  dirAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dirName: { fontSize: 13.5, fontWeight: '700' },
  dirRole: { fontSize: 11.5, marginTop: 1 },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  formLabel: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: ls(0.4), marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 14, padding: 13, fontSize: 14 },
  textarea: { minHeight: 100 },
  pickedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: 13 },
  pickOption: { paddingVertical: 10, paddingHorizontal: 4 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  catText: { fontSize: 12, fontWeight: '700' },
  submitBtn: { borderRadius: 16, padding: 16, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 15, fontWeight: '800' },
})
