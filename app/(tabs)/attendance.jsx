import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import StatusBadge from '../../src/components/StatusBadge'

const fmt     = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const fmtTime = t => t ? t.slice(0, 5) : '—'

export default function AttendanceScreen() {
  const [today,     setToday]     = useState(null)
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [actioning, setActioning] = useState(false)
  const [refreshing,setRefreshing]= useState(false)

  const load = useCallback(async () => {
    try {
      const [ctxRes, logsRes] = await Promise.allSettled([
        api.get('/ai/context'),
        api.get('/attendance/logs?limit=14'),
      ])
      if (ctxRes.status === 'fulfilled')  setToday(ctxRes.value.data.data?.today || null)
      if (logsRes.status === 'fulfilled') setLogs(logsRes.value.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const handleCheckIn = async () => {
    setActioning(true)
    try {
      await api.post('/attendance/check-in')
      await load()
    } catch (err) {
      Alert.alert('Check-in failed', err.response?.data?.message || 'Please try again.')
    } finally { setActioning(false) }
  }

  const handleCheckOut = async () => {
    setActioning(true)
    try {
      await api.post('/attendance/check-out')
      await load()
    } catch (err) {
      Alert.alert('Check-out failed', err.response?.data?.message || 'Please try again.')
    } finally { setActioning(false) }
  }

  const canCheckIn  = !today?.check_in
  const canCheckOut = today?.check_in && !today?.check_out

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator color="#2BC4BE" size="large" /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
      >
        <Text style={s.pageTitle}>Attendance</Text>

        {/* Today card */}
        <Card style={s.todayCard}>
          <Text style={s.todayDate}>{new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</Text>

          <View style={s.timesRow}>
            <View style={s.timeBox}>
              <Text style={s.timeLabel}>Check In</Text>
              <Text style={[s.timeVal, !today?.check_in && s.timeEmpty]}>{fmtTime(today?.check_in)}</Text>
            </View>
            <View style={s.timeSep}/>
            <View style={s.timeBox}>
              <Text style={s.timeLabel}>Check Out</Text>
              <Text style={[s.timeVal, !today?.check_out && s.timeEmpty]}>{fmtTime(today?.check_out)}</Text>
            </View>
          </View>

          {/* Big action button */}
          {canCheckIn && (
            <TouchableOpacity style={[s.actionBtn, s.checkInBtn]} onPress={handleCheckIn} disabled={actioning} activeOpacity={0.85}>
              {actioning ? <ActivityIndicator color="white" /> : <>
                <Text style={s.actionIcon}>✅</Text>
                <Text style={s.actionText}>Check In</Text>
                <Text style={s.actionTime}>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
              </>}
            </TouchableOpacity>
          )}

          {canCheckOut && (
            <TouchableOpacity style={[s.actionBtn, s.checkOutBtn]} onPress={handleCheckOut} disabled={actioning} activeOpacity={0.85}>
              {actioning ? <ActivityIndicator color="white" /> : <>
                <Text style={s.actionIcon}>🏁</Text>
                <Text style={s.actionText}>Check Out</Text>
                <Text style={s.actionTime}>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
              </>}
            </TouchableOpacity>
          )}

          {today?.check_in && today?.check_out && (
            <View style={s.doneBox}>
              <Text style={s.doneText}>✓ Completed for today</Text>
            </View>
          )}
        </Card>

        {/* History */}
        {logs.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Recent History</Text>
            {logs.map((log, i) => (
              <Card key={i} style={s.logCard}>
                <View style={s.logRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.logDate}>{fmt(log.date || log.created_at)}</Text>
                    <Text style={s.logTimes}>
                      {fmtTime(log.check_in)} → {fmtTime(log.check_out)}
                    </Text>
                  </View>
                  <StatusBadge status={log.status || 'present'} />
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
  safe:        { flex: 1, backgroundColor: '#F0F4FA' },
  scroll:      { padding: 16, paddingBottom: 32 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:   { fontSize: 26, fontWeight: '900', color: '#0F1829', marginBottom: 16 },
  todayCard:   { backgroundColor: '#0F1829', marginBottom: 20 },
  todayDate:   { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  timesRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  timeBox:     { flex: 1, alignItems: 'center' },
  timeLabel:   { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6 },
  timeVal:     { color: 'white', fontSize: 32, fontWeight: '900' },
  timeEmpty:   { color: 'rgba(255,255,255,0.2)' },
  timeSep:     { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 20 },
  actionBtn:   { borderRadius: 16, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  checkInBtn:  { backgroundColor: '#16a34a' },
  checkOutBtn: { backgroundColor: '#E8583C' },
  actionIcon:  { fontSize: 22 },
  actionText:  { color: 'white', fontSize: 18, fontWeight: '800' },
  actionTime:  { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  doneBox:     { backgroundColor: 'rgba(43,196,190,0.15)', borderRadius: 12, padding: 14, alignItems: 'center' },
  doneText:    { color: '#2BC4BE', fontWeight: '700', fontSize: 14 },
  sectionTitle:{ fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  logCard:     { marginBottom: 8, padding: 14 },
  logRow:      { flexDirection: 'row', alignItems: 'center' },
  logDate:     { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  logTimes:    { fontSize: 13, color: '#64748b' },
})
