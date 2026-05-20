import { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

export default function AccessPage() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/access?limit=100');
      setLogs(data);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Accesos</h2>
          <p className="text-gray-400 text-sm">Historial de ingresos al sistema</p>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <RefreshCw size={16}/> Actualizar
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay registros</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Usuario','DNI','Rol','Acción','Fecha y hora'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {logs.map(log=>(
                <tr key={log.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {log.users?.name?.[0] || '?'}
                      </div>
                      <span className="text-white font-medium">{log.users?.name || 'Desconocido'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-sm">{log.users?.dni || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      log.users?.role==='profesor'?'bg-red-900/40 text-red-400':'bg-blue-900/40 text-blue-400'}`}>
                      {log.users?.role || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <ShieldCheck size={14} className="text-green-500"/>
                      <span className="text-gray-300">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {new Date(log.created_at).toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
