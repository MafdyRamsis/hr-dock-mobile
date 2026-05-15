import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'

const timeAgo = iso => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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

const TYPE_LABELS = {
  request:      'HR Request',
  permission:   'Permission',
  announcement: 'Announcement',
  payroll:      'Payroll',
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [tickRes, wfhRes, otRes, annRes, payRes] = await Promise.allSettled([
        api.get('/helpdesk?limit=20'),
        api.get('/wfh'),
        api.get('/overtime'),
        api.get('/announcements?limit=10'),
        api.get('/payroll/runs?limit=5'),
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
            title:    t.subject,
            subtitle: `Status: ${(t.status || '').replace('_', ' ')}`,
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
            title:    `Work From Home – ${(w.date || '').split('T')[0]}`,
            subtitle: `Status: ${(w.status || '').replace('_', ' ')}`,
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
            title:    `Overtime – ${(o.date || '').split('T')[0]}`,
            subtitle: `Status: ${(o.status || '').replace('_', ' ')}`,
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
            title:    a.title,
            subtitle: `${a.category ? a.category.charAt(0).toUpperCase() + a.category.slice(1) : 'General'} announcement`,
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
              title:    'Payslip Available',
              subtitle: `${(p.period_start || '').split('T')[0]} – ${(p.period_end || '').split('T')[0]}`,
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
  }, [])

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
          <Text style={[s.backArrow, { color: colors.text }]}>←</Text>
          <Text style={[s.backText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>Notifications</Text>
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
              <Text style={[s.emptyTitle, { color: colors.text }]}>All caught up!</Text>
              <Text style={s.emptyText}>No notifications yet.</Text>
            </View>
          ) : (
            <>
              {todayItems.length > 0 && (
                <>
                  <Text style={[s.groupLabel, { color: colors.muted }]}>Today</Text>
                  {todayItems.map(item => <NotifCard key={item.id} item={item} onPress={() => handlePress(item)} colors={colors} />)}
                </>
              )}
              {earlierItems.length > 0 && (
                <>
                  <Text style={[s.groupLabel, { color: colors.muted }]}>Earlier</Text>
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
  return (
    <TouchableOpacity style={[s.card, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.iconBox, { backgroundColor: `${item.color}18` }]}>
        <Text style={s.icon}>{item.icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.cardTop}>
          <Text style={s.typeTag}>{TYPE_LABELS[item.type] || item.type}</Text>
          <Text style={s.time}>{timeAgo(item.time)}</Text>
        </View>
        <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[s.sub, { color: colors.sub }]} numberOfLines={1}>{item.subtitle}</Text>
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
  groupLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8, marginLeft: 2 },
  card:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  iconBox:    { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:       { fontSize: 22 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  typeTag:    { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 },
  time:       { fontSize: 10, color: '#cbd5e1' },
  title:      { fontSize: 13, fontWeight: '700', color: '#0F1829', marginBottom: 2 },
  sub:        { fontSize: 11, color: '#64748b', textTransform: 'capitalize' },
  dot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  emptyBox:   { alignItems: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F1829', marginBottom: 6 },
  emptyText:  { fontSize: 14, color: '#94a3b8' },
})
