import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/context/ThemeContext'
import { useLang } from '../src/context/LanguageContext'
import api from '../src/services/api'
import { ls, back } from '../src/utils/rtl'

// "5m ago" — tr and date come from useLang() in the calling component
const timeAgo = (iso, tr, date) => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return tr('Just now', 'منذ لحظات', 'دلوقتي')
  if (m < 60) return tr(`${m}m ago`, `منذ ${m} د`, `من ${m} د`)
  const h = Math.floor(m / 60)
  if (h < 24) return tr(`${h}h ago`, `منذ ${h} س`, `من ${h} س`)
  const d = Math.floor(h / 24)
  if (d < 7)  return tr(`${d}d ago`, `منذ ${d} يوم`, `من ${d} يوم`)
  return date(iso, { month: 'short', year: false })
}

const TYPE_META = {
  leave_reviewed:       { icon: '🏖️', color: '#8854D0', label: 'Leave' },
  leave_decided:        { icon: '🏖️', color: '#8854D0', label: 'Leave' },
  day_off_reviewed:     { icon: '🛏️', color: '#2BC4BE', label: 'Day Off' },
  attendance_reviewed:  { icon: '🕐', color: '#3b82f6', label: 'Attendance' },
  approval_required:    { icon: '📋', color: '#f59e0b', label: 'Approval' },
  checkout_reminder:    { icon: '⏰', color: '#FF6B6B', label: 'Reminder' },
  hr_reminder:          { icon: '🔔', color: '#2BC4BE', label: 'Reminder' },
}

const metaFor = type => TYPE_META[type] || { icon: '🔔', color: '#64748b', label: (type || 'Notification').replace(/_/g, ' ') }

export default function NotificationsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { tr } = useLang()
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=50')
      const rows = res.data.data || []
      setItems(rows)
      if (rows.some(item => !item.is_read)) {
        await api.patch('/notifications/read-all')
        setItems(current => current.map(item => ({ ...item, is_read: true })))
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handlePress = async item => {
    if (!item.is_read) {
      setItems(current => current.map(n => n.id === item.id ? { ...n, is_read: true } : n))
      api.patch(`/notifications/${item.id}/read`).catch(() => {})
    }
    const link = item.link || ''
    if (link.includes('my-approvals')) router.push('/manager-dashboard')
    else if (link.includes('payslip') || item.type?.includes('payroll')) router.push('/(tabs)/payslips')
    else if (link === '/') router.push('/(tabs)')
    else router.push('/(tabs)/requests')
  }

  // Group by today vs earlier
  const today = new Date().toISOString().split('T')[0]
  const todayItems   = items.filter(n => (n.created_at || '').startsWith(today))
  const earlierItems = items.filter(n => !(n.created_at || '').startsWith(today))

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[s.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backArrow, { color: colors.text }]}>{back}</Text>
          <Text style={[s.backText, { color: colors.text }]}>{tr('Back', 'رجوع')}</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>{tr('Notifications', 'الإشعارات')}</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#2BC4BE" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>🔔</Text>
              <Text style={[s.emptyTitle, { color: colors.text }]}>{tr('All caught up!', 'لا يوجد جديد!', 'كله تمام!')}</Text>
              <Text style={s.emptyText}>{tr('No notifications yet.', 'لا توجد إشعارات بعد.', 'لسه مفيش إشعارات.')}</Text>
            </View>
          ) : (
            <>
              {todayItems.length > 0 && (
                <>
                  <Text style={[s.groupLabel, { color: colors.muted }]}>{tr('Today', 'اليوم', 'النهارده')}</Text>
                  {todayItems.map(item => <NotifCard key={item.id} item={item} onPress={() => handlePress(item)} colors={colors} />)}
                </>
              )}
              {earlierItems.length > 0 && (
                <>
                  <Text style={[s.groupLabel, { color: colors.muted }]}>{tr('Earlier', 'سابقًا', 'قبل كده')}</Text>
                  {earlierItems.map(item => <NotifCard key={item.id} item={item} onPress={() => handlePress(item)} colors={colors} />)}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function NotifCard({ item, onPress, colors }) {
  const { tr, date, ar } = useLang()
  const meta = metaFor(item.type)
  const title = (ar && item.title_ar) || item.title || tr('Notification', 'إشعار')
  const subtitle = (ar && item.body_ar) || item.body || ''
  return (
    <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.iconBox, { backgroundColor: `${meta.color}18` }]}>
        <Text style={s.icon}>{meta.icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.cardTop}>
          <Text style={s.typeTag}>{meta.label}</Text>
          <Text style={s.time}>{timeAgo(item.created_at, tr, date)}</Text>
        </View>
        <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[s.sub, { color: colors.sub }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      {!item.is_read && <View style={[s.dot, { backgroundColor: meta.color }]} />}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#F0F4FA' },
  navBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow:  { fontSize: 20, color: '#0F1829' },
  backText:   { fontSize: 15, color: '#0F1829', fontWeight: '600' },
  navTitle:   { fontSize: 16, fontWeight: '800', color: '#0F1829' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:     { padding: 14, paddingBottom: 40 },
  groupLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: ls(0.5), marginTop: 8, marginBottom: 8, marginLeft: 2 },
  card:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  iconBox:    { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:       { fontSize: 22 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  typeTag:    { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: ls(0.4) },
  time:       { fontSize: 10, color: '#cbd5e1' },
  title:      { fontSize: 13, fontWeight: '700', color: '#0F1829', marginBottom: 2 },
  sub:        { fontSize: 11, color: '#64748b', textTransform: 'capitalize' },
  dot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  emptyBox:   { alignItems: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F1829', marginBottom: 6 },
  emptyText:  { fontSize: 14, color: '#94a3b8' },
})
