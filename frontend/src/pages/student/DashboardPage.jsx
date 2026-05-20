import { useState, useEffect } from 'react';
import { CalendarCheck, TrendingUp, Award } from 'lucide-react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import BeltBadge from '../../components/shared/BeltBadge';

const MONTHS = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function DashboardPage() {
  const user = getUser();
  const [stats,    setStats]    = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [statsRes, payRes] = await Promise.all([
        api.get(`/api/attendance/stats/${user.id}`),
        api.get('/api/payments'),
      ]);
      setStats(statsRes.data);
      setPayments(payRes.data.slice(0, 5));
    } finally { setLoading(false); }
  }

  const now = new Date();
  const currentMonthPaid = payments.some(p =>
    p.status === 'approved' &&
    p.month === now.getMonth() + 1 &&
    p.year  === now.getFullYear()
  );

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-red-900/40 to-gray-900 border border-red-800/40 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-2xl font-black text-white">
            {user?.name?.[0]}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">¡Oss, {user?.name?.split(' ')[0]}!</h2>
            <BeltBadge belt={user?.belt} stripe={user?.stripe}/>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <CalendarCheck className="text-red-500 mb-2" size={24}/>
          <p className="text-gray-400 text-sm">Clases este mes</p>
          <p className="text-3xl font-black text-white mt-1">{stats?.total ?? '—'}</p>
        </div>
        <div className={`border rounded-2xl p-5 ${currentMonthPaid ? 'bg-green-900/20 border-green-800' : 'bg-yellow-900/20 border-yellow-800'}`}>
          <Award className={currentMonthPaid ? 'text-green-400 mb-2' : 'text-yellow-400 mb-2'} size={24}/>
          <p className="text-gray-400 text-sm">Cuota {MONTHS[now.getMonth()+1]}</p>
          <p className={`text-xl font-black mt-1 ${currentMonthPaid ? 'text-green-400' : 'text-yellow-400'}`}>
            {currentMonthPaid ? 'Al día ✓' : 'Pendiente'}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <TrendingUp className="text-blue-500 mb-2" size={24}/>
          <p className="text-gray-400 text-sm">Clases totales</p>
          <p className="text-3xl font-black text-white mt-1">
            {Object.values(stats?.byClass || {}).reduce((a,b)=>a+b,0) || '—'}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      {stats?.byClass && Object.keys(stats.byClass).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold text-white mb-4">Asistencia por clase — {MONTHS[stats.month]} {stats.year}</h3>
          <div className="space-y-3">
            {Object.entries(stats.byClass).map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{name}</span>
                    <span className="text-sm font-bold text-white">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full"
                      style={{ width: `${Math.min((count / (stats.total||1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent payments */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4">Últimos pagos</h3>
        {payments.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{p.concept}</p>
                  <p className="text-xs text-gray-500">{p.month && `${MONTHS[p.month]} ${p.year}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">${Number(p.amount).toLocaleString('es-AR')}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.status==='approved'?'bg-green-900/40 text-green-400':
                    p.status==='pending' ?'bg-yellow-900/40 text-yellow-400':
                    'bg-red-900/40 text-red-400'}`}>
                    {p.status==='approved'?'Pagado':p.status==='pending'?'Pendiente':'Rechazado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
