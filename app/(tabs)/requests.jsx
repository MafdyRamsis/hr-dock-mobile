// Requests: one list of everything this person has asked for — leave,
// missions, permissions, overtime, expenses, HR tickets… — newest first, with
// All / Pending / Approved / Rejected filters. "New" opens every request type.
// Each kind of request still lives in its own table on the server; the
// sources and how their rows are shown are in src/requests/catalog.js.
import { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import { useLang } from '../../src/context/LanguageContext'
import api from '../../src/services/api'
import { listSources, toItems, sortItems, FILTERS, matchesFilter, STATUS_LABEL, resolveType, ALIASES } from '../../src/requests/catalog'

const PILL = {
  pending:   ['#FFF4DE', '#8A5A00'],
  approved:  ['#E6F6F7', '#0E6A70'],
  rejected:  ['#FFEDEA', '#9E3322'],
  cancelled: ['#EFEDE7', '#56657A'],
  draft:     ['#EFEDE7', '#56657A'],
}

export default function Requests() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { colors } = useTheme()
  const { tr, ar, date } = useLang()
  const { user, can = () => true } = useAuth() || {}
  const T = l => (l ? (ar ? l[1] : l[0]) : '')
  const [items, setItems] = useState([])
  const [failed, setFailed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState(FILTERS.some(f => f.key === params.filter) ? params.filter : 'all')
  const [open, setOpen] = useState(null)
  const seq = useRef(0)

  // Old links (Home → "request a correction") open a form straight away.
  useEffect(() => {
    const k = params.open && (ALIASES[params.open] || params.open)
    if (k && resolveType(k)) router.push({ pathname: '/request-form', params: { type: k } })
  }, [params.open])
  useEffect(() => { if (params.filter && FILTERS.some(f => f.key === params.filter)) setFilter(params.filter) }, [params.filter, params.sent])

  const load = useCallback(async () => {
    const mySeq = ++seq.current
    const sources = listSources({ employeeId: user?.employee_id, userId: user?.id, can, role: user?.role })
    const res = await Promise.allSettled(sources.map(s => api.get(s.path)))
    if (mySeq !== seq.current) return
    const all = []
    let bad = 0
    res.forEach((r, i) => {
      if (r.status === 'fulfilled') all.push(...toItems(sources[i], r.value?.data?.data))
      else if (r.reason?.response?.status !== 403) bad++   // 403 = switched off for this company/role
    })
    setItems(sortItems(all))
    setFailed(bad)
    setLoading(false); setRefreshing(false)
  }, [user?.employee_id, user?.id, user?.role])

  // Reload whenever the tab is shown, so a request sent a moment ago is there.
  useFocusEffect(useCallback(() => { load() }, [load]))

  const shown = items.filter(i => matchesFilter(i, filter))
  const count = k => items.filter(i => matchesFilter(i, k)).length

  const titleOf = i => i.title ? T(i.title) : T(resolveType(i.type)?.label) || i.type
  const whenOf = i => {
    if (!i.from) return ''
    const a = date(i.from, { weekday: 'short', year: false })
    return i.to && i.to !== i.from ? `${a} – ${date(i.to, { year: false })}` : a
  }
  const statusText = i => (i.type === 'helpdesk' && i.status === 'approved' ? tr('Done', 'تم') : T(STATUS_LABEL[i.status]))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={st.head}>
        <Text accessibilityRole="header" style={[st.title, { color: colors.text }]}>
          {['manager', 'admin', 'hr_manager', 'ceo'].includes(user?.role) ? tr('My requests', 'طلباتي') : tr('Requests', 'الطلبات')}
        </Text>
        {can('requests') && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={tr('New request', 'طلب جديد')} onPress={() => router.push('/new-request')}
            style={[st.newBtn, { backgroundColor: colors.isDark ? colors.primary : colors.text }]}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={st.newText}>{tr('New', 'جديد')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.chips}>
        {FILTERS.map(f => {
          const on = filter === f.key
          const n = f.key === 'all' ? null : count(f.key)
          return (
            <TouchableOpacity key={f.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setFilter(f.key)}
              style={[st.chip, { backgroundColor: on ? colors.text : colors.card, borderColor: on ? colors.text : colors.border }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? colors.card : colors.sub }}>{T(f.label)}{n ? ` · ${n}` : ''}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.primary} />}
      >
        {failed > 0 && !loading && (
          <View style={st.warn}><Text style={{ color: '#8A5A00', fontSize: 13 }}>
            {tr('Some requests could not be loaded. Pull down to try again.', 'تعذّر تحميل بعض الطلبات. اسحب للأسفل لإعادة المحاولة.')}
          </Text></View>
        )}
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : !shown.length ? (
          <View style={[st.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={28} color={colors.muted} />
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 8 }}>
              {filter === 'all' ? tr('No requests yet', 'لا توجد طلبات بعد') : tr('Nothing here', 'لا يوجد شيء هنا')}
            </Text>
            {filter === 'all' && can('requests') && (
              <Text style={{ color: colors.sub, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                {tr('Tap New to ask for leave, a mission, overtime, a letter and more.', 'اضغط جديد لطلب إجازة أو مأمورية أو ساعات إضافية أو خطاب وغيرها.')}
              </Text>
            )}
          </View>
        ) : (
          <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {shown.map((i, n) => {
              const [bg, fg] = PILL[i.status] || PILL.pending
              const expanded = open === i.id
              return (
                <TouchableOpacity key={i.id} activeOpacity={0.7} accessibilityRole="button"
                  accessibilityLabel={`${titleOf(i)}, ${whenOf(i)}, ${statusText(i)}`}
                  onPress={() => setOpen(expanded ? null : i.id)}
                  style={[st.row, n > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }} numberOfLines={1}>{titleOf(i)}</Text>
                      <Text style={{ fontSize: 12, color: colors.sub, marginTop: 2 }} numberOfLines={1}>
                        {[whenOf(i), T(i.detail)].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colors.isDark ? colors.cardAlt : bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.isDark ? colors.text : fg }}>{statusText(i)}</Text>
                    </View>
                  </View>
                  {expanded && (
                    <View style={{ marginTop: 8 }}>
                      {!!i.created_at && <Text style={{ fontSize: 12, color: colors.sub }}>{tr('Sent', 'أُرسل')} {date(i.created_at)}</Text>}
                      {!!i.note && <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>{i.status === 'rejected' ? tr('Reason: ', 'السبب: ') : ''}{i.note}</Text>}
                      {i.status === 'draft' && <Text style={{ fontSize: 12, color: colors.sub, marginTop: 4 }}>{tr('Not sent yet — open Expenses to send it.', 'لم يُرسل بعد — افتح المصروفات لإرساله.')}</Text>}
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700' },
  newBtn: { height: 40, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  newText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  chips: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { paddingHorizontal: 14, paddingVertical: 12, minHeight: 56, justifyContent: 'center' },
  empty: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: 'center' },
  warn: { backgroundColor: '#FFF4DE', borderRadius: 12, padding: 12, marginBottom: 12 },
})
