// "New request": every request type this person may make, in four groups
// with a search box. Tapping one opens its form (app/request-form.jsx).
import { useState, useMemo } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'
import { useTheme } from '../src/context/ThemeContext'
import { useLang } from '../src/context/LanguageContext'
import { groupedTypes } from '../src/requests/catalog'
import { ScreenHeader } from '../src/components/FormFields'
import { IS_RTL, ls } from '../src/utils/rtl'

export default function NewRequest() {
  const router = useRouter()
  const { colors } = useTheme()
  const { tr, ar } = useLang()
  const { can = () => true, user } = useAuth() || {}
  const [q, setQ] = useState('')
  const T = l => (ar ? l[1] : l[0])
  const groups = useMemo(() => groupedTypes({ can, role: user?.role }, q), [q, user?.role, can])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title={tr('New request', 'طلب جديد')} />
      <View style={{ paddingHorizontal: 20, marginTop: 6 }}>
        <View style={[st.search, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.sub} />
          <TextInput
            accessibilityLabel={tr('Search request types', 'ابحث عن نوع الطلب')}
            value={q} onChangeText={setQ}
            placeholder={tr('Search — e.g. mission, loan, certificate', 'ابحث — مثلاً مأمورية، سلفة، شهادة')}
            placeholderTextColor={colors.muted}
            textAlign={IS_RTL ? 'right' : 'left'}
            style={{ flex: 1, fontSize: 14, color: colors.text, paddingHorizontal: 8 }}
          />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!groups.length && (
          <Text style={{ marginTop: 24, color: colors.sub, fontSize: 14 }}>
            {q ? tr('No request type matches your search.', 'لا يوجد نوع طلب يطابق البحث.') : tr('Requests are switched off for your role. Please contact HR.', 'الطلبات غير مفعّلة لدورك. يرجى التواصل مع الموارد البشرية.')}
          </Text>
        )}
        {groups.map(g => (
          <View key={g.key}>
            <Text style={[st.group, { color: colors.sub }]}>{T(g.title)}</Text>
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {g.items.map((t, i) => (
                <TouchableOpacity
                  key={t.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${T(t.label)}. ${T(t.hint)}`}
                  onPress={() => router.push({ pathname: '/request-form', params: { type: t.key } })}
                  style={[st.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                >
                  <View style={[st.badge, { backgroundColor: colors.isDark ? colors.cardAlt : g.tint }]}>
                    <Text style={{ fontSize: ar ? 14 : 11, fontWeight: '800', color: colors.isDark ? colors.text : g.ink }}>{T(t.abbr)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{T(t.label)}</Text>
                    <Text style={{ fontSize: 12, color: colors.sub, marginTop: 1 }}>{T(t.hint)}</Text>
                  </View>
                  <Ionicons name={IS_RTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  search: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  group: { marginTop: 18, marginBottom: 8, fontSize: 12, fontWeight: '700', letterSpacing: ls(0.5), textTransform: IS_RTL ? 'none' : 'uppercase' },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
})
