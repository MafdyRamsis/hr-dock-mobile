import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'

const TYPE_ICONS = {
  annual:   '🏖️',
  casual:   '☀️',
  medical:  '🏥',
  sick:     '🤒',
  maternity:'👶',
  paternity:'👨‍👧',
}

const TYPE_COLORS = {
  annual:   { primary: '#2BC4BE', bg: '#f0fdfc' },
  casual:   { primary: '#f59e0b', bg: '#fffbeb' },
  medical:  { primary: '#ef4444', bg: '#fef2f2' },
  sick:     { primary: '#ef4444', bg: '#fef2f2' },
  maternity:{ primary: '#a855f7', bg: '#faf5ff' },
  paternity:{ primary: '#3b82f6', bg: '#eff6ff' },
}

const DEFAULT_COLOR = { primary: '#0F1829', bg: '#f8fafc' }

function getColor(name = '') {
  const key = Object.keys(TYPE_COLORS).find(k => name.toLowerCase().includes(k))
  return key ? TYPE_COLORS[key] : DEFAULT_COLOR
}

function getIcon(name = '') {
  const key = Object.keys(TYPE_ICONS).find(k => name.toLowerCase().includes(k))
  return key ? TYPE_ICONS[key] : '📋'
}

export default function LeaveBalanceScreen() {
  const router  = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const [balances,   setBalances]   = useState([])
  const [requests,   setRequests]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const empId = user?.employee_id || user?.id
      const [balRes, reqRes] = await Promise.allSettled([
        api.get(`/leave/balances/${empId}`),
        api.get('/leave/requests?limit=50'),
      ])
      if (balRes.status === 'fulfilled') setBalances(balRes.value.data.data || [])
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

  const totalRemaining = balances.reduce((sum, b) => sum + (Number(b.remaining) || 0), 0)
  const totalAllocated = balances.reduce((sum, b) => sum + (Number(b.allocated) || 0), 0)

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Nav */}
      <View style={[s.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backArrow, { color: colors.text }]}>←</Text>
          <Text style={[s.backText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>Leave Balance</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#2BC4BE" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
        >
          {/* Summary hero */}
          <View style={s.hero}>
            <Text style={s.heroLabel}>Total Days Remaining</Text>
            <Text style={s.heroNum}>{totalRemaining}</Text>
            <Text style={s.heroSub}>out of {totalAllocated} allocated days</Text>
            <View style={s.heroBar}>
              <View style={[s.heroFill, { width: `${totalAllocated ? Math.min(100, ((totalAllocated - totalRemaining) / totalAllocated) * 100) : 0}%` }]} />
            </View>
            <View style={s.heroLegend}>
              <View style={s.heroLegendItem}>
                <View style={[s.heroLegendDot, { backgroundColor: '#2BC4BE' }]} />
                <Text style={s.heroLegendText}>Used</Text>
              </View>
              <View style={s.heroLegendItem}>
                <View style={[s.heroLegendDot, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <Text style={s.heroLegendText}>Remaining</Text>
              </View>
            </View>
          </View>

          {/* Per-type cards */}
          <Text style={[s.sectionTitle, { color: colors.sub }]}>By Leave Type</Text>
          {balances.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>No leave balances found.</Text>
            </View>
          ) : balances.map((b, i) => {
            const color = getColor(b.name)
            const icon  = getIcon(b.name)
            const pct   = b.allocated ? Math.min(100, (b.used / b.allocated) * 100) : 0
            return (
              <View key={i} style={[s.typeCard, { backgroundColor: color.bg }]}>
                <View style={s.typeHeader}>
                  <View style={s.typeLeft}>
                    <Text style={s.typeIcon}>{icon}</Text>
                    <Text style={[s.typeName, { color: colors.text }]} numberOfLines={2}>{b.name}</Text>
                  </View>
                  <View style={s.typeRight}>
                    <Text style={[s.typeRemain, { color: color.primary }]}>{b.remaining}</Text>
                    <Text style={s.typeRemainLabel}>days left</Text>
                  </View>
                </View>

                <View style={[s.typeBar, { backgroundColor: `${color.primary}22` }]}>
                  <View style={[s.typeBarFill, { width: `${pct}%`, backgroundColor: color.primary }]} />
                </View>

                <View style={s.typeStats}>
                  <View style={s.typeStat}>
                    <Text style={[s.typeStatNum, { color: colors.text }]}>{b.allocated}</Text>
                    <Text style={s.typeStatLabel}>Allocated</Text>
                  </View>
                  <View style={s.typeStatDivider} />
                  <View style={s.typeStat}>
                    <Text style={[s.typeStatNum, { color: color.primary }]}>{b.used}</Text>
                    <Text style={s.typeStatLabel}>Used</Text>
                  </View>
                  <View style={s.typeStatDivider} />
                  <View style={s.typeStat}>
                    <Text style={[s.typeStatNum, { color: color.primary, fontWeight: '900' }]}>{b.remaining}</Text>
                    <Text style={s.typeStatLabel}>Remaining</Text>
                  </View>
                </View>
              </View>
            )
          })}

          {/* Recent requests for context */}
          {requests.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 8, color: colors.sub }]}>Recent Requests</Text>
              {requests.slice(0, 5).map((r, i) => {
                const color = getColor(r.leave_type_name || r.leave_type || '')
                return (
                  <View key={i} style={[s.reqRow, { backgroundColor: colors.card }]}>
                    <View style={[s.reqDot, { backgroundColor: color.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.reqType, { color: colors.text2 }]}>{r.leave_type_name || r.leave_type}</Text>
                      <Text style={s.reqDates}>
                        {r.start_date?.split('T')[0].split('-').reverse().join('/')} → {r.end_date?.split('T')[0].split('-').reverse().join('/')} · {r.days_requested}d
                      </Text>
                    </View>
                    <View style={[s.reqStatus, {
                      backgroundColor: r.status === 'approved' ? '#f0fdf4' : r.status === 'rejected' ? '#fef2f2' : '#fef3c7'
                    }]}>
                      <Text style={[s.reqStatusText, {
                        color: r.status === 'approved' ? '#16a34a' : r.status === 'rejected' ? '#dc2626' : '#92400e'
                      }]}>{r.status}</Text>
                    </View>
                  </View>
                )
              })}
            </>
          )}

          <TouchableOpacity style={s.newBtn} onPress={() => router.push('/(tabs)/leave')}>
            <Text style={s.newBtnText}>+ New Leave Request</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F0F4FA' },
  navBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow:       { fontSize: 20, color: '#0F1829' },
  backText:        { fontSize: 15, color: '#0F1829', fontWeight: '600' },
  navTitle:        { fontSize: 16, fontWeight: '800', color: '#0F1829' },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:          { padding: 16, paddingBottom: 40 },
  hero:            { backgroundColor: '#0F1829', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  heroLabel:       { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 8 },
  heroNum:         { color: 'white', fontSize: 64, fontWeight: '900', lineHeight: 72 },
  heroSub:         { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 },
  heroBar:         { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  heroFill:        { height: 8, backgroundColor: '#2BC4BE', borderRadius: 4 },
  heroLegend:      { flexDirection: 'row', gap: 20 },
  heroLegendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLegendDot:   { width: 8, height: 8, borderRadius: 4 },
  heroLegendText:  { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  sectionTitle:    { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  emptyBox:        { alignItems: 'center', paddingVertical: 32 },
  emptyText:       { color: '#94a3b8', fontSize: 14 },
  typeCard:        { borderRadius: 16, padding: 18, marginBottom: 12 },
  typeHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 },
  typeLeft:        { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  typeIcon:        { fontSize: 20 },
  typeName:        { fontSize: 14, fontWeight: '700', color: '#0F1829', flexShrink: 1 },
  typeRight:       { alignItems: 'flex-end', flexShrink: 0 },
  typeRemain:      { fontSize: 26, fontWeight: '900', lineHeight: 30 },
  typeRemainLabel: { fontSize: 11, color: '#64748b', textAlign: 'right' },
  typeBar:         { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  typeBarFill:     { height: 8, borderRadius: 4 },
  typeStats:       { flexDirection: 'row', alignItems: 'center' },
  typeStat:        { flex: 1, alignItems: 'center' },
  typeStatDivider: { width: 1, height: 28, backgroundColor: '#e2e8f0' },
  typeStatNum:     { fontSize: 18, fontWeight: '800', color: '#0F1829', marginBottom: 2 },
  typeStatLabel:   { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 },
  reqRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 },
  reqDot:          { width: 10, height: 10, borderRadius: 5 },
  reqType:         { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  reqDates:        { fontSize: 12, color: '#94a3b8' },
  reqStatus:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  reqStatusText:   { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  newBtn:          { backgroundColor: '#0F1829', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  newBtnText:      { color: 'white', fontSize: 15, fontWeight: '700' },
})
