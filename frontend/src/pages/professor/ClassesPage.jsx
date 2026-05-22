import { useState, useEffect } from 'react';
import { CheckSquare, Square, ChevronDown, Users, Calendar, UserPlus, Info, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import BeltBadge from '../../components/shared/BeltBadge';

const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function ClassesPage() {
  const [schedules,   setSchedules]   = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [date,        setDate]        = useState(new Date().toISOString().slice(0,10));
  const [students,    setStudents]    = useState([]);
  const [attendance,  setAttendance]  = useState(new Set());
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [tab,         setTab]         = useState('attendance'); // 'attendance' | 'enrollment'
  const [allStudents, setAllStudents] = useState([]);
  const [enrolling,   setEnrolling]   = useState(null);

  useEffect(() => { fetchSchedules(); }, []);
  useEffect(() => { if (selected) fetchClassData(); }, [selected, date]);
  useEffect(() => {
    if (tab === 'enrollment' && selected) {
      api.get('/api/students').then(({ data }) => setAllStudents(data));
    }
  }, [tab, selected]);

  async function fetchSchedules() {
    const { data } = await api.get('/api/schedules');
    setSchedules(data);
    if (data.length > 0) setSelected(data[0]);
  }

  async function fetchClassData() {
    setLoading(true);
    try {
      const [studRes, attRes] = await Promise.all([
        api.get(`/api/schedules/${selected.id}/students`),
        api.get(`/api/attendance?schedule_id=${selected.id}&date=${date}`),
      ]);
      setStudents(studRes.data.map(ss => ss.users).filter(Boolean));
      setAttendance(new Set(attRes.data.map(a => a.student_id)));
    } finally { setLoading(false); }
  }

  function toggleStudent(id) {
    setAttendance(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (attendance.size === students.length) setAttendance(new Set());
    else setAttendance(new Set(students.map(s => s.id)));
  }

  async function saveAttendance() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.post('/api/attendance/bulk', {
        student_ids: [...attendance],
        schedule_id: selected.id,
        class_date: date,
      });
      await fetchClassData();
    } finally { setSaving(false); }
  }

  const enrolledIds = new Set(students.map(s => s.id));

  async function toggleEnroll(student) {
    const isEnrolled = enrolledIds.has(student.id);
    setEnrolling(student.id);
    try {
      if (isEnrolled) {
        await api.delete(`/api/students/${student.id}/schedules/${selected.id}`);
      } else {
        await api.post(`/api/students/${student.id}/schedules`, { schedule_id: selected.id });
      }
      await fetchClassData();
    } finally { setEnrolling(null); }
  }

  const dayLabel = selected
    ? `${DAYS[selected.day_of_week]} ${selected.start_time?.slice(0,5)} – ${selected.end_time?.slice(0,5)}`
    : '';

  if (schedules.length === 0) {
    return (
      <div className="p-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Treinos</h2>
          <p className="text-gray-400 text-sm">Marcá a presença por treino e data</p>
        </div>
        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <LayoutGrid size={40} className="mx-auto text-gray-700 mb-3"/>
          <p className="text-gray-400 font-medium">Sem horários cadastrados</p>
          <p className="text-gray-600 text-sm mt-1">Criá um horário primeiro para poder marcar a presença</p>
          <Link to="/profesor/horarios"
            className="mt-4 inline-block text-red-500 hover:text-red-400 text-sm underline transition-colors">
            Ir a Horários →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Treinos</h2>
        <p className="text-gray-400 text-sm">Marcá a presença por treino e data</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={selected?.id || ''}
            onChange={e => { setSelected(schedules.find(s => s.id === e.target.value) || null); setTab('attendance'); }}
            className="appearance-none bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            {schedules.map(s => (
              <option key={s.id} value={s.id}>
                {s.class_types?.name} — {DAYS[s.day_of_week]} {s.start_time?.slice(0,5)}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>

        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      {selected && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between p-5 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selected.class_types?.color || '#ef4444' }}/>
                <h3 className="font-bold text-white text-lg">{selected.class_types?.name}</h3>
              </div>
              <p className="text-gray-400 text-sm flex items-center gap-1.5">
                <Calendar size={13}/> {dayLabel} · {format(new Date(date + 'T12:00'), "d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users size={16}/>
              <span className="font-semibold text-white">{attendance.size}</span>/{students.length} presentes
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {[
              { key: 'attendance', label: 'Presença' },
              { key: 'enrollment', label: 'Inscrições' },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  tab === t.key
                    ? 'border-red-600 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'attendance' && (
            <>
              {loading ? (
                <div className="p-8 text-center text-gray-500">Cargando atletas...</div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center">
                  <Users size={32} className="mx-auto text-gray-700 mb-3"/>
                  <p className="text-gray-400 text-sm">Sem atletas inscritos neste treino</p>
                  <button type="button" onClick={() => setTab('enrollment')}
                    className="mt-2 text-red-500 hover:text-red-400 text-xs underline">
                    Ir a Inscrições →
                  </button>
                </div>
              ) : (
                <div>
                  <div className="px-5 py-3 border-b border-gray-800">
                    <button type="button" onClick={toggleAll}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                      {attendance.size === students.length
                        ? <CheckSquare size={16} className="text-red-500"/>
                        : <Square size={16}/>}
                      {attendance.size === students.length ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {students.map(s => {
                      const present = attendance.has(s.id);
                      return (
                        <div key={s.id} onClick={() => toggleStudent(s.id)}
                          className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-gray-800/50 transition-colors">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${present ? 'bg-red-600 border-red-600' : 'border-gray-600'}`}>
                            {present && <CheckSquare size={14} className="text-white"/>}
                          </div>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                              {s.name?.[0]}
                            </div>
                            <span className={`font-medium ${present ? 'text-white' : 'text-gray-400'}`}>{s.name}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${present ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                            {present ? 'Presente' : 'Ausente'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="p-5 border-t border-gray-800">
                <button type="button" onClick={saveAttendance}
                  disabled={saving || students.length === 0}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
                  {saving ? 'Guardando...' : 'Guardar presença'}
                </button>
              </div>
            </>
          )}

          {tab === 'enrollment' && (
            <div className="p-5 space-y-4">
              <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 flex items-start gap-3">
                <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-blue-300 font-medium text-sm">Como inscribir atletas</p>
                  <p className="text-blue-400/80 text-xs mt-0.5 leading-relaxed">
                    Solo los atletas inscritos en este treino aparecen en la lista de presença.
                    Usá los botones para inscribir o dar de baja a un atleta de este horário.
                  </p>
                </div>
              </div>

              {allStudents.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">Cargando atletas...</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {allStudents.map(s => {
                    const isEnrolled = enrolledIds.has(s.id);
                    return (
                      <div key={s.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                            {s.name?.[0]}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isEnrolled ? 'text-white' : 'text-gray-400'}`}>{s.name}</p>
                            <BeltBadge belt={s.belt} stripe={s.stripe}/>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleEnroll(s)}
                          disabled={enrolling === s.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                            isEnrolled
                              ? 'bg-green-900/40 text-green-400 hover:bg-red-900/40 hover:text-red-400'
                              : 'bg-gray-800 text-gray-400 hover:bg-green-900/40 hover:text-green-400'
                          }`}
                        >
                          {enrolling === s.id ? '...' : isEnrolled ? 'Inscrito ✓' : '+ Inscribir'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
