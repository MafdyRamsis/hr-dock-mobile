import { useCallback, useEffect, useState } from 'react'
import { Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../src/context/AuthContext'
import { useTheme } from '../src/context/ThemeContext'
import { useLang } from '../src/context/LanguageContext'
import api from '../src/services/api'
import Card from '../src/components/Card'
import GoalProgressEditor from '../src/components/GoalProgressEditor'
export default function MyGoals(){
  const {user}=useAuth();const {colors}=useTheme();const {tr}=useLang()
  const [goals,setGoals]=useState([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('')
  const load=useCallback(async()=>{if(!user?.employee_id)return;setLoading(true);setError('');try{const r=await api.get('/performance/goals',{params:{employee_id:user.employee_id}});setGoals(r.data.data || [])}catch(e){setError(e.response?.data?.message || 'Could not load goals')}finally{setLoading(false)}},[user?.employee_id])
  useEffect(()=>{load()},[load])
  return <SafeAreaView style={{flex:1,backgroundColor:colors.bg}} edges={['top']}><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}>
    <Text style={{color:colors.text,fontSize:28,fontWeight:'900',marginBottom:20}}>{tr('My goals','أهدافي')}</Text>
    {!!error && <Text accessibilityRole="alert" style={{color:'#dc2626'}}>{error}</Text>}
    {goals.filter(g=>g.status!=='cancelled').map(g=><Card key={g.id}><Text style={{color:colors.text,fontWeight:'800',fontSize:17}}>{g.title}</Text><Text style={{color:colors.sub,marginTop:8}}>{tr('Target','المستهدف')}: {g.target || '—'} · {g.progress}%</Text><GoalProgressEditor goal={g} onSaved={load}/></Card>)}
    {!loading && !goals.length && <Text style={{color:colors.sub}}>{tr('No goals assigned yet. Ask your manager to set your targets.','لم يتم إسناد أهداف بعد. تواصل مع مديرك لتحديد المستهدفات.')}</Text>}
  </ScrollView></SafeAreaView>
}
