import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LanguageContext'
import api from '../services/api'
export default function GoalProgressEditor({ goal, onSaved }) {
  const { colors }=useTheme()
  const { tr }=useLang()
  const [progress,setProgress]=useState(String(goal.progress))
  const [note,setNote]=useState('')
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const save=async()=>{
    const value=Number(progress)
    if(!progress.trim() || !Number.isInteger(value) || value<0 || value>100) { setError(tr('Enter a percentage from 0 to 100.','أدخل نسبة من ٠ إلى ١٠٠.')); return }
    setSaving(true);setError('')
    try { await api.patch(`/performance/goals/${goal.id}`,{progress:value,status:value===100 ? 'completed' : 'active',...(note.trim() ? {description:[goal.description, note.trim()].filter(Boolean).join('\n')} : {})}); onSaved?.() }
    catch(e){setError(e.response?.data?.message || tr('Could not save progress.','تعذر حفظ التقدم.'))}
    finally{setSaving(false)}
  }
  return <View style={{marginTop:12}}>
    <TextInput accessibilityLabel={tr('Progress percentage','نسبة التقدم')} keyboardType="number-pad" value={progress} onChangeText={setProgress} style={{color:colors.text,borderWidth:1,borderColor:colors.border,padding:10,borderRadius:10}} />
    <TextInput accessibilityLabel={tr('Progress note','ملاحظة التقدم')} value={note} onChangeText={setNote} placeholder={tr('Update / corrective action (optional)','تحديث أو إجراء تصحيحي (اختياري)')} placeholderTextColor={colors.sub} style={{color:colors.text,padding:10}} />
    <TouchableOpacity onPress={save} disabled={saving} style={{backgroundColor:'#4338ca',padding:12,borderRadius:10}}><Text style={{color:'#fff',textAlign:'center'}}>{saving ? '…' : tr('Save progress','حفظ التقدم')}</Text></TouchableOpacity>
    {!!error && <Text accessibilityRole="alert" style={{color:'#dc2626',marginTop:8}}>{error}</Text>}
  </View>
}
