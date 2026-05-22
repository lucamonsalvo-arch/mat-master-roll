import { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, CheckCircle, Send, PlusCircle, X, Save, Settings } from 'lucide-react';
import api from '../../lib/api';
import BeltBadge from '../../components/shared/BeltBadge';

const MONTHS = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function FinancesPage() {
  const now = new Date();
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [year,       setYear]       = useState(now.getFullYear());
  const [summary,    setSummary]    = useState(null);
  const [debtors,    setDebtors]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [modal,      setModal]      = useState(false);
  const [students,   setStudents]   = useState([]);
  const [form,       setForm]       = useState({ student_id:'', amount:'', concept:'Mensalidade', month, year });
  const [saving,     setSaving]     = useState(false);
  const [tab,        setTab]        = useState('resumo');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeSaving,  setFeeSaving]  = useState(false);
  const [feeToast,   setFeeToast]   = useState('');

  useEffect(() => { fetchData(); }, [month, year]);
  useEffect(() => { if (modal) fetchStudents(); }, [modal]);
  useEffect(() => {
    api.get('/api/finances/settings')
      .then(({ data }) => { if (data.monthly_fee) setMonthlyFee(String(data.monthly_fee)); })
      .finally(() => setFeeLoading(false));
  }, []);

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
    const { data } = await api.get('/api/students');
    setStudents(data);
  }

  async function saveFee(e) {
    e.preventDefault();
    setFeeSaving(true);
    try {
      await api.put('/api/finances/settings', { monthly_fee: Number(monthlyFee) });
      setFeeToast('Mensalidade atualizada ✓');
      setTimeout(() => setFeeToast(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally { setFeeSaving(false); }
  }

  async function sendReminders() {
    if (!confirm(`Enviar lembrete por WhatsApp a ${debtors.length} devedores?`)) return;
    setSending(true);
    try {
      const { data } = await api.post('/api/payments/notify-debtors');
      alert(`Notificações enviadas: ${data.notified}`);
    } catch { alert('Erro ao enviar notificações'); }
    finally { setSending(false); }
  }

  async function registerPayment(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/payments/manual', { ...form, month, year });
      await fetchData();
      setModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar pagamento');
    } finally { setSaving(false); }
  }

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Finanças</h2>
          <p className="text-gray-400 text-sm">{MONTHS[month]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e=>setMonth(Number(e.target.value))}
            className="bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600">
            {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(Number(e.target.value))}
            className="bg-gray-900 border border-gray-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600">
            {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={()=>{setModal(true);setForm({student_id:'',amount:'',concept:'Mensalidade',month,year});}}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <PlusCircle size={16}/> Registrar pagamento
          </button>
        </div>
      </div>

      {/* Monthly fee setting */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Settings size={18} className="text-red-500"/> Valor da mensalidade
        </h3>
        {feeLoading ? (
          <p className="text-gray-500 text-sm">Carregando...</p>
        ) : (
          <form onSubmit={saveFee} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Valor (ARS)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={monthlyFee}
                  onChange={e => setMonthlyFee(e.target.value)}
                  placeholder="Ex: 15000"
                  min="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Este valor será pré-preenchido para os atletas no checkout</p>
            </div>
            <button type="submit" disabled={feeSaving || !monthlyFee}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
              <Save size={15}/> {feeSaving ? 'Salvando...' : 'Salvar valor'}
            </button>
          </form>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={CheckCircle} label="Arrecadado" color="bg-green-600"
              value={`$${Number(summary.totalCollected).toLocaleString('es-AR')}`}/>
            <StatCard icon={AlertCircle} label="Pendente" color="bg-yellow-600"
              value={`$${Number(summary.totalPending).toLocaleString('es-AR')}`}/>
            <StatCard icon={CheckCircle} label="Pagaram" color="bg-blue-600"
              value={summary.approved.length}/>
            <StatCard icon={AlertCircle} label="Devedores" color="bg-red-700"
              value={debtors.length}/>
          </div>

          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
            {[['resumo','Resumo'],['devedores','Devedores']].map(([key,label])=>(
              <button key={key} type="button" onClick={()=>setTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===key?'bg-gray-800 text-white':'text-gray-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'resumo' ? (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              {summary.all.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Nenhum pagamento registrado</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {['Atleta','Conceito','Valor','Status','Data'].map(h=>(
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
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            p.status==='approved'?'bg-green-900/40 text-green-400':
                            p.status==='pending' ?'bg-yellow-900/40 text-yellow-400':
                            'bg-red-900/40 text-red-400'}`}>
                            {p.status==='approved'?'Aprovado':p.status==='pending'?'Pendente':'Rejeitado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {debtors.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">
                  Todos os atletas estão em dia
                </div>
              ) : (
                <>
                  <button type="button" onClick={sendReminders} disabled={sending}
                    className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    <Send size={16}/> {sending?'Enviando...':'Enviar lembrete WhatsApp a todos'}
                  </button>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          {['Atleta','DNI','Faixa','Telefone'].map(h=>(
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
          )}
        </>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">Registrar pagamento manual</h3>
              <button type="button" onClick={()=>setModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={registerPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Atleta *</label>
                <select value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})}
                  className={INPUT} required>
                  <option value="">Selecionar...</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Conceito *</label>
                <input value={form.concept} onChange={e=>setForm({...form,concept:e.target.value})}
                  className={INPUT} required/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Valor (ARS) *</label>
                <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}
                  className={INPUT} placeholder="15000" required min="1"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                  <Save size={16}/> {saving?'Salvando...':'Registrar'}
                </button>
              </div>
            </form>
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
