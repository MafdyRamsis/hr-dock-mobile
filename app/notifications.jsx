import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'
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

const STATUS_META = {
  approved:    { icon: '✅', color: '#16a34a' },
  rejected:    { icon: '❌', color: '#dc2626' },
  pending:     { icon: '⏳', color: '#f59e0b' },
  in_progress: { icon: '🔄', color: '#3b82f6' },
  resolved:    { icon: '✅', color: '#16a34a' },
  closed:      { icon: '🔒', color: '#64748b' },
}

const CAT_COLORS = { event: '#1d4ed8', policy: '#92400e', hr: '#166534', general: '#475569' }

const typeLabel = (type, tr) => ({
  request:      tr('HR Request', 'طلب موارد بشرية', 'طلب HR'),
  permission:   tr('Permission', 'إذن'),
  announcement: tr('Announcement', 'إعلان'),
  payroll:      tr('Payroll', 'الرواتب', 'المرتبات'),
}[type] || type)

const statusLabel = (status, tr) => ({
  approved:    tr('approved', 'تمت الموافقة', 'اتوافق عليه'),
  rejected:    tr('rejected', 'مرفوض', 'اترفض'),
  pending:     tr('pending', 'قيد الانتظار', 'مستني رد'),
  in_progress: tr('in progress', 'قيد التنفيذ', 'شغالين عليه'),
  resolved:    tr('resolved', 'تم الحل', 'اتحل'),
  closed:      tr('closed', 'مغلق', 'اتقفل'),
}[status] || (status || '').replace(/_/g, ' '))

const categoryLabel = (cat, tr) => ({
  event:   tr('Event', 'فعالية'),
  policy:  tr('Policy', 'سياسة'),
  hr:      tr('HR', 'الموارد البشرية', 'HR'),
  general: tr('General', 'عام'),
}[cat] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : tr('General', 'عام')))

// Title / subtitle are built at render time so they follow the current language.
const describe = (n, tr, date) => {
  const st = tr(`Status: ${statusLabel(n.status, tr)}`, `الحالة: ${statusLabel(n.status, tr)}`)
  switch (n.kind) {
    case 'ticket': return { title: n.subject, subtitle: st }
    case 'wfh':    return { title: tr(`Work From Home – ${date(n.day)}`, `العمل من المنزل – ${date(n.day)}`, `شغل من البيت – ${date(n.day)}`), subtitle: st }
    case 'ot':     return { title: tr(`Overtime – ${date(n.day)}`, `العمل الإضافي – ${date(n.day)}`, `أوفر تايم – ${date(n.day)}`), subtitle: st }
    case 'ann':    return { title: n.subject, subtitle: tr(`${categoryLabel(n.category, tr)} announcement`, `إعلان – ${categoryLabel(n.category, tr)}`) }
    case 'pay':    return {
      title: tr('Payslip Available', 'قسيمة الراتب متاحة', 'قسيمة المرتب نزلت'),
      subtitle: `${date(n.from)} – ${date(n.to)}`,
    }
    default:       return { title: n.subject || '', subtitle: '' }
  }
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const { tr } = useLang()
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      // Self-scope every source: without this, an admin/hr_manager/manager
      // account saw every helpdesk ticket, WFH/overtime request and payroll
      // run in the whole company here, mislabeled as "your notifications"
      // (confirmed live against production).
      const empQS = user?.employee_id ? `&employee_id=${user.employee_id}` : ''
      const [tickRes, wfhRes, otRes, annRes, payRes] = await Promise.allSettled([
        api.get('/helpdesk?limit=20&mine=1'),
        api.get(`/wfh?limit=50${empQS}`),
        api.get(`/overtime?limit=50${empQS}`),
        api.get('/announcements?limit=10'),
        api.get('/payroll/runs?limit=5&mine=1'),
      ])

      const notifications = []

      if (tickRes.status === 'fulfilled') {
        const tickets = tickRes.value.data.data || []
        tickets.forEach(t => {
          const meta = STATUS_META[t.status] || {}
          notifications.push({
            id:       `tick-${t.id}`,
            type:     'request',
            icon:     meta.icon  || '📋',
            color:    meta.color || '#64748b',
            kind:     'ticket',
            subject:  t.subject,
            status:   t.status,
            time:     t.updated_at || t.created_at,
            isNew:    t.status !== 'pending',
          })
        })
      }

      if (wfhRes.status === 'fulfilled') {
        const list = wfhRes.value.data.data || []
        list.forEach(w => {
          const meta = STATUS_META[w.status] || {}
          notifications.push({
            id:       `wfh-${w.id}`,
            type:     'permission',
            icon:     meta.icon  || '🏠',
            color:    meta.color || '#2BC4BE',
            kind:     'wfh',
            day:      (w.date || '').split('T')[0],
            status:   w.status,
            time:     w.updated_at || w.created_at,
            isNew:    w.status !== 'pending',
          })
        })
      }

      if (otRes.status === 'fulfilled') {
        const list = otRes.value.data.data || []
        list.forEach(o => {
          const meta = STATUS_META[o.status] || {}
          notifications.push({
            id:       `ot-${o.id}`,
            type:     'permission',
            icon:     meta.icon  || '⏱️',
            color:    meta.color || '#f59e0b',
            kind:     'ot',
            day:      (o.date || '').split('T')[0],
            status:   o.status,
            time:     o.updated_at || o.created_at,
            isNew:    o.status !== 'pending',
          })
        })
      }

      if (annRes.status === 'fulfilled') {
        const list = annRes.value.data.data || []
        list.forEach(a => {
          notifications.push({
            id:       `ann-${a.id}`,
            type:     'announcement',
            icon:     a.pinned ? '📌' : '📢',
            color:    CAT_COLORS[a.category] || '#475569',
            kind:     'ann',
            subject:  a.title,
            category: a.category,
            time:     a.created_at,
            isNew:    true,
          })
        })
      }

      if (payRes.status === 'fulfilled') {
        const list = payRes.value.data.data || []
        list.forEach(p => {
          if (p.status === 'processed' || p.status === 'published') {
            notifications.push({
              id:       `pay-${p.id}`,
              type:     'payroll',
              icon:     '💰',
              color:    '#16a34a',
              kind:     'pay',
              from:     (p.period_start || '').split('T')[0],
              to:       (p.period_end || '').split('T')[0],
              time:     p.updated_at || p.created_at,
              isNew:    true,
            })
          }
        })
      }

      notifications.sort((a, b) => new Date(b.time) - new Date(a.time))
      setItems(notifications.slice(0, 30))
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

  const handlePress = item => {
    if (item.type === 'announcement') router.push('/announcements')
    else if (item.type === 'payroll') router.push('/(tabs)/payslips')
    else router.push('/(tabs)/requests')
  }

  // Group by today vs earlier
  const today = new Date().toISOString().split('T')[0]
  const todayItems   = items.filter(n => (n.time || '').startsWith(today))
  const earlierItems = items.filter(n => !(n.time || '').startsWith(today))

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
  const { tr, date } = useLang()
  const { title, subtitle } = describe(item, tr, date)
  return (
    <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.iconBox, { backgroundColor: `${item.color}18` }]}>
        <Text style={s.icon}>{item.icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.cardTop}>
          <Text style={s.typeTag}>{typeLabel(item.type, tr)}</Text>
          <Text style={s.time}>{timeAgo(item.time, tr, date)}</Text>
        </View>
        <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[s.sub, { color: colors.sub }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      {item.isNew && <View style={[s.dot, { backgroundColor: item.color }]} />}
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
