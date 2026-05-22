import { useState, useEffect } from 'react';
import { UserPlus, Search, X, Save, Eye, Pencil, Trash2, Check } from 'lucide-react';
import api from '../../lib/api';
import BeltBadge from '../../components/shared/BeltBadge';

const MONTHS  = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const BELTS   = ['blanco','azul','morado','marron','negro'];
const BELT_PT = { blanco:'Branca', azul:'Azul', morado:'Roxa', marron:'Marrom', negro:'Preta' };
const GRAUS   = [0,1,2,3,4];
const EMPTY   = { dni:'', pin:'', name:'', belt:'blanco', stripe:0, phone:'', email:'', birth_date:'' };
const now     = new Date();

export default function StudentsPage() {
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // Filter state
  const [search,         setSearch]         = useState('');
  const [filterBelt,     setFilterBelt]     = useState('');
  const [filterClass,    setFilterClass]    = useState('');
  const [filterPayment,  setFilterPayment]  = useState('');
  const [enrollmentMap,  setEnrollmentMap]  = useState({});  // studentId -> Set<classTypeName>
  const [debtorIds,      setDebtorIds]      = useState(new Set());
  const [classOptions,   setClassOptions]   = useState([]);

  // Presencia modal
  const [presModal,   setPresModal]   = useState(null);
  const [presRecords, setPresRecords] = useState([]);
  const [presLoading, setPresLoading] = useState(false);
  const [presFilters, setPresFilters] = useState({ month: now.getMonth()+1, year: now.getFullYear(), classTypeId: '' });
  const [classTypes,  setClassTypes]  = useState([]);

  // Inline edit for attendance
  const [editAttId,  setEditAttId]  = useState(null);
  const [editDate,   setEditDate]   = useState('');
  const [attSaving,  setAttSaving]  = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchClassEnrollments();
    fetchDebtors();
  }, []);

  useEffect(() => { if (presModal) fetchPresencia(); }, [presModal, presFilters.month, presFilters.year]);

  async function fetchStudents() {
    try {
      const { data } = await api.get('/api/students');
      setStudents(data);
    } finally { setLoading(false); }
  }

  async function fetchClassEnrollments() {
    try {
      const { data } = await api.get('/api/students/class-enrollments');
      const map = {};
      const names = new Set();
      for (const e of data) {
        if (!map[e.student_id]) map[e.student_id] = new Set();
        if (e.class_type_name) {
          map[e.student_id].add(e.class_type_name);
          names.add(e.class_type_name);
        }
      }
      setEnrollmentMap(map);
      setClassOptions([...names].sort());
    } catch {}
  }

  async function fetchDebtors() {
    try {
      const { data } = await api.get('/api/finances/debtors');
      setDebtorIds(new Set((data.debtors || []).map(d => d.id)));
    } catch {}
  }

  async function fetchPresencia() {
    setPresLoading(true);
    try {
      const { data } = await api.get(`/api/attendance?student_id=${presModal.id}&month=${presFilters.month}&year=${presFilters.year}`);
      setPresRecords(data || []);
    } finally { setPresLoading(false); }
  }

  function openPresencia(student) {
    setPresModal(student);
    setPresFilters({ month: now.getMonth()+1, year: now.getFullYear(), classTypeId: '' });
    setPresRecords([]);
    setEditAttId(null);
    if (!classTypes.length) {
      api.get('/api/schedules/class-types').then(({ data }) => setClassTypes(data || []));
    }
  }

  async function handleAttDelete(id) {
    if (!window.confirm('¿Eliminar este registro de presencia?')) return;
    await api.delete(`/api/attendance/${id}`);
    setPresRecords(prev => prev.filter(r => r.id !== id));
  }

  async function handleAttEdit(id) {
    if (!editDate) return;
    setAttSaving(true);
    try {
      await api.put(`/api/attendance/${id}`, { class_date: editDate });
      await fetchPresencia();
      setEditAttId(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al editar');
    } finally { setAttSaving(false); }
  }

  function openCreate() { setForm({ ...EMPTY }); setError(''); setModal('create'); }
  function openEdit(s)  { setForm({ ...s, pin:'' }); setError(''); setModal(s); }
  function closeModal() { setModal(null); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal === 'create') await api.post('/api/students', form);
      else await api.put(`/api/students/${modal.id}`, form);
      await fetchStudents();
      await fetchClassEnrollments();
      await fetchDebtors();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  function clearFilters() { setFilterBelt(''); setFilterClass(''); setFilterPayment(''); setSearch(''); }
  const hasFilters = !!(filterBelt || filterClass || filterPayment || search);

  const filtered = students.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.dni.includes(q)) return false;
    }
    if (filterBelt    && s.belt !== filterBelt) return false;
    if (filterClass   && !enrollmentMap[s.id]?.has(filterClass)) return false;
    if (filterPayment === 'paid' && debtorIds.has(s.id))  return false;
    if (filterPayment === 'owes' && !debtorIds.has(s.id)) return false;
    return true;
  });

  const filteredPres = presFilters.classTypeId
    ? presRecords.filter(r => r.schedules?.class_type_id === presFilters.classTypeId)
    : presRecords;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Atletas</h2>
          <p className="text-gray-400 text-sm">
            <span className="text-white font-semibold">{filtered.length}</span>
            {hasFilters ? ` de ${students.length}` : ` atletas registrados`}
            {hasFilters && <span className="text-gray-500"> coinciden</span>}
          </p>
        </div>
        <button type="button" onClick={openCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
          <UserPlus size={18}/> Nuevo atleta
        </button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"/>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={filterBelt} onChange={e => setFilterBelt(e.target.value)} className={FSEL}>
            <option value="">Todas las faixes</option>
            {BELTS.map(b => <option key={b} value={b}>{BELT_PT[b]}</option>)}
          </select>

          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className={FSEL}>
            <option value="">Todas las aulas</option>
            {classOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className={FSEL}>
            <option value="">Todos los pagos</option>
            <option value="paid">Al día</option>
            <option value="owes">Deben</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors">
              <X size={14}/> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={40} className="mx-auto text-gray-700 mb-3"/>
            <p className="text-gray-400 font-medium">
              {hasFilters ? 'No hay atletas con esos filtros' : 'No hay atletas registrados'}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters}
                className="mt-3 text-red-500 hover:text-red-400 text-sm underline">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Nombre','DNI','Faixa','Aulas','Pago mes',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map(s => {
                const classes = enrollmentMap[s.id] ? [...enrollmentMap[s.id]] : [];
                const paid    = !debtorIds.has(s.id);
                return (
                  <tr key={s.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                          {s.name[0]}
                        </div>
                        <p className="font-medium text-white">{s.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-sm">{s.dni}</td>
                    <td className="px-4 py-3"><BeltBadge belt={s.belt} stripe={s.stripe}/></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {classes.length === 0 && <span className="text-gray-600 text-xs">—</span>}
                        {classes.map(c => (
                          <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${paid ? 'bg-green-900/40 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {paid ? 'Al día' : 'Debe'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button type="button" onClick={() => openPresencia(s)}
                          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors">
                          <Eye size={14}/> Presencia
                        </button>
                        <button type="button" onClick={() => openEdit(s)}
                          className="text-gray-400 hover:text-white text-sm underline transition-colors">
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit / Create modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">
                {modal === 'create' ? 'Nuevo atleta' : `Editar: ${modal.name}`}
              </h3>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre completo" required>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                    className={INPUT} placeholder="Carlos Silva" required/>
                </Field>
                <Field label="DNI" required={modal==='create'}>
                  <input value={form.dni} onChange={e=>setForm({...form,dni:e.target.value})}
                    className={INPUT} placeholder="12345678" disabled={modal!=='create'} required={modal==='create'}/>
                </Field>
                <Field label={modal==='create'?'PIN (4 dígitos)':'Nuevo PIN (vacío = sin cambio)'} required={modal==='create'}>
                  <input type="password" value={form.pin} onChange={e=>setForm({...form,pin:e.target.value.slice(0,4)})}
                    className={INPUT} placeholder="••••" inputMode="numeric" maxLength={4} required={modal==='create'}/>
                </Field>
                <Field label="Teléfono">
                  <input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}
                    className={INPUT} placeholder="+54 9 351 000 0000"/>
                </Field>
                <Field label="Email">
                  <input type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}
                    className={INPUT} placeholder="atleta@email.com"/>
                </Field>
                <Field label="Fecha de nacimiento">
                  <input type="date" value={form.birth_date||''} onChange={e=>setForm({...form,birth_date:e.target.value})}
                    className={INPUT}/>
                </Field>
                <Field label="Faixa">
                  <select value={form.belt} onChange={e=>setForm({...form,belt:e.target.value})} className={INPUT}>
                    {BELTS.map(b=><option key={b} value={b}>{BELT_PT[b]}</option>)}
                  </select>
                </Field>
                <Field label="Graus">
                  <select value={form.stripe} onChange={e=>setForm({...form,stripe:Number(e.target.value)})} className={INPUT}>
                    {GRAUS.map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
              </div>

              {modal !== 'create' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}
                    className="w-4 h-4 accent-red-600"/>
                  <span className="text-sm text-gray-300">Atleta activo</span>
                </label>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
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

      {/* Presencia modal */}
      {presModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-lg font-bold text-white">
                  {presModal.name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{presModal.name}</h3>
                  <BeltBadge belt={presModal.belt} stripe={presModal.stripe}/>
                </div>
              </div>
              <button type="button" onClick={() => { setPresModal(null); setEditAttId(null); }} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-800">
              <select value={presFilters.month} onChange={e=>setPresFilters({...presFilters,month:Number(e.target.value)})} className={INPUT_SM}>
                {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={presFilters.year} onChange={e=>setPresFilters({...presFilters,year:Number(e.target.value)})} className={INPUT_SM}>
                {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              {classTypes.length > 0 && (
                <select value={presFilters.classTypeId} onChange={e=>setPresFilters({...presFilters,classTypeId:e.target.value})} className={INPUT_SM}>
                  <option value="">Todas las aulas</option>
                  {classTypes.map(ct=><option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {presLoading ? (
                <div className="p-8 text-center text-gray-500">Cargando...</div>
              ) : filteredPres.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Sin registros en este período</div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-900 z-10">
                    <tr className="border-b border-gray-800">
                      {['Fecha','Aula','Horario',''].map(h=>(
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredPres.map(r => (
                      <tr key={r.id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          {editAttId === r.id ? (
                            <input
                              type="date"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-600"
                            />
                          ) : (
                            <span className="text-white text-sm font-medium">
                              {new Date(r.class_date + 'T12:00').toLocaleDateString('es-AR', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: r.schedules?.class_types?.color || '#ef4444'}}/>
                            <span className="text-sm text-white">{r.schedules?.class_types?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm font-mono">
                          {r.schedules?.start_time?.slice(0,5)} – {r.schedules?.end_time?.slice(0,5)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {editAttId === r.id ? (
                              <>
                                <button onClick={() => handleAttEdit(r.id)} disabled={attSaving}
                                  className="p-1.5 rounded-lg bg-green-900/40 text-green-400 hover:bg-green-900/70 transition-colors">
                                  <Check size={14}/>
                                </button>
                                <button onClick={() => setEditAttId(null)}
                                  className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors">
                                  <X size={14}/>
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditAttId(r.id); setEditDate(r.class_date); }}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors">
                                  <Pencil size={13}/>
                                </button>
                                <button onClick={() => handleAttDelete(r.id)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                                  <Trash2 size={13}/>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-800">
              <p className="text-gray-400 text-sm">
                <span className="text-white font-bold">{filteredPres.length}</span> clase{filteredPres.length !== 1 ? 's' : ''} en {MONTHS[presFilters.month]} {presFilters.year}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INPUT    = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600';
const INPUT_SM = 'bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600';
const FSEL     = 'bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
