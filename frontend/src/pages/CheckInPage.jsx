import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { getUser } from '../lib/auth';

export default function CheckInPage() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const user        = getUser();
  const schedule_id = params.get('s');
  const class_date  = params.get('d');

  const [status,    setStatus]    = useState('loading');
  const [message,   setMessage]   = useState('');
  const [className, setClassName] = useState('');
  const [color,     setColor]     = useState('#ef4444');

  useEffect(() => {
    if (!schedule_id || !class_date) {
      setStatus('error');
      setMessage('QR inválido');
      return;
    }
    if (!user) {
      localStorage.setItem('mmr-checkin', JSON.stringify({ schedule_id, class_date }));
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== 'alumno') {
      setStatus('error');
      setMessage('Solo los alumnos pueden hacer check-in');
      return;
    }
    doCheckIn();
  }, []);

  async function doCheckIn() {
    try {
      const { data } = await api.post('/api/attendance/checkin', { schedule_id, class_date });
      setClassName(data.schedule?.class_types?.name || 'Clase');
      setColor(data.schedule?.class_types?.color || '#ef4444');
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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow based on status */}
      {status === 'success' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.12) 0%, transparent 70%)'
        }}/>
      )}
      {status === 'already' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, rgba(234,179,8,0.10) 0%, transparent 70%)'
        }}/>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.10) 0%, transparent 70%)'
        }}/>
      )}

      <div className="w-full max-w-xs text-center space-y-8 relative z-10">

        <img src="/logo.webp" alt="Mat Master Roll" className="w-16 h-16 mx-auto rounded-full opacity-80"/>

        {status === 'loading' && (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full border-4 border-gray-800 border-t-red-500 animate-spin"/>
            <p className="text-gray-400 text-lg">Registrando...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            {/* Big check */}
            <div className="w-28 h-28 mx-auto rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <div>
              <p className="text-gray-400 text-sm uppercase tracking-widest font-semibold mb-2">Presencia registrada</p>
              <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white mb-2"
                style={{backgroundColor: color + '33', border: `1px solid ${color}66`, color}}>
                {className}
              </div>
              <p className="text-gray-500 text-sm capitalize">{dateLabel}</p>
            </div>

            <p className="text-5xl">🤙</p>

            <Link to="/alumno/dashboard"
              className="block w-full bg-red-600 active:bg-red-700 text-white font-bold py-4 rounded-2xl text-lg transition-colors">
              Ver mi dashboard
            </Link>
          </div>
        )}

        {status === 'already' && (
          <div className="space-y-6">
            <div className="w-28 h-28 mx-auto rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <div>
              <p className="text-gray-400 text-sm uppercase tracking-widest font-semibold mb-2">Ya registrado</p>
              <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-2"
                style={{backgroundColor: color + '33', border: `1px solid ${color}66`, color}}>
                {className}
              </div>
              <p className="text-gray-500 text-sm capitalize">{dateLabel}</p>
            </div>

            <p className="text-yellow-400 text-sm">Tu presencia ya estaba registrada para esta clase</p>

            <Link to="/alumno/dashboard"
              className="block w-full bg-gray-800 active:bg-gray-700 text-white font-bold py-4 rounded-2xl text-lg transition-colors">
              Ver mi dashboard
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-28 h-28 mx-auto rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>

            <div>
              <p className="text-white font-bold text-xl mb-2">Error</p>
              <p className="text-gray-400 text-sm">{message}</p>
            </div>

            <Link to="/alumno"
              className="block w-full bg-gray-800 active:bg-gray-700 text-white font-bold py-4 rounded-2xl text-lg transition-colors">
              Volver
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
