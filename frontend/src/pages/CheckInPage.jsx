import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../lib/api';
import { getUser } from '../lib/auth';

export default function CheckInPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const user       = getUser();
  const schedule_id = params.get('s');
  const class_date  = params.get('d');

  const [status,    setStatus]    = useState('loading'); // loading | success | already | error
  const [message,   setMessage]   = useState('');
  const [className, setClassName] = useState('');

  useEffect(() => {
    if (!schedule_id || !class_date) {
      setStatus('error');
      setMessage('QR inválido — faltan datos de la clase');
      return;
    }
    if (!user) {
      localStorage.setItem('mmr-checkin', JSON.stringify({ schedule_id, class_date }));
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== 'alumno') {
      setStatus('error');
      setMessage('Solo los alumnos pueden registrar su presencia por QR');
      return;
    }
    doCheckIn();
  }, []);

  async function doCheckIn() {
    try {
      const { data } = await api.post('/api/attendance/checkin', { schedule_id, class_date });
      setClassName(data.schedule?.class_types?.name || 'Clase');
      setStatus(data.already_checked_in ? 'already' : 'success');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Error al registrar presencia');
    }
  }

  const dateLabel = class_date
    ? new Date(class_date + 'T12:00').toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'long' })
    : '';

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center space-y-6">
        <img src="/logo.webp" alt="Mat Master Roll" className="w-20 h-20 mx-auto rounded-full shadow-lg"/>

        {status === 'loading' && (
          <>
            <Loader size={48} className="mx-auto text-red-500 animate-spin"/>
            <p className="text-gray-400">Registrando presencia...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={72} className="mx-auto text-green-400"/>
            <div>
              <h2 className="text-2xl font-black text-white">¡Presencia registrada!</h2>
              <p className="text-red-400 font-semibold mt-1">{className}</p>
              <p className="text-gray-500 text-sm mt-1 capitalize">{dateLabel}</p>
            </div>
            <p className="text-3xl">🤙</p>
            <Link to="/alumno/dashboard"
              className="block w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors">
              Ir al dashboard
            </Link>
          </>
        )}

        {status === 'already' && (
          <>
            <CheckCircle size={72} className="mx-auto text-yellow-400"/>
            <div>
              <h2 className="text-2xl font-black text-white">Ya registraste tu presencia</h2>
              <p className="text-red-400 font-semibold mt-1">{className}</p>
              <p className="text-gray-500 text-sm mt-1 capitalize">{dateLabel}</p>
            </div>
            <p className="text-yellow-400 text-sm">Ya fuiste marcado para esta clase</p>
            <Link to="/alumno/dashboard"
              className="block w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors">
              Ir al dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={72} className="mx-auto text-red-500"/>
            <div>
              <h2 className="text-2xl font-black text-white">Error</h2>
              <p className="text-gray-400 mt-1 text-sm">{message}</p>
            </div>
            <Link to="/alumno"
              className="block w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors">
              Volver
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
