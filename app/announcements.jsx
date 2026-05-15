import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'

const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

const CATEGORY_COLORS = {
  event:      { bg: '#eff6ff', text: '#1d4ed8' },
  policy:     { bg: '#fef3c7', text: '#92400e' },
  hr:         { bg: '#f0fdf4', text: '#166534' },
  general:    { bg: '#f1f5f9', text: '#475569' },
}

const PRIORITY_COLORS = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#94a3b8',
}

export default function AnnouncementsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/announcements')
      setItems(r.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[s.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backArrow, { color: colors.text }]}>←</Text>
          <Text style={[s.backText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>Announcements</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#2BC4BE" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
        >
          {items.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>📢</Text>
              <Text style={s.emptyText}>No announcements yet.</Text>
            </View>
          ) : items.map((item) => {
            const cat   = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general
            const pcolor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.low
            return (
              <View key={item.id} style={[s.card, { backgroundColor: colors.card }]}>
                {item.pinned && (
                  <View style={s.pinnedBadge}>
                    <Text style={s.pinnedText}>📌 Pinned</Text>
                  </View>
                )}
                <View style={s.cardTop}>
                  <View style={[s.catBadge, { backgroundColor: cat.bg }]}>
                    <Text style={[s.catText, { color: cat.text }]}>{item.category}</Text>
                  </View>
                  <View style={[s.dot, { backgroundColor: pcolor }]} />
                </View>
                <Text style={[s.title, { color: colors.text }]}>{item.title}</Text>
                <Text style={[s.body, { color: colors.sub }]}>{item.body}</Text>
                <View style={s.cardFooter}>
                  <Text style={s.by}>{item.created_by_name}</Text>
                  <Text style={s.date}>{fmt(item.created_at)}</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F0F4FA' },
  navBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow:    { fontSize: 20, color: '#0F1829' },
  backText:     { fontSize: 15, color: '#0F1829', fontWeight: '600' },
  navTitle:     { fontSize: 16, fontWeight: '800', color: '#0F1829' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 16, paddingBottom: 32 },
  emptyBox:     { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyText:    { fontSize: 15, color: '#94a3b8' },
  card:         { backgroundColor: 'white', borderRadius: 16, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  pinnedBadge:  { backgroundColor: '#fef3c7', borderRadius: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  pinnedText:   { fontSize: 11, fontWeight: '700', color: '#92400e' },
  cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  catBadge:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  catText:      { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  title:        { fontSize: 16, fontWeight: '800', color: '#0F1829', marginBottom: 8 },
  body:         { fontSize: 14, color: '#475569', lineHeight: 21, marginBottom: 14 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  by:           { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  date:         { fontSize: 12, color: '#94a3b8' },
})
