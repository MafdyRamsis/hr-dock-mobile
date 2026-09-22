import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import api from '../../src/services/api'
import { useTheme, GRADIENTS } from '../../src/context/ThemeContext'
import StreakFlame from '../../src/components/StreakFlame'
import BadgeChip from '../../src/components/BadgeChip'
import InsightCard from '../../src/components/InsightCard'
import ChatBubble from '../../src/components/ChatBubble'
import { SkeletonCard } from '../../src/components/Skeleton'

const QUICK_PROMPTS = [
  { icon: '🏖️', label: 'Leave balance', q: 'What is my leave balance?' },
  { icon: '💰', label: 'Latest payslip', q: 'What was my latest payslip?' },
  { icon: '🔥', label: 'My streak', q: 'What is my check-in streak?' },
  { icon: '📝', label: 'Pending requests', q: 'Do I have any pending requests?' },
  { icon: '🎉', label: 'Kudos', q: 'How many kudos do I have this month?' },
]

export default function PulseScreen() {
  const { colors, isDark } = useTheme()
  const scrollRef = useRef(null)

  const [ctx,        setCtx]        = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [messages,   setMessages]   = useState([
    { role: 'assistant', text: "Hi, I'm Dock AI — ask me about your leave balance, latest payslip, streak, pending requests, or kudos." },
  ])
  const [input,   setInput]   = useState('')
  const [asking,  setAsking]  = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/ai/context')
      setCtx(r.data.data || {})
    } catch { setCtx({}) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const ask = async (question) => {
    const q = (question || input).trim()
    if (!q || asking) return
    setMessages(m => [...m, { role: 'user', text: q }])
    setInput('')
    setAsking(true)
    try {
      const r = await api.post('/ai/ask', { question: q })
      setMessages(m => [...m, { role: 'assistant', text: r.data.answer || "I'm not sure — try asking about leave, payslips, streaks, requests, or kudos." }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Something went wrong reaching Dock AI — please try again.' }])
    } finally {
      setAsking(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  const badges  = ctx?.badges || []
  const insights = ctx?.insights || []
  const streak  = ctx?.streak?.days || 0

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <SkeletonCard rows={2} style={{ marginBottom: 14 }} />
        <SkeletonCard rows={1} />
      </ScrollView>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.coral} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={[s.eyebrow, { color: colors.sub }]}>DOCK AI</Text>
              <Text style={[s.title, { color: colors.text }]}>Pulse</Text>
            </View>
            <StreakFlame days={streak} />
          </View>

          {/* Badges */}
          {badges.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }} contentContainerStyle={{ gap: 10 }}>
              {badges.map(b => <BadgeChip key={b.id} emoji={b.emoji} label={b.label} description={b.description} unlocked={b.unlocked} />)}
            </ScrollView>
          )}

          {/* Insights */}
          <Text style={[s.section, { color: colors.sub }]}>Insights for you</Text>
          {insights.length === 0
            ? <Text style={{ color: colors.sub, fontSize: 13, marginBottom: 8 }}>Nothing new right now.</Text>
            : insights.map((i, idx) => <InsightCard key={idx} icon={i.icon} text={i.text} />)}

          {/* Chat */}
          <Text style={[s.section, { color: colors.sub, marginTop: 10 }]}>Ask Dock AI</Text>
          <View style={[s.chatCard, { backgroundColor: colors.card, borderColor: colors.glassBorder, shadowColor: isDark ? '#000' : '#8890B5' }]}>
            {messages.map((m, i) => <ChatBubble key={i} role={m.role} text={m.text} />)}
            {asking && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <ActivityIndicator size="small" color={colors.coral} />
                <Text style={{ color: colors.sub, fontSize: 12 }}>Dock AI is thinking…</Text>
              </View>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
            {QUICK_PROMPTS.map(p => (
              <TouchableOpacity key={p.label} onPress={() => ask(p.q)} activeOpacity={0.8}
                style={[s.chip, { backgroundColor: colors.cardAlt, borderColor: colors.glassBorder }]}>
                <Text style={{ fontSize: 13 }}>{p.icon}</Text>
                <Text style={[s.chipText, { color: colors.text2 }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[s.inputRow, { backgroundColor: colors.input, borderColor: colors.border2 }]}>
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholder="Ask about leave, payslips, streaks…"
              placeholderTextColor={colors.muted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => ask()}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={() => ask()} disabled={asking || !input.trim()} activeOpacity={0.85}>
              <LinearGradient colors={GRADIENTS.coral} style={[s.sendBtn, (asking || !input.trim()) && { opacity: 0.5 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={{ color: 'white', fontSize: 16 }}>➤</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { padding: 16, paddingBottom: 130 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 2 },
  title:   { fontSize: 26, fontWeight: '900' },
  section: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  chatCard:{ borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 12, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipText:{ fontSize: 12, fontWeight: '700' },
  inputRow:{ flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, gap: 8 },
  input:   { flex: 1, fontSize: 14, paddingVertical: 8 },
  sendBtn: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
})
