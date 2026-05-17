import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Linking, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'

export default function DirectoryScreen() {
  const { colors } = useTheme()
  const router     = useRouter()

  const [employees,  setEmployees]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')

  const load = useCallback(async () => {
    try {
      const r = await api.get('/employees?limit=300&status=active')
      const raw = r.data.data
      setEmployees(Array.isArray(raw) ? raw : (raw?.rows || []))
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const filtered = employees.filter(e => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.department_name || '').toLowerCase().includes(q) ||
      (e.position_title  || '').toLowerCase().includes(q) ||
      (e.email           || '').toLowerCase().includes(q)
    )
  })

  const call  = phone => phone && Linking.openURL(`tel:${phone}`)
  const email = addr  => addr  && Linking.openURL(`mailto:${addr}`)

  const initials = e =>
    `${e.first_name?.[0] || ''}${e.last_name?.[0] || ''}`.toUpperCase()

  const AVATAR_COLORS = ['#1e3a8a','#0f766e','#7e22ce','#be185d','#b45309','#065f46','#1d4ed8','#9d174d']
  const avatarColor = e => AVATAR_COLORS[(e.first_name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={s.center}><ActivityIndicator color="#2563eb" size="large" /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Nav */}
      <View style={[s.nav, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>Directory</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search name, department, role…"
          placeholderTextColor={colors.sub}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={[s.emptyText, { color: colors.sub }]}>
              {search ? 'No employees match your search' : 'No employees found'}
            </Text>
          </View>
        ) : filtered.map(e => (
          <View key={e.id} style={[s.card, { backgroundColor: colors.card }]}>
            <View style={s.cardTop}>
              <View style={[s.avatar, { backgroundColor: avatarColor(e) }]}>
                <Text style={s.avatarText}>{initials(e)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: colors.text }]}>{e.first_name} {e.last_name}</Text>
                <Text style={[s.role, { color: colors.sub }]} numberOfLines={1}>
                  {[e.position_title, e.department_name].filter(Boolean).join(' · ') || '—'}
                </Text>
              </View>
            </View>

            {(e.email || e.phone) && (
              <View style={[s.actions, { borderTopColor: colors.border }]}>
                {e.email && (
                  <TouchableOpacity style={s.actionBtn} onPress={() => email(e.email)}>
                    <Text style={s.actionIcon}>✉️</Text>
                    <Text style={[s.actionLabel, { color: colors.sub }]} numberOfLines={1}>{e.email}</Text>
                  </TouchableOpacity>
                )}
                {e.phone && (
                  <TouchableOpacity style={[s.actionBtn, s.callBtn]} onPress={() => call(e.phone)}>
                    <Text style={s.actionIcon}>📞</Text>
                    <Text style={[s.actionLabel, { color: colors.sub }]}>{e.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}

        <Text style={[s.count, { color: colors.sub }]}>{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  nav:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  back:        { width: 40 },
  backText:    { fontSize: 28, lineHeight: 32 },
  navTitle:    { fontSize: 17, fontWeight: '700' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  scroll:      { padding: 12, paddingBottom: 40, gap: 8 },
  empty:       { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyText:   { fontSize: 14 },
  card:        { borderRadius: 14, padding: 14 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 0 },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: 'white', fontSize: 15, fontWeight: '800' },
  name:        { fontSize: 15, fontWeight: '700' },
  role:        { fontSize: 12, marginTop: 2 },
  actions:     { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', borderRadius: 8, padding: 8 },
  callBtn:     { backgroundColor: '#f0fdf4' },
  actionIcon:  { fontSize: 14 },
  actionLabel: { fontSize: 12, flex: 1 },
  count:       { textAlign: 'center', fontSize: 12, marginTop: 8 },
})
