import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import StatusBadge from '../../src/components/StatusBadge'

const fmt = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const fmtNum = n => n != null ? Number(n).toLocaleString() : '—'

export default function HomeScreen() {
  const { user } = useAuth()
  const router   = useRouter()
  const [ctx,       setCtx]       = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/ai/context')
      setCtx(r.data.data)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><Text style={s.loadText}>Loading your data…</Text></View>
    </SafeAreaView>
  )

  const att     = ctx?.today
  const balances = ctx?.balances || []
  const payslip  = ctx?.payslip
  const pending  = ctx?.pending || []

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting()},</Text>
            <Text style={s.name}>{user?.first_name} {user?.last_name} 👋</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text>
          </View>
        </View>

        {/* Attendance card */}
        <Card style={s.attCard}>
          <View style={s.attRow}>
            <View>
              <Text style={s.attTitle}>Today's Attendance</Text>
              <Text style={s.attDate}>{new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}</Text>
            </View>
            <StatusBadge status={att?.status || 'absent'} />
          </View>
          <View style={s.attTimes}>
            <View style={s.attTime}>
              <Text style={s.attTimeLabel}>Check In</Text>
              <Text style={s.attTimeVal}>{att?.check_in ? att.check_in.slice(0,5) : '—'}</Text>
            </View>
            <View style={s.attDivider}/>
            <View style={s.attTime}>
              <Text style={s.attTimeLabel}>Check Out</Text>
              <Text style={s.attTimeVal}>{att?.check_out ? att.check_out.slice(0,5) : '—'}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.attBtn} onPress={() => router.push('/(tabs)/attendance')}>
            <Text style={s.attBtnText}>Go to Attendance →</Text>
          </TouchableOpacity>
        </Card>

        {/* Leave balances */}
        {balances.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Leave Balances</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.balScroll}>
              {balances.map((b, i) => (
                <View key={i} style={s.balCard}>
                  <Text style={s.balName} numberOfLines={2}>{b.name}</Text>
                  <Text style={s.balNum}>{b.remaining}</Text>
                  <Text style={s.balSub}>days left</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Last payslip */}
        {payslip && (
          <TouchableOpacity onPress={() => router.push('/(tabs)/payslips')} activeOpacity={0.85}>
            <Card>
              <Text style={s.sectionTitle}>Last Payslip</Text>
              <Text style={s.payPeriod}>{fmt(payslip.period_start)} – {fmt(payslip.period_end)}</Text>
              <View style={s.payRow}>
                <View>
                  <Text style={s.payLabel}>Net Salary</Text>
                  <Text style={s.payNet}>EGP {fmtNum(payslip.net_salary)}</Text>
                </View>
                <View>
                  <Text style={s.payLabel}>Basic</Text>
                  <Text style={s.payBasic}>EGP {fmtNum(payslip.basic_salary)}</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Pending leave */}
        {pending.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Pending Requests</Text>
            {pending.map((p, i) => (
              <Card key={i} style={{ marginBottom: 8 }}>
                <View style={s.pendRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pendType}>{p.leave_type}</Text>
                    <Text style={s.pendDate}>{fmt(p.start_date)} → {fmt(p.end_date)} · {p.days_requested}d</Text>
                  </View>
                  <StatusBadge status={p.status} />
                </View>
              </Card>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F0F4FA' },
  scroll:       { padding: 16, paddingBottom: 32 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadText:     { color: '#64748b', fontSize: 14 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:     { fontSize: 14, color: '#64748b' },
  name:         { fontSize: 22, fontWeight: '800', color: '#0F1829' },
  avatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8583C', alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: 'white', fontWeight: '700', fontSize: 15 },
  attCard:      { backgroundColor: '#0F1829', marginBottom: 12 },
  attRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  attTitle:     { fontSize: 15, fontWeight: '700', color: 'white', marginBottom: 2 },
  attDate:      { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  attTimes:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  attTime:      { flex: 1, alignItems: 'center' },
  attTimeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  attTimeVal:   { fontSize: 24, fontWeight: '800', color: 'white' },
  attDivider:   { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  attBtn:       { backgroundColor: 'rgba(43,196,190,0.15)', borderRadius: 10, padding: 10, alignItems: 'center' },
  attBtnText:   { color: '#2BC4BE', fontWeight: '600', fontSize: 13 },
  section:      { marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  balScroll:    { marginHorizontal: -4 },
  balCard:      { backgroundColor: 'white', borderRadius: 14, padding: 16, marginHorizontal: 4, minWidth: 100, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 12 },
  balName:      { fontSize: 11, color: '#64748b', textAlign: 'center', marginBottom: 8 },
  balNum:       { fontSize: 28, fontWeight: '900', color: '#0F1829' },
  balSub:       { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  payPeriod:    { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
  payRow:       { flexDirection: 'row', gap: 32 },
  payLabel:     { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  payNet:       { fontSize: 20, fontWeight: '800', color: '#0F1829' },
  payBasic:     { fontSize: 16, fontWeight: '600', color: '#475569' },
  pendRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendType:     { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  pendDate:     { fontSize: 12, color: '#94a3b8' },
})
