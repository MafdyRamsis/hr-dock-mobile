import GoalProgressEditor from './GoalProgressEditor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'
import Card from './Card'
import { activePayrollMonth } from '../utils/payrollCycle'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export default function LeadershipView({ mode = 'overview' }) {
  const { user, can, cycleStartDay = 1 } = useAuth()
  const { tr, cur, date } = useLang()
  const { colors } = useTheme()
  const router = useRouter()
  const [currentDay, setCurrentDay] = useState(today)
  const [selectedPeriod, setPeriod] = useState(null)
  const period = selectedPeriod || activePayrollMonth(currentDay,cycleStartDay)
  const [selectedDay, setDay] = useState(null)
  const day = selectedDay || currentDay
  const [loaded, setData] = useState(null)
  const viewKey = [user?.company_id,user?.id,user?.role,mode,period,day,currentDay].join(':')
  const data = loaded?.key === viewKey ? loaded.value : null
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [department, setDepartment] = useState('all')
  const requestId = useRef(0)
  const leader = ['admin','hr_manager','manager','ceo'].includes(user?.role)
  const feature = { overview:'workforce_overview',workforce:'workforce_overview',forecast:'payroll_forecast',performance:'performance_overview' }[mode]
  const enabled = leader && can('app') && can(feature)
  const load = useCallback(async () => {
    const current = ++requestId.current
    if (!enabled) { setData(null); setLoading(false); return }
    setLoading(true); setData(null); setError('')
    try {
      const [year,month] = period.split('-').map(Number)
      const endpoint = mode === 'overview' ? 'workforce' : mode
      const params = endpoint === 'workforce' ? { date: day } : { month,year, ...(mode === 'forecast' ? { as_of:today() } : {}) }
      const r = await api.get(`/leadership/${endpoint}`, { params, timeout:120000 })
      if (current === requestId.current) setData({ key:viewKey,value:r.data.data })
    } catch (e) { if (current === requestId.current) setError(e.response?.data?.message || tr('Could not load this view. Tap retry.', 'تعذر تحميل البيانات. اضغط لإعادة المحاولة.')) }
    finally { if (current === requestId.current) setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode,period,day,enabled,viewKey])
  useEffect(() => { load(); return () => { requestId.current++ } }, [load])
  useEffect(() => {
    const subscription=AppState.addEventListener('change',state=>{
      if(state!=='active') return
      const nextDay=today()
      if(nextDay!==currentDay) setCurrentDay(nextDay)
      else load()
    })
    return ()=>subscription.remove()
  },[load,currentDay])
  const label = key => ({
    present:tr('Present','حاضر'),late:tr('Late','متأخر'),absent:tr('Absent','غائب'),not_yet:tr('Not in yet','لم يحضر بعد'),
    on_leave:tr('On leave','إجازة'),weekend:tr('Day off','راحة'),holiday:tr('Holiday','عطلة'),mission:tr('Mission','مأمورية'),
    wfh:tr('Remote','عمل عن بعد'),excused:tr('Excused','إذن'),half_day:tr('Half day','نصف يوم'),
    achieved:tr('Achieved','محقق'),red_flag:tr('Red flag','يحتاج تدخلاً'),not_achieved:tr('Not achieved','غير محقق'),
    not_updated:tr('Not updated','لم يتم التحديث'),on_track:tr('On track','على المسار'),
  }[key] || key)
  const move = amount => {
    if (mode === 'workforce') { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+amount); const next=d.toISOString().slice(0,10); if (next<=today()) setDay(next) }
    else { const [y,m]=period.split('-').map(Number); setPeriod(new Date(Date.UTC(y,m-1+amount,1)).toISOString().slice(0,7)) }
    setStatus('all'); setDepartment('all')
  }
  const text = { color:colors.text }
  const muted = { color:colors.sub }
  const action = (title,path) => <TouchableOpacity key={path} onPress={() => router.push(path)} style={[s.action,{ backgroundColor:colors.card,borderColor:colors.border }]} accessibilityRole="button"><Text style={[text,{ fontWeight:'700' }]}>{title} ›</Text></TouchableOpacity>
  const time = v => v ? new Date(v).toLocaleTimeString('en-GB',{ timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit' }) : '—'
  const title = mode === 'overview' ? (user?.role === 'ceo' ? tr('Company overview','نظرة على الشركة') : tr('Your team, today','فريقك اليوم'))
    : mode === 'workforce' ? tr('Workforce','القوى العاملة') : mode === 'forecast' ? tr('Salary forecast','الرواتب المتوقعة') : tr('Team performance','أداء الفريق')
  const visibleRows = mode==='forecast' && !data?.individual_details ? [] : (data?.rows || [])
  const rows = visibleRows.filter(r => (!search || `${r.employee_name} ${r.employee_number || ''} ${r.title || ''}`.toLowerCase().includes(search.toLowerCase()))
    && (status==='all' || (r.health || r.status)===status) && (department==='all' || (r.department_name || r.department_id)===department))
  const departments = [...new Set(visibleRows.map(r => r.department_name || r.department_id).filter(Boolean))]
  return <SafeAreaView style={{ flex:1,backgroundColor:colors.bg }} edges={['top']}>
    <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={[s.eyebrow,muted]}>HR DOCK · {tr('MY WORKSPACE','مساحة عملي')}</Text>
      <Text style={[s.title,text]}>{title}</Text>
      <Text style={[muted,{ marginBottom:18 }]}>{date(today())}</Text>
      {!enabled ? <Card><Text style={text}>{tr('This workspace is not enabled for your account.','هذه المساحة غير مفعلة لحسابك.')}</Text></Card> : <>
        {mode==='overview' ? <View style={s.actions}>
          {can('workforce_overview') && action(tr('Who is working?','من يعمل اليوم؟'),'/(tabs)/team')}
          {can('payroll_forecast') && action(tr('Expected payroll','الرواتب المتوقعة'),'/(tabs)/forecast')}
          {can('performance_overview') && action(tr('KPI progress','تقدم الأهداف'),'/(tabs)/performance')}
          {can('team_approvals') && action(tr('Team coverage', 'تغطية الفريق'),'/coverage')}
          {can('team_approvals') && action(tr('Approval inbox','صندوق الموافقات'),'/(tabs)/approvals')}
          {action(tr('My Space','مساحتي الشخصية'),'/my-space')}
        </View> : <View style={s.period}>
          <TouchableOpacity onPress={() => move(-1)} accessibilityLabel={tr('Previous period','الفترة السابقة')}><Text style={[s.arrow,text]}>‹</Text></TouchableOpacity>
          <Text style={[text,{ fontWeight:'700' }]}>{mode==='workforce' ? day : period}</Text>
          <TouchableOpacity onPress={() => move(1)} accessibilityLabel={tr('Next period','الفترة التالية')}><Text style={[s.arrow,text]}>›</Text></TouchableOpacity>
        </View>}
        {loading && !data && <ActivityIndicator color="#6366f1" />}
        {!!error && <Card><Text accessibilityRole="alert" style={{ color:'#dc2626' }}>{error}</Text><TouchableOpacity onPress={load}><Text style={[text,{ paddingTop:14 }]}>{tr('Retry','إعادة المحاولة')}</Text></TouchableOpacity></Card>}
        {data?.period && <Text style={[muted,{ marginBottom:14 }]}>{tr('Payroll cycle','دورة الراتب')}: {data.period.from} → {data.period.to}</Text>}
        {data?.counts && <View style={s.counts}>{Object.entries(data.counts).map(([key,n]) => <TouchableOpacity key={key} onPress={() => setStatus(status===key ? 'all' : key)} style={[s.stat,{ backgroundColor:status===key ? '#4338ca' : colors.card,borderColor:colors.border }]}><Text style={{ color:status===key ? '#fff' : colors.text,fontSize:26,fontWeight:'800' }}>{n}</Text><Text style={{ color:status===key ? '#fff' : colors.sub,fontSize:12 }}>{label(key)}</Text></TouchableOpacity>)}</View>}
        {mode==='forecast' && data && <>
          <Card style={{ backgroundColor:'#eef2ff' }}><Text style={{ color:'#4338ca' }}>{tr('Projected cycle-end net payroll','صافي الرواتب المتوقع بنهاية الدورة')}</Text><Text style={{ color:'#312e81',fontSize:30,fontWeight:'900',marginVertical:12 }}>{cur(data.projected_net)}</Text>
            <Text style={{ color:'#4338ca' }}>{data.calculated_count}/{data.employee_count} {tr('employees calculated','موظف تم احتسابه')}</Text>
            <Text style={{ color:'#4338ca',marginTop:8 }}>{tr('Previous cycle, same employees','الدورة السابقة لنفس الموظفين')}: {data.previous_net==null ? '—' : cur(data.previous_net)}</Text>
            <Text style={{ color:'#4338ca' }}>{tr('Change','التغير')}: {data.change==null ? '—' : cur(data.change)}</Text>
          </Card>
          <Card style={{borderColor:'#a7f3d0'}}>
            <Text style={text}>{tr('Estimated net earned to date','صافي الاستحقاق التقديري حتى اليوم')}</Text>
            <Text style={{color:'#059669',fontSize:28,fontWeight:'900',marginVertical:12}}>{data.earned_estimate_available ? cur(data.earned_net_to_date) : tr('Needs payroll data review','يتطلب مراجعة بيانات الرواتب')}</Text>
            {data.earned_estimate_available && <Text style={muted}>{tr('Earned gross','إجمالي الاستحقاق')}: {cur(data.earned_gross_to_date)} · {tr('Monthly reserves','المخصصات الشهرية')}: {cur(data.monthly_reserves_to_date)}</Text>}
            <Text style={[muted,{marginTop:10,lineHeight:21}]}>{tr('Regular pay accrues over covered days. Dated approved earnings count through today; undated one-time items wait until cycle end. Tax, insurance and installment amounts are estimated reserves. This is not a withdrawable balance.','يُوزع الأجر المنتظم على الأيام المشمولة، وتُحتسب المستحقات المؤرخة المعتمدة حتى اليوم. تُؤجل البنود غير المؤرخة لنهاية الدورة. الضرائب والتأمينات والأقساط مخصصات تقديرية، وهذا ليس رصيداً متاحاً للسحب.')}</Text>
          </Card>
          <Card><Text style={text}>{data.pending_count} {tr('pending requests excluded','طلب معلق غير محتسب')} · {data.warning_count} {tr('data warnings','تنبيه بيانات')}</Text>
            {data.incomplete && <Text style={{ color:'#dc2626',marginTop:10 }}>{tr('Incomplete total: missing payroll contracts.','الإجمالي غير مكتمل: عقود رواتب مفقودة.')}</Text>}
            <Text style={[muted,{ marginTop:10,lineHeight:21 }]}>{tr('Actual attendance to today, current salary records and known approved items. Future scheduled days assume no new absence or lateness. This estimate can change before payroll.','الحضور الفعلي حتى اليوم وبيانات الراتب الحالية والبنود المعتمدة، مع افتراض انتظام الحضور للأيام المتبقية. قد يتغير التقدير قبل صرف الراتب.')}</Text>
            <Text style={[muted,{ marginTop:8 }]}>{tr('As of','حتى')} {data.as_of} · {tr('Calculated','آخر احتساب')} {new Date(data.calculated_at).toLocaleTimeString()}</Text>
          </Card>
          {!data.individual_details && <Text style={muted}>{tr('Team totals access only.','صلاحية عرض إجمالي الفريق فقط.')}</Text>}
        </>}
        {mode==='performance' && data && <Text style={[muted,{ marginBottom:15 }]}>{data.employees_without_goals} {tr('employees without goals. Red flag: progress is over 20 points behind the review timeline.','موظف بلا أهداف. التنبيه يعني تأخر التقدم بأكثر من ٢٠ نقطة عن مدة التقييم.')}</Text>}
        {data?.rows && (mode!=='forecast' || data.individual_details) && <>
          <TextInput accessibilityLabel={tr('Search employees','بحث الموظفين')} value={search} onChangeText={setSearch} placeholder={tr('Search name, code or goal','ابحث بالاسم أو الكود أو الهدف')} placeholderTextColor={colors.sub} style={[s.search,text,{ borderColor:colors.border }]} />
          {departments.length>1 && <ScrollView horizontal contentContainerStyle={{ gap:8,paddingBottom:14 }}><TouchableOpacity onPress={() => setDepartment('all')}><Text style={[muted,{ padding:8 }]}>{tr('All departments','كل الإدارات')}</Text></TouchableOpacity>{departments.map(d => <TouchableOpacity key={d} onPress={() => setDepartment(d)}><Text style={{ color:department===d ? '#6366f1' : colors.sub,padding:8 }}>{d}</Text></TouchableOpacity>)}</ScrollView>}
          {status!=='all' && <TouchableOpacity onPress={() => setStatus('all')}><Text style={[muted,{ marginBottom:12 }]}>{tr('Clear status filter','إلغاء تصفية الحالة')} ×</Text></TouchableOpacity>}
          {(mode==='overview' ? rows.slice(0,8) : rows).map(r => <Card key={r.id || r.employee_id}>
            <Text style={[text,{ fontWeight:'800',fontSize:16 }]}>{r.employee_name}</Text><Text style={muted}>{r.employee_number || r.title}</Text>
            {mode==='forecast' ? <><Text style={[text,{ fontSize:22,fontWeight:'800',marginTop:10 }]}>{cur(r.projected_net)}</Text><Text style={muted}>{tr('Previous','السابق')}: {r.previous_net==null ? '—' : cur(r.previous_net)} · {tr('Change','التغير')}: {r.change==null ? '—' : cur(r.change)}</Text>
              {r.accrual?.available && <Text style={[muted,{marginTop:8}]}>{tr('Estimated earned to date','\u0627\u0644\u0645\u0633\u062a\u062d\u0642 \u0627\u0644\u062a\u0642\u062f\u064a\u0631\u064a \u062d\u062a\u0649 \u0627\u0644\u064a\u0648\u0645')}: {cur(r.accrual.estimated_net)}</Text>}
              <Text style={[muted,{ marginTop:8 }]}>{tr('Overtime','إضافي')}: {cur(r.overtime_pay)} · {tr('Late / absence','تأخير / غياب')}: {cur(r.late_deductions+r.absence_deductions)}</Text>
              {r.warnings.map((w,i) => <Text key={i} style={{ color:'#b45309',marginTop:8 }}>{w}</Text>)}</>
              : mode==='performance' ? <><Text style={[text,{ marginTop:10 }]}>{tr('Target','المستهدف')}: {r.target || '—'}</Text><Text style={[text,{ marginTop:8 }]}>{r.progress}% · {label(r.health)}</Text><View style={{ height:6,backgroundColor:colors.border,borderRadius:4,marginTop:12 }}><View style={{ width:`${r.progress}%`,height:6,backgroundColor:r.health==='red_flag' ? '#ef4444' : '#6366f1',borderRadius:4 }} /></View></>
                : <><Text style={[text,{ marginTop:8 }]}>{label(r.status)} · {r.department_name || ''}</Text><Text style={[muted,{ marginTop:8 }]}>{tr('In','دخول')} {time(r.check_in)} · {tr('Out','خروج')} {time(r.check_out)}</Text></>}
            {mode==='performance' && user?.role!=='ceo' && <GoalProgressEditor goal={r} onSaved={load} />}
          </Card>)}
          {!rows.length && <Text style={muted}>{tr('No matching records.','لا توجد سجلات مطابقة.')}</Text>}
        </>}
      </>}
    </ScrollView>
  </SafeAreaView>
}
const s=StyleSheet.create({ scroll:{ padding:20,paddingBottom:130 },eyebrow:{ fontSize:10,fontWeight:'800',marginBottom:8 },title:{ fontSize:28,fontWeight:'900',marginBottom:8 },actions:{ gap:10,marginBottom:20 },action:{ padding:16,borderRadius:14,borderWidth:1 },period:{ flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20 },arrow:{ fontSize:30,paddingHorizontal:18 },counts:{ flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:18 },stat:{ width:'30%',padding:12,borderRadius:16,borderWidth:1 },search:{ borderWidth:1,borderRadius:12,padding:14,marginBottom:14 } })
