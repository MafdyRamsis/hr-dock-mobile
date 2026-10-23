export function payrollCycle(month, year, startDay = 1) {
  const day = Math.max(1,Math.min(28,parseInt(startDay,10) || 1))
  const iso = d => d.toISOString().slice(0,10)
  return day === 1
    ? { from:iso(new Date(Date.UTC(year,month,1))),to:iso(new Date(Date.UTC(year,month+1,0))) }
    : { from:iso(new Date(Date.UTC(year,month-1,day))),to:iso(new Date(Date.UTC(year,month,day-1))) }
}
export function activePayrollMonth(date, startDay = 1) {
  const [year,month,day]=date.split('-').map(Number)
  return new Date(Date.UTC(year,month-1+(startDay>1 && day>=startDay ? 1 : 0),1)).toISOString().slice(0,7)
}
