import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Send, PlusCircle, X, Save, Settings, Pencil, Trash2, Search, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import BeltBadge from '../../components/shared/BeltBadge';

const MONTHS   = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const YEARS    = [2023, 2024, 2025, 2026];
const METHODS  = { efectivo:'Efectivo', transferencia:'Transferencia', mercadopago:'MercadoPago' };
const STATUSES = { approved:'Aprobado', pending:'Pendiente', rejected:'Rechazado' };

const EMPTY_FORM = (month, year) => ({
  student_id:'', amount:'', concept:'Mensualidad',
  month, year, method:'efectivo', status:'approved',
});

function statusBadge(status, month, year) {
  const now = new Date();
  const isOverdue = status === 'pending' && (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1));
  if (isOverdue) return <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-900/40 text-red-400">Vencido</span>;
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
      status === 'approved' ? 'bg-green-900/40 text-green-400' :
      status === 'pending'  ? 'bg-yellow-900/40 text-yellow-400' :
      'bg-red-900/40 text-red-400'}`}>
      {STATUSES[status] || status}
    </span>
  );
}

export default function FinancesPage() {
  const now = new Date();
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab,     setTab]     = useState('resumen');

  // Monthly fee
  const [monthlyFee, setMonthlyFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeSaving,  setFeeSaving]  = useState(false);
  const [feeToast,   setFeeToast]   = useState('');

  // Manual payment modal (create)
  const [modal,    setModal]   = useState(false);
  const [students, setStudents]= useState([]);
  const [form,     setForm]    = useState(EMPTY_FORM(now.getMonth()+1, now.getFullYear()));
  const [saving,   setSaving]  = useState(false);

  // Historial tab
  const [allPayments,    setAllPayments]    = useState([]);
  const [histLoading,    setHistLoading]    = useState(false);
  const [searchAtleta,   setSearchAtleta]   = useState('');
  const [editModal,      setEditModal]      = useState(null);
  const [editForm,       setEditForm]       = useState({});
  const [editSaving,     setEditSaving]     = useState(false);
  const [deleting,       setDeleting]       = useState(null);
  const [atletaModal,    setAtletaModal]    = useState(null);
  const [atletaPayments, setAtletaPayments] = useState([]);
  const [atletaLoading,  setAtletaLoading]  = useState(false);

  useEffect(() => { fetchData(); }, [month, year]);
  useEffect(() => { if (modal || editModal) fetchStudents(); }, [modal, editModal]);
  useEffect(() => {
    api.get('/api/finances/settings')
      .then(({ data }) => { if (data.monthly_fee) setMonthlyFee(String(data.monthly_fee)); })
      .finally(() => setFeeLoading(false));
  }, []);
  useEffect(() => { if (tab === 'historial') fetchAllPayments(); }, [tab]);

  async function fetchData() {
    setLoading(true);
    try {
      const [sumRes, debRes] = await Promise.all([
        api.get(`/api/finances/summary?month=${month}&year=${year}`),
        api.get(`/api/finances/debtors?month=${month}&year=${year}`),
      ]);
      setSummary(sumRes.data);
      setDebtors(debRes.data.debtors);
    } finally { setLoading(false); }
  }

  async function fetchStudents() {
    if (students.length) return;
    const { data } = await api.get('/api/students');
    setStudents(data);
  }

  async function fetchAllPayments() {
    setHistLoading(true);
    try {
      const { data } = await api.get('/api/payments');
      setAllPayments(data || []);
    } finally { setHistLoading(false); }
  }

  async function saveFee(e) {
    e.preventDefault();
    setFeeSaving(true);
    try {
      await api.put('/api/finances/settings', { monthly_fee: Number(monthlyFee) });
      setFeeToast('Mensualidad actualizada ✓');
      setTimeout(() => setFeeToast(''), 3000);
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar'); }
    finally { setFeeSaving(false); }
  }

  async function sendReminders() {
    if (!confirm(`¿Enviar recordatorio por WhatsApp a ${debtors.length} deudores?`)) return;
    setSending(true);
    try {
      const { data } = await api.post('/api/payments/notify-debtors');
      alert(`Notificaciones enviadas: ${data.notified}`);
    } catch { alert('Error al enviar notificaciones'); }
    finally { setSending(false); }
  }

  async function registerPayment(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/payments/manual', form);
      await fetchData();
      if (tab === 'historial') await fetchAllPayments();
      setModal(false);
    } catch (err) { alert(err.response?.data?.error || 'Error al registrar pago'); }
    finally { setSaving(false); }
  }

  function openEdit(payment) {
    setEditForm({
      amount:  payment.amount,
      concept: payment.concept,
      month:   payment.month   || now.getMonth() + 1,
      year:    payment.year    || now.getFullYear(),
      status:  payment.status,
      method:  payment.method  || 'efectivo',
      paid_at: payment.paid_at ? payment.paid_at.slice(0, 10) : '',
    });
    setEditModal(payment);
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.put(`/api/payments/${editModal.id}`, editForm);
      setEditModal(null);
      await fetchAllPayments();
      await fetchData();
      if (atletaModal) openAtleta(atletaModal);
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar'); }
    finally { setEditSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este pago? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/payments/${id}`);
      await fetchAllPayments();
      await fetchData();
      if (atletaModal) {
        setAtletaPayments(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) { alert(err.response?.data?.error || 'Error al eliminar'); }
    finally { setDeleting(null); }
  }

  async function openAtleta(student) {
    setAtletaModal(student);
    setAtletaLoading(true);
    try {
      const { data } = await api.get(`/api/payments/student/${student.users?.id || student.id}`);
      setAtletaPayments(data || []);
    } finally { setAtletaLoading(false); }
  }

  const filteredPayments = allPayments.filter(p =>
    !searchAtleta || p.users?.name?.toLowerCase().includes(searchAtleta.toLowerCase())
  );

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${color}`}>
        <Icon size={20} className="text-white"/>
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-black text-white mt-1">{value}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Finanzas</h2>
          <p className="text-gray-400 text-sm">{MONTHS[month]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e=>setMonth(Number(e.target.value))}
            className="bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600">
            {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(Number(e.target.value))}
            className="bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600">
            {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={()=>{ setForm(EMPTY_FORM(month, year)); setModal(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <PlusCircle size={16}/> Registrar pago
          </button>
        </div>
      </div>

      {/* Fee setting */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Settings size={18} className="text-red-500"/> Valor de la mensualidad
        </h3>
        {feeLoading ? <p className="text-gray-500 text-sm">Cargando...</p> : (
          <form onSubmit={saveFee} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Monto (ARS)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" value={monthlyFee} onChange={e=>setMonthlyFee(e.target.value)}
                  placeholder="Ej: 15000" min="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"/>
              </div>
              <p className="text-xs text-gray-500 mt-1">Este monto se pre-llenará para los atletas en el checkout</p>
            </div>
            <button type="submit" disabled={feeSaving || !monthlyFee}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
              <Save size={15}/> {feeSaving ? 'Guardando...' : 'Guardar monto'}
            </button>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {[['resumen','Resumen'],['deudores','Deudores'],['historial','Historial']].map(([key,label])=>(
          <button key={key} type="button" onClick={()=>setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===key?'bg-gray-800 text-white':'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: Resumen */}
      {tab === 'resumen' && (
        loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={CheckCircle} label="Cobrado"   color="bg-green-600" value={`$${Number(summary.totalCollected).toLocaleString('es-AR')}`}/>
              <StatCard icon={AlertCircle} label="Pendiente" color="bg-yellow-600" value={`$${Number(summary.totalPending).toLocaleString('es-AR')}`}/>
              <StatCard icon={CheckCircle} label="Pagaron"   color="bg-blue-600"  value={summary.approved.length}/>
              <StatCard icon={AlertCircle} label="Deudores"  color="bg-red-700"   value={debtors.length}/>
            </div>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              {summary.all.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Sin pagos registrados</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {['Alumno','Concepto','Monto','Estado','Fecha'].map(h=>(
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {summary.all.map(p=>(
                      <tr key={p.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-white font-medium">{p.users?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{p.concept}</td>
                        <td className="px-4 py-3 text-white font-mono">${Number(p.amount).toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3">{statusBadge(p.status, p.month, p.year)}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-AR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )
      )}

      {/* TAB: Deudores */}
      {tab === 'deudores' && (
        loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
          <div className="space-y-3">
            {debtors.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">
                Todos los atletas están al día 🎉
              </div>
            ) : (
              <>
                <button type="button" onClick={sendReminders} disabled={sending}
                  className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  <Send size={16}/> {sending?'Enviando...':'Enviar recordatorio WhatsApp a todos'}
                </button>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        {['Alumno','DNI','Faixa','Teléfono'].map(h=>(
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {debtors.map(d=>(
                        <tr key={d.id} className="hover:bg-gray-800/50">
                          <td className="px-4 py-3 text-white font-medium">{d.name}</td>
                          <td className="px-4 py-3 text-gray-400 font-mono text-sm">{d.dni}</td>
                          <td className="px-4 py-3"><BeltBadge belt={d.belt} stripe={d.stripe}/></td>
                          <td className="px-4 py-3 text-gray-400 text-sm">{d.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )
      )}

      {/* TAB: Historial */}
      {tab === 'historial' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input value={searchAtleta} onChange={e=>setSearchAtleta(e.target.value)}
              placeholder="Filtrar por atleta..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"/>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {histLoading ? (
              <div className="p-8 text-center text-gray-500">Cargando historial...</div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Sin pagos registrados</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Atleta','Mes/Año','Concepto','Monto','Método','Estado',''].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredPayments.map(p=>(
                    <tr key={p.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <button type="button" onClick={()=>openAtleta(p)}
                          className="font-medium text-white hover:text-red-400 transition-colors flex items-center gap-1">
                          {p.users?.name || '—'}<ChevronRight size={13} className="text-gray-600"/>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {p.month ? `${MONTHS[p.month]} ${p.year}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{p.concept}</td>
                      <td className="px-4 py-3 text-white font-mono text-sm">${Number(p.amount).toLocaleString('es-AR')}</td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{METHODS[p.method] || p.method || '—'}</td>
                      <td className="px-4 py-3">{statusBadge(p.status, p.month, p.year)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button type="button" onClick={()=>openEdit(p)}
                            className="text-gray-500 hover:text-white transition-colors">
                            <Pencil size={14}/>
                          </button>
                          <button type="button" onClick={()=>handleDelete(p.id)} disabled={deleting===p.id}
                            className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Crear pago manual */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">Registrar pago</h3>
              <button type="button" onClick={()=>setModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={registerPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Atleta *</label>
                <select value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})}
                  className={INPUT} required>
                  <option value="">Seleccionar...</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Concepto *</label>
                <input value={form.concept} onChange={e=>setForm({...form,concept:e.target.value})} className={INPUT} required/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mes *</label>
                  <select value={form.month} onChange={e=>setForm({...form,month:Number(e.target.value)})} className={INPUT}>
                    {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Año *</label>
                  <select value={form.year} onChange={e=>setForm({...form,year:Number(e.target.value)})} className={INPUT}>
                    {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Monto (ARS) *</label>
                <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}
                  className={INPUT} placeholder="15000" required min="1"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Método</label>
                  <select value={form.method} onChange={e=>setForm({...form,method:e.target.value})} className={INPUT}>
                    {Object.entries(METHODS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Estado</label>
                  <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={INPUT}>
                    <option value="approved">Aprobado</option>
                    <option value="pending">Pendiente</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                  <Save size={16}/> {saving?'Guardando...':'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar pago */}
      {editModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-white">Editar pago</h3>
                <p className="text-gray-500 text-sm">{editModal.users?.name}</p>
              </div>
              <button type="button" onClick={()=>setEditModal(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Concepto *</label>
                <input value={editForm.concept} onChange={e=>setEditForm({...editForm,concept:e.target.value})} className={INPUT} required/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mes</label>
                  <select value={editForm.month} onChange={e=>setEditForm({...editForm,month:Number(e.target.value)})} className={INPUT}>
                    {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Año</label>
                  <select value={editForm.year} onChange={e=>setEditForm({...editForm,year:Number(e.target.value)})} className={INPUT}>
                    {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Monto (ARS) *</label>
                <input type="number" value={editForm.amount} onChange={e=>setEditForm({...editForm,amount:e.target.value})}
                  className={INPUT} required min="1"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Método</label>
                  <select value={editForm.method} onChange={e=>setEditForm({...editForm,method:e.target.value})} className={INPUT}>
                    {Object.entries(METHODS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Estado</label>
                  <select value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value})} className={INPUT}>
                    <option value="approved">Aprobado</option>
                    <option value="pending">Pendiente</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fecha de pago</label>
                <input type="date" value={editForm.paid_at} onChange={e=>setEditForm({...editForm,paid_at:e.target.value})} className={INPUT}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setEditModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium transition-colors">Cancelar</button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                  <Save size={16}/> {editSaving?'Guardando...':'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Historial por atleta */}
      {atletaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-white">{atletaModal.users?.name || atletaModal.name}</h3>
                <p className="text-gray-500 text-sm">Historial completo de pagos</p>
              </div>
              <button type="button" onClick={()=>setAtletaModal(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-auto">
              {atletaLoading ? (
                <div className="p-8 text-center text-gray-500">Cargando...</div>
              ) : atletaPayments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Sin pagos registrados</div>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-3 p-5 border-b border-gray-800">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Total pagado</p>
                      <p className="text-lg font-black text-green-400">
                        ${atletaPayments.filter(p=>p.status==='approved').reduce((s,p)=>s+Number(p.amount),0).toLocaleString('es-AR')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Pagos</p>
                      <p className="text-lg font-black text-white">{atletaPayments.filter(p=>p.status==='approved').length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Último pago</p>
                      <p className="text-sm font-bold text-white">
                        {(() => { const last = atletaPayments.find(p=>p.status==='approved'); return last ? `${MONTHS[last.month]} ${last.year}` : '—'; })()}
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {atletaPayments.map(p=>(
                      <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/50">
                        <div>
                          <p className="text-sm font-medium text-white">{p.month ? `${MONTHS[p.month]} ${p.year}` : p.concept}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{METHODS[p.method] || '—'} · {p.concept}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-white">${Number(p.amount).toLocaleString('es-AR')}</p>
                            {statusBadge(p.status, p.month, p.year)}
                          </div>
                          <div className="flex gap-1">
                            <button type="button" onClick={()=>openEdit(p)} className="text-gray-500 hover:text-white p-1 transition-colors"><Pencil size={13}/></button>
                            <button type="button" onClick={()=>handleDelete(p.id)} disabled={deleting===p.id} className="text-gray-500 hover:text-red-400 p-1 transition-colors disabled:opacity-40"><Trash2 size={13}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {feeToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-800 border border-green-700 text-green-100 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {feeToast}
        </div>
      )}
    </div>
  );
}

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600';
