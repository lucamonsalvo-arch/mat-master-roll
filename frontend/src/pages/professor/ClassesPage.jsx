import { useState, useEffect } from 'react';
import { CheckSquare, Square, ChevronDown, Users, Calendar } from 'lucide-react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export default function ClassesPage() {
  const [schedules,   setSchedules]   = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [date,        setDate]        = useState(new Date().toISOString().slice(0,10));
  const [students,    setStudents]    = useState([]);
  const [attendance,  setAttendance]  = useState(new Set());
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => { fetchSchedules(); }, []);
  useEffect(() => { if (selected) fetchClassData(); }, [selected, date]);

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

  const dayLabel = selected
    ? `${DAYS[selected.day_of_week]} ${selected.start_time?.slice(0,5)} – ${selected.end_time?.slice(0,5)}`
    : '';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Clases</h2>
        <p className="text-gray-400 text-sm">Marcá la asistencia por clase y fecha</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Schedule selector */}
        <div className="relative">
          <select
            value={selected?.id || ''}
            onChange={e => setSelected(schedules.find(s => s.id === e.target.value) || null)}
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

        {/* Date picker */}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      {selected && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800">
          {/* Class header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selected.class_types?.color || '#ef4444' }}
                />
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

          {/* Student list */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando alumnos...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay alumnos inscriptos en esta clase</div>
          ) : (
            <div>
              {/* Toggle all */}
              <div className="px-5 py-3 border-b border-gray-800">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
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
                    <div
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-gray-800/50 transition-colors"
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${present ? 'bg-red-600 border-red-600' : 'border-gray-600'}`}>
                        {present && <CheckSquare size={14} className="text-white"/>}
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold">
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

          {/* Save */}
          <div className="p-5 border-t border-gray-800">
            <button
              onClick={saveAttendance}
              disabled={saving || students.length === 0}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar asistencia'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
