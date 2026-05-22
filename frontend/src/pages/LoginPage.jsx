import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { setAuth } from '../lib/auth';

export default function LoginPage() {
  const [dni, setDni]       = useState('');
  const [pin, setPin]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { dni, pin });
      setAuth(data.token, data.user);
      navigate(data.user.role === 'profesor' ? '/profesor' : '/alumno', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Tatami pattern */}
      <div className="absolute inset-0 opacity-[0.12]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='80' height='40' fill='none' stroke='%23fff' stroke-width='0.8'/%3E%3Crect y='40' width='80' height='40' fill='none' stroke='%23fff' stroke-width='0.8'/%3E%3Cline x1='0' y1='20' x2='40' y2='20' stroke='%23fff' stroke-width='0.4'/%3E%3Cline x1='40' y1='0' x2='40' y2='40' stroke='%23fff' stroke-width='0.4'/%3E%3Cline x1='40' y1='60' x2='80' y2='60' stroke='%23fff' stroke-width='0.4'/%3E%3Cline x1='40' y1='40' x2='40' y2='80' stroke='%23fff' stroke-width='0.4'/%3E%3C/svg%3E")`,
        backgroundSize: '80px 80px',
      }} />
      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-2xl mb-4 shadow-lg shadow-red-900/50">
            <span className="text-4xl">🥋</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Mat Master Roll</h1>
          <p className="text-gray-400 mt-1 text-sm">Academia de Jiu Jitsu</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">DNI</label>
            <input
              type="text"
              value={dni}
              onChange={e => setDni(e.target.value)}
              placeholder="Ingresá tu DNI"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">PIN (4 dígitos)</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value.slice(0, 4))}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition tracking-widest text-center text-2xl"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || dni.length < 3 || pin.length !== 4}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-lg"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );

}
