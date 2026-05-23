import { useState, useEffect } from 'react';
import { Save, User } from 'lucide-react';
import api from '../../lib/api';
import { getUser, setAuth, getToken } from '../../lib/auth';
import { BeltDisplay, getBeltObj, grauLabel } from '../../components/shared/BeltSelector';

export default function ProfilePage() {
  const user = getUser();
  const [form,    setForm]    = useState({ phone: '', email: '', photo_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get(`/api/students/${user.id}`).then(({ data }) => {
      setForm({ phone: data.phone || '', email: data.email || '', photo_url: data.photo_url || '' });
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      const { data } = await api.put(`/api/students/${user.id}`, form);
      setAuth(getToken(), { ...user, ...data });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  if (loading) return <div className="p-6 text-gray-500">Cargando...</div>;

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-bold text-white">Mi perfil</h2>
        <p className="text-gray-400 text-sm">Ficha del alumno</p>
      </div>

      {/* Avatar & belt */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-700 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
            {user.name?.[0]}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{user.name}</h3>
            <p className="text-gray-400 text-sm">DNI {user.dni}</p>
          </div>
        </div>
        <BeltDisplay belt={user.belt} stripe={user.stripe}/>
      </div>

      {/* Editable fields */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">Datos de contacto</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Teléfono (WhatsApp)</label>
            <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
              placeholder="+54 9 11 1234 5678"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"/>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
              placeholder="email@ejemplo.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"/>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">URL foto de perfil</label>
            <input value={form.photo_url} onChange={e=>setForm({...form,photo_url:e.target.value})}
              placeholder="https://..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"/>
          </div>

          {error   && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">Perfil actualizado ✓</p>}

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
            <Save size={18}/> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* Stats read-only */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-3">Información académica</h3>
        <dl className="space-y-2">
          {[
            ['Fecha de ingreso', user.join_date ? new Date(user.join_date).toLocaleDateString('es-AR') : '—'],
            ['Faixa', (() => { const b = getBeltObj(user.belt); return `${b.name}${user.stripe ? ` · ${grauLabel(b, user.stripe)}` : ''}`; })()],
          ].map(([k,v]) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <dt className="text-gray-400 text-sm">{k}</dt>
              <dd className="text-white text-sm font-medium capitalize">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
