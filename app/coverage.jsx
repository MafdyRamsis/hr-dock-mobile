import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, ScrollView, View, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../src/context/ThemeContext'
import { useLang } from '../src/context/LanguageContext'
import { useAuth } from '../src/context/AuthContext'
import api from '../src/services/api'
import Card from '../src/components/Card'
import { activePayrollMonth } from '../src/utils/payrollCycle'
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
export default function CoverageScreen(){
  const {colors}=useTheme();const {tr,date}=useLang();const {user,can,cycleStartDay}=useAuth()
  const [selectedMonth,setMonth]=useState(null)
  const month=selectedMonth || activePayrollMonth(today(),cycleStartDay)
  const [year,monthNumber]=month.split('-').map(Number)
  const [loaded,setData]=useState(null);const [error,setError]=useState('');const [loading,setLoading]=useState(false)
  const enabled=can('app') && can('team_approvals') && ['admin','hr_manager','manager','ceo'].includes(user?.role)
  const viewKey=[user?.company_id,user?.id,user?.role,month,enabled].join(':')
  const data=enabled && loaded?.key===viewKey ? loaded.value : null
  const requestId=useRef(0)
  const load=useCallback(async()=>{
    const current=++requestId.current
    if(!enabled){setData(null);setLoading(false);return}
    setLoading(true);setData(null);setError('')
    try{
      const r=await api.get('/leadership/coverage',{params:{month:monthNumber,year}})
      if(current===requestId.current)setData({key:viewKey,value:r.data.data})
    }catch(e){if(current===requestId.current)setError(e.response?.data?.message || 'Could not load coverage')}
    finally{if(current===requestId.current)setLoading(false)}
  },[enabled,monthNumber,year,viewKey])
  useEffect(()=>{load();return()=>{requestId.current++}},[load])
  const dates={};for(const r of data?.rows || []){const from=r.start_date>data.period.from?r.start_date:data.period.from;const to=r.end_date<data.period.to?r.end_date:data.period.to;for(const d=new Date(from+'T12:00:00Z');d<=new Date(to+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1)){const key=d.toISOString().slice(0,10);dates[key] ||= [];dates[key].push(r)}}
  return <SafeAreaView style={{flex:1,backgroundColor:colors.bg}} edges={['top']}><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}>
    <Text style={{color:colors.text,fontSize:28,fontWeight:'900'}}>{tr('Team coverage','تغطية الفريق')}</Text>
    <Text style={{color:colors.sub,marginVertical:12}}>{tr('Approved and pending leave, before you decide. Pending leave is not confirmed absence.','الإجازات المعتمدة والمعلقة قبل اتخاذ القرار. الطلبات المعلقة ليست غياباً مؤكداً.')}</Text>
    <View style={{flexDirection:'row',justifyContent:'space-between',marginVertical:15}}>{[-1,1].map(v=><TouchableOpacity key={v} onPress={()=>setMonth(new Date(Date.UTC(year,monthNumber-1+v,1)).toISOString().slice(0,7))}><Text style={{color:colors.text,fontSize:22}}>{v<0?'‹':'›'}</Text></TouchableOpacity>)}<Text style={{color:colors.text}}>{month}</Text></View>
    {!enabled && <Text style={{color:colors.sub}}>{tr('This feature is not enabled.','هذه الميزة غير مفعلة.')}</Text>}
    {!!error && <Text accessibilityRole="alert" style={{color:'#dc2626'}}>{error}</Text>}
    {data && <Text style={{color:colors.sub,marginBottom:15}}>{data.period.from} → {data.period.to} · {data.team_size} {tr('team members','عضو بالفريق')}</Text>}
    {Object.entries(dates).map(([day,rows])=><Card key={day}><Text style={{color:colors.text,fontWeight:'800'}}>{date(day)}</Text>{rows.map(r=><Text key={r.id} style={{color:colors.sub,marginTop:8}}>{r.employee_name} · {r.status==='approved'?tr('Approved','معتمد'):tr('Pending','معلق')}</Text>)}</Card>)}
    {data && !data.rows.length && <Text style={{color:colors.sub}}>{tr('No leave requests in this payroll cycle.','لا توجد طلبات إجازة في هذه الدورة.')}</Text>}
  </ScrollView></SafeAreaView>
}
