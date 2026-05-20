import { useState, useEffect } from 'react';
import { UserPlus, Search, X, Save, ChevronDown } from 'lucide-react';
import api from '../../lib/api';
import BeltBadge from '../../components/shared/BeltBadge';

const BELTS   = ['blanco','azul','morado','marron','negro'];
const STRIPES = [0,1,2,3,4];
const EMPTY   = { dni:'',pin:'',name:'',belt:'blanco',stripe:0,phone:'',email:'',birth_date:'' };

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | 'create' | student obj
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    try {
      const { data } = await api.get('/api/students');
      setStudents(data);
    } finally { setLoading(false); }
  }

  function openCreate() { setForm(EMPTY); setModal('create'); setError(''); }
  function openEdit(s)  { setForm({ ...s, pin:'' }); setModal(s); setError(''); }
  function closeModal() { setModal(null); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        await api.post('/api/students', form);
      } else {
        await api.put(`/api/students/${modal.id}`, form);
      }
      await fetchStudents();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.dni.includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Alumnos</h2>
          <p className="text-gray-400 text-sm">{students.length} alumnos registrados</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
          <UserPlus size={18}/> Nuevo alumno
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"/>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No se encontraron alumnos</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Nombre','DNI','Cinturón','Teléfono','Estado'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold">
                        {s.name[0]}
                      </div>
                      <span className="font-medium text-white">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-sm">{s.dni}</td>
                  <td className="px-4 py-3"><BeltBadge belt={s.belt} stripe={s.stripe}/></td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.active ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {s.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(s)}
                      className="text-gray-400 hover:text-white text-sm underline transition-colors">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">
                {modal === 'create' ? 'Nuevo alumno' : `Editar: ${modal.name}`}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre completo" required>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                    className={INPUT} placeholder="Juan Pérez" required/>
                </Field>
                <Field label="DNI" required={modal==='create'}>
                  <input value={form.dni} onChange={e=>setForm({...form,dni:e.target.value})}
                    className={INPUT} placeholder="12345678" disabled={modal!=='create'}
                    required={modal==='create'}/>
                </Field>
                <Field label={modal==='create'?'PIN (4 dígitos)':'Nuevo PIN (vacío = sin cambio)'} required={modal==='create'}>
                  <input type="password" value={form.pin} onChange={e=>setForm({...form,pin:e.target.value.slice(0,4)})}
                    className={INPUT} placeholder="••••" inputMode="numeric" maxLength={4}
                    required={modal==='create'}/>
                </Field>
                <Field label="Teléfono">
                  <input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}
                    className={INPUT} placeholder="+54 9 11 1234 5678"/>
                </Field>
                <Field label="Email">
                  <input type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}
                    className={INPUT} placeholder="alumno@email.com"/>
                </Field>
                <Field label="Fecha de nacimiento">
                  <input type="date" value={form.birth_date||''} onChange={e=>setForm({...form,birth_date:e.target.value})}
                    className={INPUT}/>
                </Field>
                <Field label="Cinturón">
                  <select value={form.belt} onChange={e=>setForm({...form,belt:e.target.value})} className={INPUT}>
                    {BELTS.map(b=><option key={b} value={b} className="capitalize">{b}</option>)}
                  </select>
                </Field>
                <Field label="Rayitas">
                  <select value={form.stripe} onChange={e=>setForm({...form,stripe:Number(e.target.value)})} className={INPUT}>
                    {STRIPES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              {modal !== 'create' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}
                    className="w-4 h-4 accent-red-600"/>
                  <span className="text-sm text-gray-300">Alumno activo</span>
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
    </div>
  );
}

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600';

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
