'use client'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
export function Chart({ data, type = 'bar', h = 240, horizontal = false, suffix = '' }: { data: { name: string; value: number }[]; type?: 'bar' | 'line'; h?: number; horizontal?: boolean; suffix?: string }) {
  if (!data.length) return <p className="text-sm text-slate-400 py-10 text-center">Sin datos</p>
  const tip = <Tooltip formatter={(v: any) => `${Number(v).toLocaleString()}${suffix}`} />
  return <div style={{ height: horizontal ? Math.max(h, data.length * 30) : h }}><ResponsiveContainer width="100%" height="100%">
    {type === 'line' ? <LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />{tip}<Line dataKey="value" stroke="#0b1e38" strokeWidth={2} dot={false} /></LineChart>
      : horizontal ? <BarChart data={data} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" width={130} fontSize={11} />{tip}<Bar dataKey="value" fill="#0b1e38" radius={[0, 4, 4, 0]} /></BarChart>
        : <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />{tip}<Bar dataKey="value" fill="#0b1e38" radius={[4, 4, 0, 0]} /></BarChart>}
  </ResponsiveContainer></div>
}
