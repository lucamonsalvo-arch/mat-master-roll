import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Award, TrendingUp, Pin, Clock } from 'lucide-react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import BeltBadge from '../../components/shared/BeltBadge';

const MONTHS = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

export default function DashboardPage() {
  const user = getUser();
  const [stats,         setStats]         = useState(null);
  const [payments,      setPayments]      = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [schedules,     setSchedules]     = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [statsRes, payRes, annRes, schRes] = await Promise.all([
        api.get(`/api/attendance/stats/${user.id}`),
        api.get('/api/payments'),
        api.get('/api/announcements').catch(() => ({ data: [] })),
        api.get('/api/students/' + user.id + '/schedules').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setPayments(payRes.data.slice(0, 3));
      setAnnouncements(annRes.data || []);
      setSchedules(schRes.data || []);
    } finally { setLoading(false); }
  }

  const now = new Date();
  const todayDow = now.getDay();

  const todayClasses = schedules.filter(s => s.schedules?.day_of_week === todayDow);

  const currentMonthPaid = payments.some(p =>
    p.status === 'approved' &&
    p.month  === now.getMonth() + 1 &&
    p.year   === now.getFullYear()
  );

  if (loading) return <div className="p-6 text-gray-500 text-center py-16">Cargando...</div>;

  return (
    <div className="p-6 space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-red-900/40 to-gray-900 border border-red-800/40 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
            {user?.name?.[0]}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Oss, {user?.name?.split(' ')[0]}!</h2>
            <BeltBadge belt={user?.belt} stripe={user?.stripe}/>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <CalendarCheck className="text-red-500 mb-2" size={22}/>
          <p className="text-gray-400 text-xs">Clases este mes</p>
          <p className="text-3xl font-black text-white mt-1">{stats?.total ?? '—'}</p>
        </div>

        <Link to="/alumno/pago" className="block">
          <div className={`border rounded-2xl p-4 h-full cursor-pointer transition-all hover:brightness-110 ${currentMonthPaid ? 'bg-green-900/20 border-green-800' : 'bg-yellow-900/20 border-yellow-800'}`}>
            <Award className={currentMonthPaid ? 'text-green-400 mb-2' : 'text-yellow-400 mb-2'} size={22}/>
            <p className="text-gray-400 text-xs">{MONTHS[now.getMonth()+1]}</p>
            <p className={`text-base font-black mt-1 ${currentMonthPaid ? 'text-green-400' : 'text-yellow-400'}`}>
              {currentMonthPaid ? 'Al día ✓' : 'Pendiente'}
            </p>
          </div>
        </Link>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <TrendingUp className="text-blue-500 mb-2" size={22}/>
          <p className="text-gray-400 text-xs">Total de clases</p>
          <p className="text-3xl font-black text-white mt-1">
            {Object.values(stats?.byClass || {}).reduce((a,b) => a+b, 0) || '—'}
          </p>
        </div>
      </div>

      {/* Hoy */}
      {todayClasses.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Clock size={16} className="text-red-500"/> Hoy — {DAYS[todayDow]}
          </h3>
          <div className="space-y-2">
            {todayClasses.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{backgroundColor: s.schedules?.class_types?.color || '#ef4444'}}/>
                <span className="text-white font-medium text-sm">{s.schedules?.class_types?.name}</span>
                <span className="text-gray-500 text-sm ml-auto font-mono">
                  {s.schedules?.start_time?.slice(0,5)} – {s.schedules?.end_time?.slice(0,5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comunicados */}
      {announcements.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            📢 Comunicados
          </h3>
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id}
                className={`rounded-xl p-3.5 ${a.pinned ? 'bg-red-900/20 border border-red-800/40' : 'bg-gray-800'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {a.pinned && <Pin size={12} className="text-red-400"/>}
                  <p className="text-white font-semibold text-sm">{a.title}</p>
                </div>
                {a.body && <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap">{a.body}</p>}
                <p className="text-gray-600 text-xs mt-1.5">
                  {new Date(a.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'short' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presencia por clase */}
      {stats?.byClass && Object.keys(stats.byClass).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold text-white mb-4">Presencia por clase — {MONTHS[stats.month]} {stats.year}</h3>
          <div className="space-y-3">
            {Object.entries(stats.byClass).map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{name}</span>
                    <span className="text-sm font-bold text-white">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full"
                      style={{ width: `${Math.min((count / (stats.total||1)) * 100, 100)}%` }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
