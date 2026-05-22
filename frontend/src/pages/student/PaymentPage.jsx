import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, Lock } from 'lucide-react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

const MONTHS = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function PaymentPage() {
  const user = getUser();
  const now  = new Date();
  const [payments,    setPayments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [paying,      setPaying]      = useState(false);
  const [amount,      setAmount]      = useState('');
  const [defaultFee,  setDefaultFee]  = useState(null);
  const [amountError, setAmountError] = useState('');

  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  const currentPaid = payments.some(p =>
    p.status === 'approved' &&
    p.month === currentMonth &&
    p.year  === currentYear
  );

  useEffect(() => {
    Promise.all([
      api.get('/api/payments'),
      api.get('/api/finances/settings'),
    ]).then(([paymentsRes, settingsRes]) => {
      setPayments(paymentsRes.data);
      if (settingsRes.data.monthly_fee) {
        setDefaultFee(settingsRes.data.monthly_fee);
        setAmount(String(settingsRes.data.monthly_fee));
      }
    }).finally(() => setLoading(false));
  }, []);

  async function handlePay(e) {
    e.preventDefault();
    setAmountError('');
    if (!amount || Number(amount) <= 0) {
      setAmountError('Ingresá un monto válido para continuar.');
      return;
    }
    setPaying(true);
    try {
      const { data } = await api.post('/api/payments/create-preference', {
        amount: Number(amount),
        concept: `Mensualidad ${MONTHS[currentMonth]} ${currentYear}`,
        month: currentMonth,
        year:  currentYear,
      });
      window.location.href = data.init_point;
    } catch (err) {
      setAmountError(err.response?.data?.error || 'Error al crear el pago');
      setPaying(false);
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const mpStatus  = urlParams.get('status') || urlParams.get('collection_status');

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-bold text-white">Mensualidad</h2>
        <p className="text-gray-400 text-sm">Checkout seguro via MercadoPago</p>
      </div>

      {mpStatus === 'approved' && (
        <div className="bg-green-900/30 border border-green-700 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-400 flex-shrink-0" size={22}/>
          <p className="text-green-300 font-medium">¡Pago aprobado! Tu mensualidad fue registrada.</p>
        </div>
      )}
      {(mpStatus === 'failure' || mpStatus === 'rejected') && (
        <div className="bg-red-900/30 border border-red-700 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={22}/>
          <p className="text-red-300 font-medium">El pago no pudo completarse. Intentá de nuevo.</p>
        </div>
      )}

      <div className={`rounded-2xl border p-5 ${currentPaid ? 'bg-green-900/20 border-green-800' : 'bg-yellow-900/20 border-yellow-800'}`}>
        <div className="flex items-center gap-3">
          {currentPaid
            ? <CheckCircle className="text-green-400" size={28}/>
            : <AlertCircle className="text-yellow-400" size={28}/>}
          <div>
            <p className="font-bold text-white">Mensualidad {MONTHS[currentMonth]} {currentYear}</p>
            <p className={`text-sm ${currentPaid ? 'text-green-400' : 'text-yellow-400'}`}>
              {currentPaid ? 'Al día ✓' : 'Pendiente de pago'}
            </p>
          </div>
        </div>
      </div>

      {!currentPaid && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-red-500"/> Pagar con MercadoPago
          </h3>
          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                Monto (ARS)
                {defaultFee && <Lock size={11} className="text-gray-500"/>}
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => { if (!defaultFee) { setAmount(e.target.value); setAmountError(''); } }}
                readOnly={!!defaultFee}
                placeholder="Ingresá el importe"
                min="1"
                className={`w-full bg-gray-800 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 ${
                  defaultFee ? 'border-gray-700 opacity-70 cursor-not-allowed' : 'border-gray-700'
                } ${amountError ? 'border-red-500' : ''}`}
              />
              {defaultFee
                ? <p className="text-xs text-gray-500 mt-1">Monto configurado por tu profesor</p>
                : <p className="text-xs text-gray-500 mt-1">Consultá el monto con tu profesor</p>
              }
              {amountError && <p className="text-xs text-red-400 mt-1">{amountError}</p>}
            </div>
            <button type="submit" disabled={paying}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
              <ExternalLink size={18}/>
              {paying ? 'Redirigiendo...' : 'Pagar con MercadoPago'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-4">Historial de pagos</h3>
        {loading ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : payments.length === 0 ? (
          <p className="text-gray-500 text-sm">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{p.concept}</p>
                  <p className="text-xs text-gray-500">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-AR') : 'Pendiente'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">${Number(p.amount).toLocaleString('es-AR')}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.status==='approved'?'bg-green-900/40 text-green-400':
                    p.status==='pending' ?'bg-yellow-900/40 text-yellow-400':
                    'bg-red-900/40 text-red-400'}`}>
                    {p.status==='approved'?'Aprobado':p.status==='pending'?'Pendiente':'Rechazado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
