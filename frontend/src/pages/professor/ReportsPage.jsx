import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, Activity, Calendar } from 'lucide-react';
import BeltBadge from '../../components/shared/BeltBadge';

const API = import.meta.env.VITE_API_URL;
const token = () => localStorage.getItem('token');
const get = (path) => fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json());

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const NOW = new Date();

function Trend({ curr, prev, prefix = '$', invert = false }) {
  if (prev === 0 && curr === 0) return <span className="text-gray-500 text-sm flex items-center gap-0.5"><Minus size={14}/> sin datos</span>;
  const diff = curr - prev;
  const pct  = prev > 0 ? Math.round((diff / prev) * 100) : null;
  const up   = diff >= 0;
  const good = invert ? !up : up;
  return (
    <span className={`text-sm flex items-center gap-0.5 ${good ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
      {prefix}{Math.abs(diff).toLocaleString('es-AR')}
      {pct !== null && ` (${pct > 0 ? '+' : ''}${pct}%)`}
      <span className="text-gray-500 ml-1">vs mes ant.</span>
    </span>
  );
}

function StatCard({ icon: Icon, label, value, trend, color = 'text-red-500' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Icon size={16} className={color}/> {label}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {trend}
    </div>
  );
}

const DONUT_COLORS = {
  paid:    '#22c55e',
  pending: '#f59e0b',
  overdue: '#ef4444',
  noData:  '#374151',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [year,  setYear]  = useState(NOW.getFullYear());
  const [filter, setFilter] = useState('month'); // 'month' | 'week'
  const [isoWeek, setIsoWeek] = useState(getISOWeek(NOW));

  const [summary,  setSummary]  = useState(null);
  const [attData,  setAttData]  = useState([]);
  const [ranking,  setRanking]  = useState(null);
  const [payStatus, setPayStatus] = useState(null);
  const [income,   setIncome]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  function getISOWeek(d) {
    const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (tmp.getDay() + 6) % 7;
    tmp.setDate(tmp.getDate() - day + 3);
    const firstThursday = new Date(tmp.getFullYear(), 0, 4);
    const diff = tmp - firstThursday;
    return 1 + Math.round(diff / 604800000);
  }

  useEffect(() => {
    setLoading(true);
    const weekParam = filter === 'week' ? `&week=${isoWeek}&year=${year}` : '';
    Promise.all([
      get(`/api/reports/summary?month=${month}&year=${year}`),
      get(`/api/reports/attendance-by-class?month=${month}&year=${year}${weekParam}`),
      get(`/api/reports/student-ranking?month=${month}&year=${year}`),
      get(`/api/reports/payment-status?month=${month}&year=${year}`),
      get(`/api/reports/income-history?months=6`),
    ]).then(([s, a, r, ps, inc]) => {
      setSummary(s);
      setAttData(a.data || []);
      setRanking(r);
      setPayStatus(ps);
      setIncome(inc);
      setLoading(false);
    });
  }, [month, year, filter, isoWeek]);

  const donutData = payStatus ? [
    { name: 'Pagaron',  value: payStatus.paid,    fill: DONUT_COLORS.paid    },
    { name: 'Pendiente', value: payStatus.pending, fill: DONUT_COLORS.pending },
    { name: 'Vencido',  value: payStatus.overdue,  fill: DONUT_COLORS.overdue },
    { name: 'Sin pago', value: payStatus.noData,   fill: DONUT_COLORS.noData  },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="p-6 space-y-8 text-white">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            {MONTHS_ES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Cargando reportes…</div>
      ) : (<>

      {/* 1 — RESUMEN DEL MES */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-300 border-b border-gray-800 pb-2">Resumen del mes — {MONTHS_ES[month-1]} {year}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign} label="Total cobrado" color="text-emerald-500"
            value={`$${(summary?.collected || 0).toLocaleString('es-AR')}`}
            trend={<Trend curr={summary?.collected || 0} prev={summary?.prev?.collected || 0}/>}
          />
          <StatCard
            icon={DollarSign} label="Pendiente de cobro" color="text-amber-500"
            value={`$${(summary?.pending || 0).toLocaleString('es-AR')}`}
            trend={<Trend curr={summary?.pending || 0} prev={summary?.prev?.pending || 0} invert/>}
          />
          <StatCard
            icon={Users} label="Atletas activos" color="text-blue-500"
            value={summary?.activeStudents || 0}
            trend={<span className="text-gray-500 text-sm">total en el sistema</span>}
          />
          <StatCard
            icon={Activity} label="Asistencias" color="text-red-500"
            value={summary?.attendance || 0}
            trend={<Trend curr={summary?.attendance || 0} prev={summary?.prev?.attendance || 0} prefix=""/>}
          />
        </div>
      </section>

      {/* 2 — ASISTENCIA POR AULA */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-2">
          <h2 className="text-lg font-semibold text-gray-300">Asistencia por aula</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('month')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filter === 'month' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >Mes</button>
            <button
              onClick={() => setFilter('week')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filter === 'week' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >Semana</button>
            {filter === 'week' && (
              <div className="flex items-center gap-1">
                <button onClick={() => setIsoWeek(w => Math.max(1, w - 1))} className="px-2 py-1 bg-gray-800 rounded text-sm">‹</button>
                <span className="text-sm text-gray-400 min-w-[4rem] text-center">Sem. {isoWeek}</span>
                <button onClick={() => setIsoWeek(w => Math.min(53, w + 1))} className="px-2 py-1 bg-gray-800 rounded text-sm">›</button>
              </div>
            )}
          </div>
        </div>
        {attData.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">Sin datos de asistencia para este período</div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%"/>
                <Tooltip content={<CustomTooltip/>} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
                <Bar dataKey="pct" name="% asistencia" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {attData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || '#ef4444'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-3">
              {attData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-sm text-gray-400">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: d.color || '#ef4444' }}/>
                  {d.name}: <span className="text-white font-semibold">{d.count}</span> asistencias ({d.pct}%)
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3 — RANKING DE ATLETAS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-300 border-b border-gray-800 pb-2">Ranking de atletas — {MONTHS_ES[month-1]} {year}</h2>
        {(!ranking?.top5?.length && !ranking?.bottom5?.length) ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">Sin datos suficientes para el ranking</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RankingTable title="Top 5 — Mayor asistencia" rows={ranking?.top5 || []} accent="emerald"/>
            <RankingTable title="Top 5 — Menor asistencia" rows={ranking?.bottom5 || []} accent="red"/>
          </div>
        )}
      </section>

      {/* 4 — ESTADO DE PAGOS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-300 border-b border-gray-800 pb-2">Estado de pagos — {MONTHS_ES[month-1]} {year}</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col lg:flex-row items-center gap-6">
          {donutData.length === 0 ? (
            <div className="w-full py-8 text-center text-gray-500">Sin datos de pagos para este mes</div>
          ) : (<>
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {donutData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                </Pie>
                <Tooltip formatter={(v) => `${v} atleta${v !== 1 ? 's' : ''}`}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Pagaron',   val: payStatus?.paid,    color: DONUT_COLORS.paid    },
                { label: 'Pendiente', val: payStatus?.pending,  color: DONUT_COLORS.pending },
                { label: 'Vencido',   val: payStatus?.overdue,  color: DONUT_COLORS.overdue },
                { label: 'Sin pago',  val: payStatus?.noData,   color: DONUT_COLORS.noData  },
              ].map(({ label, val, color }) => val > 0 && (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }}/>
                  <span className="text-gray-300 text-sm w-24">{label}</span>
                  <span className="text-white font-bold text-lg">{val}</span>
                  <span className="text-gray-500 text-sm">
                    ({Math.round((val / payStatus.total) * 100)}%)
                  </span>
                </div>
              ))}
              <div className="mt-1 pt-2 border-t border-gray-800 text-gray-500 text-sm">
                Total activos: <span className="text-white font-semibold">{payStatus?.total}</span>
              </div>
            </div>
          </>)}
        </div>
      </section>

      {/* 5 — HISTORIAL DE INGRESOS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-300 border-b border-gray-800 pb-2">Historial de ingresos — últimos 6 meses</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          {income.length === 0 ? (
            <div className="py-8 text-center text-gray-500">Sin datos de ingresos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={income} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
                <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                <Tooltip
                  content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                      <div className="text-gray-400 mb-1">{label}</div>
                      <div className="text-white font-bold">${payload[0].value.toLocaleString('es-AR')}</div>
                    </div>
                  ) : null}
                />
                <Line
                  type="monotone" dataKey="total" name="Ingresos"
                  stroke="#ef4444" strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      </>)}
    </div>
  );
}

function RankingTable({ title, rows, accent }) {
  const colors = {
    emerald: { bar: '#22c55e', badge: 'bg-emerald-900/40 text-emerald-400 border-emerald-800' },
    red:     { bar: '#ef4444', badge: 'bg-red-900/40 text-red-400 border-red-800' },
  };
  const c = colors[accent];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 text-sm font-semibold text-gray-300">{title}</div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">Sin datos</div>
      ) : (
        <div className="divide-y divide-gray-800">
          {rows.map((s, i) => (
            <div key={s.id} className="px-4 py-3 flex items-center gap-3">
              <span className="text-gray-600 text-sm w-5 text-center font-bold">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{s.name}</div>
                <BeltBadge belt={s.belt} stripe={s.stripe}/>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.badge}`}>{s.pct}%</span>
                <span className="text-xs text-gray-600">{s.attended}/{s.expected} clases</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
