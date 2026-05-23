import { useState, useEffect } from 'react';
import { Plus, X, Save, List, LayoutGrid, Pencil, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../lib/api';

const TODAY = new Date().toISOString().slice(0, 10);

const DAYS       = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const EMPTY_CREATE = { class_type_id:'', days:[], start_time:'19:00', end_time:'20:30', location:'Mat Principal' };
const EMPTY_EDIT   = { class_type_id:'', day_of_week:1, start_time:'19:00', end_time:'20:30', location:'Mat Principal' };

export default function SchedulesPage() {
  const [schedules,  setSchedules]  = useState([]);
  const [classTypes, setClassTypes] = useState([]);
  const [view,       setView]       = useState('grid');
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState(EMPTY_CREATE);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');
  const [qrModal,    setQrModal]    = useState(null);
  const [qrDate,     setQrDate]     = useState(TODAY);

  useEffect(() => { load(); }, []);

  async function load() {
    const [schRes, ctRes] = await Promise.all([
      api.get('/api/schedules'),
      api.get('/api/schedules/class-types'),
    ]);
    setSchedules(schRes.data);
    setClassTypes(ctRes.data);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function openCreate() { setForm({ ...EMPTY_CREATE }); setModal('create'); setError(''); }
  function openEdit(s) {
    setForm({ class_type_id:s.class_type_id, day_of_week:s.day_of_week, start_time:s.start_time?.slice(0,5), end_time:s.end_time?.slice(0,5), location:s.location });
    setModal(s); setError('');
  }

  function toggleDay(idx) {
    setForm(prev => ({
      ...prev,
      days: prev.days.includes(idx) ? prev.days.filter(d => d !== idx) : [...prev.days, idx],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        if (form.days.length === 0) { setError('Seleccioná al menos un día'); setSaving(false); return; }
        await api.post('/api/schedules', form);
        showToast('Horario creado ✓');
      } else {
        await api.put(`/api/schedules/${modal.id}`, form);
        showToast('Horario actualizado ✓');
      }
      await load();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function deleteSchedule(id) {
    if (!confirm('¿Eliminar este horario?')) return;
    await api.delete(`/api/schedules/${id}`);
    await load();
    setModal(null);
  }

  const isEditing = modal && modal !== 'create';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Horarios</h2>
          <p className="text-gray-400 text-sm">{schedules.length} clases programadas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
            <button type="button" onClick={()=>setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${view==='list'?'bg-gray-800 text-white':'text-gray-400 hover:text-white'}`}>
              <List size={16}/> Lista
            </button>
            <button type="button" onClick={()=>setView('grid')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${view==='grid'?'bg-gray-800 text-white':'text-gray-400 hover:text-white'}`}>
              <LayoutGrid size={16}/> Semana
            </button>
          </div>
          <button type="button" onClick={openCreate}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
            <Plus size={18}/> Agregar
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {schedules.length === 0 ? (
            <div className="p-12 text-center">
              <LayoutGrid size={40} className="mx-auto text-gray-700 mb-3"/>
              <p className="text-gray-400 font-medium">Sin horarios registrados</p>
              <p className="text-gray-600 text-sm mt-1">Creá el primer horario para empezar</p>
              <button type="button" onClick={openCreate}
                className="mt-4 text-red-500 hover:text-red-400 text-sm underline transition-colors">
                Crear primer horario
              </button>
            </div>
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
                      <div className="flex items-center justify-end gap-3">
                        <button type="button" onClick={()=>{ setQrModal(s); setQrDate(TODAY); }}
                          className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1">
                          <QrCode size={14}/> QR
                        </button>
                        <button type="button" onClick={()=>openEdit(s)} className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1">
                          <Pencil size={14}/> Editar
                        </button>
                        <button type="button" onClick={()=>deleteSchedule(s.id)} className="text-gray-500 hover:text-red-400 text-sm transition-colors">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        schedules.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <LayoutGrid size={40} className="mx-auto text-gray-700 mb-3"/>
            <p className="text-gray-400 font-medium">Sin horarios registrados</p>
            <button type="button" onClick={openCreate}
              className="mt-4 text-red-500 hover:text-red-400 text-sm underline transition-colors">
              Crear primer horario
            </button>
          </div>
        ) : (
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
                      <div key={s.id}
                        className="rounded-lg p-2 text-xs transition-all"
                        style={{backgroundColor: s.class_types?.color+'22', borderLeft: `3px solid ${s.class_types?.color}`}}>
                        <div className="cursor-pointer hover:brightness-125" onClick={() => openEdit(s)}>
                          <p className="font-semibold text-white leading-tight">{s.class_types?.name}</p>
                          <p className="text-gray-400 mt-0.5">{s.start_time?.slice(0,5)}</p>
                        </div>
                        <button type="button"
                          onClick={() => { setQrModal(s); setQrDate(TODAY); }}
                          className="mt-2 w-full flex items-center justify-center gap-1 bg-black/30 hover:bg-black/50 text-white rounded-md py-1 transition-colors">
                          <QrCode size={10}/> <span>QR</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">
                {isEditing ? `Editar: ${modal.class_types?.name} — ${DAYS[modal.day_of_week]}` : 'Nuevo horario'}
              </h3>
              <button type="button" onClick={()=>setModal(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
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

              {isEditing ? (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Día *</label>
                  <select value={form.day_of_week} onChange={e=>setForm({...form,day_of_week:Number(e.target.value)})} className={INPUT}>
                    {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Días * <span className="text-gray-600">(podés elegir varios)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d, i) => (
                      <button key={i} type="button" onClick={() => toggleDay(i)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.days.includes(i) ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                        {DAYS_SHORT[i]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Inicio *</label>
                  <input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} className={INPUT} required/>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fin *</label>
                  <input type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})} className={INPUT} required/>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Lugar</label>
                <input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className={INPUT}/>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                {isEditing && (
                  <button type="button" onClick={()=>deleteSchedule(modal.id)}
                    className="bg-gray-800 hover:bg-red-900/40 hover:text-red-400 text-gray-400 px-4 py-2.5 rounded-xl font-medium transition-colors text-sm">
                    Eliminar
                  </button>
                )}
                <button type="button" onClick={()=>setModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                  <Save size={16}/> {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <QrModal
          schedule={qrModal}
          date={qrDate}
          onDateChange={setQrDate}
          onClose={() => setQrModal(null)}
          onCopy={(url) => { navigator.clipboard?.writeText(url); setToast('Link copiado ✓'); setTimeout(()=>setToast(''),2000); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-800 border border-green-700 text-green-100 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600';

function QrModal({ schedule, date, onDateChange, onClose, onCopy }) {
  const qrUrl = `${window.location.origin}/check-in?s=${schedule.id}&d=${date}`;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: schedule.class_types?.color}}/>
              <h3 className="font-bold text-white">{schedule.class_types?.name}</h3>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">
              {DAYS[schedule.day_of_week]} · {schedule.start_time?.slice(0,5)} – {schedule.end_time?.slice(0,5)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Fecha de la clase</label>
            <input type="date" value={date} onChange={e => onDateChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"/>
          </div>

          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <QRCodeSVG value={qrUrl} size={220} level="H"
                imageSettings={{ src:'/logo.webp', width:44, height:44, excavate:true }}/>
            </div>
          </div>

          <p className="text-gray-500 text-xs text-center">Los alumnos escanean este QR para registrar su presencia</p>

          <button type="button" onClick={() => onCopy(qrUrl)}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
            Copiar link
          </button>
        </div>
      </div>
    </div>
  );
}
