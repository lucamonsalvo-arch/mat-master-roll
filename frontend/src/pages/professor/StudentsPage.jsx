import { useState, useEffect } from 'react';
import { UserPlus, Search, X, Save } from 'lucide-react';
import api from '../../lib/api';
import BeltBadge from '../../components/shared/BeltBadge';

const BELTS  = ['blanco','azul','morado','marron','negro'];
const BELT_PT = { blanco:'Branca', azul:'Azul', morado:'Roxa', marron:'Marrom', negro:'Preta' };
const GRAUS  = [0,1,2,3,4];
const EMPTY  = { dni:'', pin:'', name:'', belt:'blanco', stripe:0, phone:'', email:'', birth_date:'' };

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
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

  function openCreate() {
    setForm({ ...EMPTY });
    setError('');
    setModal('create');
  }
  function openEdit(s) { setForm({ ...s, pin:'' }); setError(''); setModal(s); }
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
          <h2 className="text-2xl font-bold text-white">Atletas</h2>
          <p className="text-gray-400 text-sm">{students.length} atletas registrados</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
          <UserPlus size={18}/> Novo atleta
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"/>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={40} className="mx-auto text-gray-700 mb-3"/>
            <p className="text-gray-400 font-medium">
              {search ? 'No se encontraron atletas' : 'No hay atletas registrados'}
            </p>
            {!search && (
              <button type="button" onClick={openCreate}
                className="mt-4 text-red-500 hover:text-red-400 text-sm underline transition-colors">
                Agregar primer atleta
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Nombre','DNI','Faixa','Teléfono','Estado'].map(h => (
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
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
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
                      {s.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(s)}
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

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">
                {modal === 'create' ? 'Novo atleta' : `Editar: ${modal.name}`}
              </h3>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombre completo" required>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                    className={INPUT} placeholder="João Silva" required/>
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
                  <span className="text-sm text-gray-300">Atleta ativo</span>
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
