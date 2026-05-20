import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

export default function SchedulesPage() {
  const user = getUser();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/students/${user.id}/schedules`)
      .then(({ data }) => setEnrollments(data))
      .finally(() => setLoading(false));
  }, []);

  const todayIdx = new Date().getDay();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Mis horarios</h2>
        <p className="text-gray-400 text-sm">{enrollments.length} clases inscripto</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : enrollments.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <Calendar size={40} className="mx-auto text-gray-600 mb-3"/>
          <p className="text-gray-400">No estás inscripto en ninguna clase todavía</p>
          <p className="text-gray-500 text-sm mt-1">Hablá con tu profesor para que te agregue</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {DAYS.map((day, idx) => {
            const dayClasses = enrollments
              .filter(e => e.schedules?.day_of_week === idx)
              .sort((a,b) => a.schedules?.start_time?.localeCompare(b.schedules?.start_time));
            if (dayClasses.length === 0) return null;
            const isToday = idx === todayIdx;
            return (
              <div key={idx} className={`bg-gray-900 rounded-2xl border overflow-hidden ${isToday?'border-red-600':'border-gray-800'}`}>
                <div className={`px-5 py-3 border-b ${isToday?'bg-red-600/20 border-red-800':'border-gray-800'}`}>
                  <h3 className={`font-bold ${isToday?'text-red-400':'text-white'}`}>
                    {day} {isToday && <span className="text-xs font-normal">(hoy)</span>}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {dayClasses.map(e => {
                    const s = e.schedules;
                    return (
                      <div key={e.id} className="flex gap-3">
                        <div
                          className="w-1 rounded-full flex-shrink-0"
                          style={{ backgroundColor: s?.class_types?.color || '#ef4444' }}
                        />
                        <div>
                          <p className="font-semibold text-white">{s?.class_types?.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-gray-400 text-xs">
                            <span className="flex items-center gap-1">
                              <Clock size={11}/> {s?.start_time?.slice(0,5)} – {s?.end_time?.slice(0,5)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={11}/> {s?.location}
                            </span>
                          </div>
                          {s?.users?.name && (
                            <p className="text-gray-500 text-xs mt-0.5">Prof. {s.users.name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }).filter(Boolean)}
        </div>
      )}
    </div>
  );
}
