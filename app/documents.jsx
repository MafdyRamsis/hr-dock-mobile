import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Linking, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'

const fmt = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'

const CAT_ICONS = {
  hr:        '👤',
  policy:    '📘',
  finance:   '💰',
  legal:     '⚖️',
  training:  '🎓',
  general:   '📄',
  template:  '📝',
  other:     '📋',
}

const fmtSize = bytes => {
  if (!bytes) return null
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024*1024)  return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/(1024*1024)).toFixed(1)} MB`
}

export default function DocumentsScreen() {
  const { colors } = useTheme()
  const router     = useRouter()

  const [docs,       setDocs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')

  const load = useCallback(async () => {
    try {
      const r = await api.get('/documents?limit=200')
      setDocs(r.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const categories = ['all', ...new Set(docs.map(d => d.category).filter(Boolean))]

  const filtered = docs.filter(d => {
    const matchCat = filter === 'all' || d.category === filter
    const matchQ   = !search.trim() || (d.title || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQ
  })

  const openDoc = async (doc) => {
    if (!doc.file_url) {
      Alert.alert('No file', 'This document has no attached file.')
      return
    }
    try {
      await Linking.openURL(doc.file_url)
    } catch {
      Alert.alert('Error', 'Could not open the document.')
    }
  }

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
        <Text style={[s.navTitle, { color: colors.text }]}>Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search documents…"
          placeholderTextColor={colors.sub}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category filter chips */}
      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.chipsScroll, { backgroundColor: colors.bg }]} contentContainerStyle={s.chips}>
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.chip, filter === c && s.chipActive]}
              onPress={() => setFilter(c)}
            >
              <Text style={[s.chipText, filter === c && s.chipTextActive]}>
                {c === 'all' ? 'All' : (c.charAt(0).toUpperCase() + c.slice(1))}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📂</Text>
            <Text style={[s.emptyText, { color: colors.sub }]}>No documents found</Text>
          </View>
        ) : filtered.map(doc => (
          <TouchableOpacity key={doc.id} style={[s.card, { backgroundColor: colors.card }]} onPress={() => openDoc(doc)} activeOpacity={0.8}>
            <View style={s.cardRow}>
              <View style={s.docIconWrap}>
                <Text style={s.docIcon}>{CAT_ICONS[doc.category] || '📄'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.docTitle, { color: colors.text }]} numberOfLines={2}>{doc.title}</Text>
                {doc.description ? (
                  <Text style={[s.docDesc, { color: colors.sub }]} numberOfLines={1}>{doc.description}</Text>
                ) : null}
                <View style={s.docMeta}>
                  <Text style={[s.docMetaText, { color: colors.sub }]}>v{doc.version || '1.0'}</Text>
                  {doc.file_size ? <Text style={[s.docMetaText, { color: colors.sub }]}>· {fmtSize(doc.file_size)}</Text> : null}
                  <Text style={[s.docMetaText, { color: colors.sub }]}>· {fmt(doc.created_at)}</Text>
                </View>
              </View>
              {doc.file_url ? (
                <Text style={s.openIcon}>↗</Text>
              ) : (
                <Text style={[s.openIcon, { color: '#cbd5e1' }]}>—</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
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
  chipsScroll: { maxHeight: 52 },
  chips:       { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e2e8f0' },
  chipActive:  { backgroundColor: '#1e3a8a' },
  chipText:    { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: 'white' },
  scroll:      { padding: 12, paddingBottom: 40, gap: 8 },
  empty:       { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyText:   { fontSize: 14 },
  card:        { borderRadius: 14, padding: 14 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  docIcon:     { fontSize: 22 },
  docTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  docDesc:     { fontSize: 12, marginBottom: 4 },
  docMeta:     { flexDirection: 'row', gap: 4 },
  docMetaText: { fontSize: 11 },
  openIcon:    { fontSize: 18, color: '#2563eb', fontWeight: '700' },
})
