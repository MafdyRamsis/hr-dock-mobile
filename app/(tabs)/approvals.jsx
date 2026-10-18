import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import { useLang } from '../../src/context/LanguageContext'
import Card from '../../src/components/Card'
import api from '../../src/services/api'

export default function ApprovalsScreen() {
  const router = useRouter()
  const { can, user } = useAuth()
  const { colors } = useTheme()
  const { tr, date, cur } = useLang()
  const [items,setItems] = useState([])
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState(null)
  const [notes,setNotes] = useState({})
  const enabled = can('app') && can('team_approvals') && ['manager','hr_manager','admin','ceo'].includes(user?.role)
  const load = useCallback(async () => {
    if (!enabled) { setLoading(false); return }
    setLoading(true); setError('')
    try { const r=await api.get('/workflow/my-approvals'); setItems(r.data.data || []) }
    catch(e) { setError(e.response?.data?.message || tr('Could not load approvals.','تعذر تحميل الموافقات.')) }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[enabled])
  useEffect(() => { load() },[load])
  const decide = (item,decision) => Alert.alert(decision==='approve' ? tr('Approve request?','الموافقة على الطلب؟') : tr('Reject request?','رفض الطلب؟'),item.employee_name || '',[
    { text:tr('Cancel','إلغاء'),style:'cancel' },
    { text:tr('Confirm','تأكيد'),onPress:async () => {
      setBusy(item.instance_id)
      try { await api.post(`/workflow/instances/${item.instance_id}/${decision}`,{ note:notes[item.instance_id] || undefined }); await load() }
      catch(e) { Alert.alert(tr('Unable to process request','تعذر تنفيذ القرار'),e.response?.data?.message || tr('Please retry.','يرجى المحاولة مرة أخرى.')); await load() }
      finally { setBusy(null) }
    } },
  ])
  return <SafeAreaView style={{ flex:1,backgroundColor:colors.bg }} edges={['top']}><ScrollView contentContainerStyle={{ padding:20,paddingBottom:130 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
    <Text style={{ color:colors.text,fontSize:28,fontWeight:'900',marginBottom:10 }}>{tr('Approval inbox','صندوق الموافقات')}</Text>
    <Text style={{ color:colors.sub,marginBottom:20 }}>{tr('Your assigned workflow decisions, together.','قرارات سير العمل المسندة إليك في مكان واحد.')}</Text>
    {enabled && <TouchableOpacity onPress={() => router.push('/coverage')} style={{padding:14,backgroundColor:colors.card,borderRadius:12,marginBottom:15}}><Text style={{color:colors.text}}>{tr('Check team coverage before approving leave','راجع تغطية الفريق قبل اعتماد الإجازات')} ›</Text></TouchableOpacity>}
    {!enabled ? <Text style={{ color:colors.sub }}>{tr('Approvals are not enabled for this account.','الموافقات غير مفعلة لهذا الحساب.')}</Text> : <>
      {!!error && <TouchableOpacity onPress={load}><Text accessibilityRole="alert" style={{ color:'#dc2626',marginBottom:15 }}>{error} · {tr('Retry','إعادة المحاولة')}</Text></TouchableOpacity>}
      {loading && <ActivityIndicator color="#6366f1" />}
      {!loading && !error && !items.length && <Card><Text style={{ color:colors.text }}>{tr('You are all caught up.','لا توجد قرارات معلقة.')}</Text></Card>}
      {items.map(item => <Card key={item.instance_id}>
        <Text style={{ color:colors.text,fontWeight:'800',fontSize:17 }}>{item.employee_name}</Text>
        <Text style={{ color:colors.sub,marginTop:8 }}>{String(item.request_type).replaceAll('_',' ')}</Text>
        {(item.start_date || item.date) && <Text style={{ color:colors.text,marginTop:8 }}>{date(item.start_date || item.date)}{item.end_date ? ` → ${date(item.end_date)}` : ''}</Text>}
        {item.hours != null && <Text style={{ color:colors.text }}>{item.hours} {tr('hours','ساعة')}</Text>}
        {item.amount != null && <Text style={{ color:colors.text }}>{cur(item.amount)}</Text>}
        {!!item.reason && <Text style={{ color:colors.sub,marginTop:8 }}>{item.reason}</Text>}
        <TextInput accessibilityLabel={tr('Decision note','ملاحظة القرار')} placeholder={tr('Add a note (optional)','أضف ملاحظة (اختياري)')} placeholderTextColor={colors.sub} value={notes[item.instance_id] || ''} onChangeText={v => setNotes(n => ({ ...n,[item.instance_id]:v }))} style={{ color:colors.text,borderColor:colors.border,borderWidth:1,padding:12,borderRadius:10,marginTop:12 }} />
        <View style={{ flexDirection:'row',gap:10,marginTop:14 }}>{['approve','reject'].map(d => <TouchableOpacity key={d} accessibilityRole="button" disabled={!!busy} onPress={() => decide(item,d)} style={{ flex:1,padding:13,borderRadius:12,backgroundColor:d==='approve' ? '#4338ca' : '#fee2e2',opacity:busy ? 0.5 : 1 }}><Text style={{ textAlign:'center',fontWeight:'700',color:d==='approve' ? '#fff' : '#991b1b' }}>{d==='approve' ? tr('Approve','موافقة') : tr('Reject','رفض')}</Text></TouchableOpacity>)}</View>
      </Card>)}
    </>}
  </ScrollView></SafeAreaView>
}
