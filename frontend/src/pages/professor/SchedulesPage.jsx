import { useState, useEffect } from 'react';
import { Plus, X, Save, List, LayoutGrid } from 'lucide-react';
import api from '../../lib/api';

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const EMPTY = { class_type_id:'', professor_id:'', days:[], start_time:'19:00', end_time:'20:30', location:'Mat Principal' };

export default function SchedulesPage() {
  const [schedules,  setSchedules]  = useState([]);
  const [classTypes, setClassTypes] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [view,       setView]       = useState('grid'); // 'list' | 'grid'
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const [schRes, ctRes] = await Promise.all([
      api.get('/api/schedules'),
      api.get('/api/schedules/class-types'),
    ]);
    setSchedules(schRes.data);
    setClassTypes(ctRes.data);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (form.days.length === 0) { setError('Seleccioná al menos un día'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/api/schedules', form);
      await load();
      setModal(false);
      setForm(EMPTY);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  function toggleDay(idx) {
    setForm(prev => ({
      ...prev,
      days: prev.days.includes(idx) ? prev.days.filter(d => d !== idx) : [...prev.days, idx],
    }));
  }

  async function deleteSchedule(id) {
    if (!confirm('¿Eliminar este horario?')) return;
    await api.delete(`/api/schedules/${id}`);
    await load();
  }

  // Group by day for grid view
  const byDay = DAYS.map((day, idx) => ({
    day, idx,
    classes: schedules.filter(s => s.day_of_week === idx).sort((a,b)=>a.start_time.localeCompare(b.start_time)),
  })).filter(d => d.classes.length > 0 || view === 'grid');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Horarios</h2>
          <p className="text-gray-400 text-sm">{schedules.length} clases programadas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
            <button onClick={()=>setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${view==='list'?'bg-gray-800 text-white':'text-gray-400 hover:text-white'}`}>
              <List size={16}/> Lista
            </button>
            <button onClick={()=>setView('grid')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${view==='grid'?'bg-gray-800 text-white':'text-gray-400 hover:text-white'}`}>
              <LayoutGrid size={16}/> Cronograma
            </button>
          </div>
          <button onClick={()=>{setForm(EMPTY);setModal(true);setError('');}}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
            <Plus size={18}/> Agregar
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {schedules.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay horarios cargados</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Clase','Día','Horario','Lugar','Profesor'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {schedules.map(s=>(
                  <tr key={s.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: s.class_types?.color}}/>
                        <span className="font-medium text-white">{s.class_types?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{DAYS[s.day_of_week]}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm font-mono">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{s.location}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{s.users?.name || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={()=>deleteSchedule(s.id)} className="text-gray-500 hover:text-red-400 text-sm transition-colors">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Weekly grid */
        <div className="grid grid-cols-7 gap-2">
          {DAYS_SHORT.map((day, idx) => {
            const dayClasses = schedules.filter(s => s.day_of_week === idx).sort((a,b)=>a.start_time.localeCompare(b.start_time));
            const isToday = new Date().getDay() === idx;
            return (
              <div key={idx} className={`bg-gray-900 rounded-2xl border overflow-hidden ${isToday ? 'border-red-600' : 'border-gray-800'}`}>
                <div className={`px-3 py-2 text-center border-b ${isToday ? 'bg-red-600 border-red-600' : 'border-gray-800'}`}>
                  <p className="text-xs font-bold text-white">{day}</p>
                </div>
                <div className="p-2 space-y-2 min-h-[120px]">
                  {dayClasses.map(s=>(
                    <div key={s.id} className="rounded-lg p-2 text-xs" style={{backgroundColor: s.class_types?.color+'22', borderLeft: `3px solid ${s.class_types?.color}`}}>
                      <p className="font-semibold text-white leading-tight">{s.class_types?.name}</p>
                      <p className="text-gray-400 mt-0.5">{s.start_time?.slice(0,5)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">Nueva clase</h3>
              <button onClick={()=>setModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de clase *</label>
                <select value={form.class_type_id} onChange={e=>setForm({...form,class_type_id:e.target.value})}
                  className={INPUT} required>
                  <option value="">Seleccionar...</option>
                  {classTypes.map(ct=><option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Días * <span className="text-gray-600">(podés elegir varios)</span></label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <button key={i} type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.days.includes(i) ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                      {DAYS_SHORT[i]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Lugar</label>
                  <input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className={INPUT}/>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Inicio *</label>
                  <input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} className={INPUT} required/>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fin *</label>
                  <input type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})} className={INPUT} required/>
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                  <Save size={16}/> {saving?'Guardando...':'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600';
