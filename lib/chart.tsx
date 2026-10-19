'use client'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts'
type D = { name: string; value: number }
type P = { data: D[]; type?: 'bar' | 'line'; h?: number; horizontal?: boolean; suffix?: string }
const corto = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
const num = (v: any, suffix: string) => `${Number(v).toLocaleString()}${suffix}`
const YTick = ({ x, y, payload }: any) => <g transform={`translate(${x},${y})`}><title>{payload.value}</title>
  <text x={-8} y={0} dy={4} textAnchor="end" fontSize={11} fill="#475569">{corto(String(payload.value), 22)}</text></g>
const eje = { fontSize: 11, fill: '#64748b' }
export const altoHorizontal = (n: number, h = 240) => Math.max(h, n * 36 + 40)
export function buildChart({ data, type = 'bar', horizontal = false, suffix = '' }: P) {
  const tip = <Tooltip formatter={(v: any) => num(v, suffix)} cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
  if (type === 'line') return <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>{grid}<XAxis dataKey="name" tick={eje} tickFormatter={(v: any) => corto(String(v), 12)} /><YAxis tick={eje} allowDecimals={false} />{tip}<Line dataKey="value" stroke="#0b1e38" strokeWidth={2} dot={data.length < 20} /></LineChart>
  if (horizontal) return <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 0, bottom: 4 }} barCategoryGap={8}>{grid}
    <XAxis type="number" tick={eje} allowDecimals={false} /><YAxis type="category" dataKey="name" width={190} tick={<YTick />} interval={0} tickLine={false} />{tip}
    <Bar dataKey="value" fill="#0b1e38" radius={[0, 4, 4, 0]} barSize={20}><LabelList dataKey="value" position="right" fontSize={11} fill="#0b1e38" formatter={(v: any) => num(v, suffix)} /></Bar></BarChart>
  return <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>{grid}<XAxis dataKey="name" tick={eje} tickFormatter={(v: any) => corto(String(v), 14)} /><YAxis tick={eje} allowDecimals={false} />{tip}
    <Bar dataKey="value" fill="#0b1e38" radius={[4, 4, 0, 0]}><LabelList dataKey="value" position="top" fontSize={11} fill="#0b1e38" formatter={(v: any) => num(v, suffix)} /></Bar></BarChart>
}
export function Chart(p: P) {
  if (!p.data.length) return <p className="text-sm text-slate-400 py-10 text-center">Sin datos</p>
  return <div style={{ height: p.horizontal ? altoHorizontal(p.data.length, p.h) : p.h ?? 240 }}><ResponsiveContainer width="100%" height="100%">{buildChart(p)}</ResponsiveContainer></div>
}
