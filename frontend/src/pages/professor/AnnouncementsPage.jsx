import { useState, useEffect } from 'react';
import { Plus, Pin, Trash2, X, Save, Pencil, Megaphone } from 'lucide-react';
import api from '../../lib/api';

const EMPTY = { title: '', body: '', pinned: false };

export default function AnnouncementsPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | 'create' | item
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get('/api/announcements');
      setItems(data || []);
    } finally { setLoading(false); }
  }

  function openCreate() { setForm(EMPTY); setError(''); setModal('create'); }
  function openEdit(a)  { setForm({ title: a.title, body: a.body || '', pinned: a.pinned }); setError(''); setModal(a); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal === 'create') await api.post('/api/announcements', form);
      else await api.put(`/api/announcements/${modal.id}`, form);
      await load();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este comunicado?')) return;
    await api.delete(`/api/announcements/${id}`);
    setItems(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Comunicados</h2>
          <p className="text-gray-400 text-sm">Los alumnos los ven en su dashboard</p>
        </div>
        <button type="button" onClick={openCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
          <Plus size={18}/> Nuevo
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Megaphone size={40} className="mx-auto text-gray-700 mb-3"/>
          <p className="text-gray-400 font-medium">Sin comunicados</p>
          <p className="text-gray-600 text-sm mt-1">Creá un aviso para que lo vean tus alumnos</p>
          <button type="button" onClick={openCreate}
            className="mt-4 text-red-500 hover:text-red-400 text-sm underline">
            Crear primer comunicado
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id}
              className={`bg-gray-900 border rounded-2xl p-5 ${a.pinned ? 'border-red-600/50' : 'border-gray-800'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {a.pinned && <Pin size={14} className="text-red-500 flex-shrink-0"/>}
                    <h3 className="font-bold text-white">{a.title}</h3>
                  </div>
                  {a.body && <p className="text-gray-400 text-sm whitespace-pre-wrap">{a.body}</p>}
                  <p className="text-gray-600 text-xs mt-2">
                    {new Date(a.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' })}
                    {a.users?.name && ` · ${a.users.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={() => openEdit(a)}
                    className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
                    <Pencil size={15}/>
                  </button>
                  <button type="button" onClick={() => handleDelete(a.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-xl transition-colors">
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="font-bold text-white">{modal === 'create' ? 'Nuevo comunicado' : 'Editar comunicado'}</h3>
              <button type="button" onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className={INPUT} placeholder="Ej: Cambio de horario del martes" required/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mensaje (opcional)</label>
                <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})}
                  className={INPUT + ' resize-none'} rows={4}
                  placeholder="Detalles del comunicado..."/>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={e => setForm({...form, pinned: e.target.checked})}
                  className="w-4 h-4 accent-red-600"/>
                <span className="text-sm text-gray-300 flex items-center gap-1.5">
                  <Pin size={14} className="text-red-500"/> Fijar arriba (destacado)
                </span>
              </label>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                  <Save size={16}/> {saving ? 'Guardando...' : 'Publicar'}
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
