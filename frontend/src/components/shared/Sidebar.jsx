import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { clearAuth, getUser } from '../../lib/auth';

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}
function applyTheme(dark) {
  if (dark) document.documentElement.classList.add('dark');
  else       document.documentElement.classList.remove('dark');
  try { localStorage.setItem('mmr-theme', dark ? 'dark' : 'light'); } catch {}
}

export default function Sidebar({ links }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = getUser();
  const [open,   setOpen]   = useState(false);
  const [dark,   setDark]   = useState(isDarkMode);

  function toggleTheme() {
    const next = !dark;
    applyTheme(next);
    setDark(next);
  }

  // Close drawer on route change (mobile)
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function logout() {
    clearAuth();
    navigate('/login');
  }

  const navContent = (
    <>
      {/* Header */}
      <div className="p-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="Logo" className="w-10 h-10 rounded-xl flex-shrink-0 object-cover"/>
          <div>
            <h1 className="font-black text-white text-sm leading-tight">Mat Master Roll</h1>
            <p className="text-gray-500 text-xs">{user?.role === 'profesor' ? 'Profesor' : 'Atleta'}</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setOpen(false)} className="md:hidden text-gray-400 hover:text-white p-1">
          <X size={20}/>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18}/>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">DNI {user?.dni}</p>
          </div>
        </div>
        <div className="flex gap-2 mb-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors flex-1"
            title={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun size={15}/> : <Moon size={15}/>}
            {dark ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-xl transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-gray-900 border-r border-gray-800 flex-col min-h-screen flex-shrink-0">
        {navContent}
      </aside>

      {/* ── Mobile: top bar + drawer ─────────────────────────── */}
      <div className="md:hidden">
        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 bg-gray-900 border-b border-gray-800 px-4 h-14">
          <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-white p-1">
            <Menu size={22}/>
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.webp" alt="Logo" className="w-7 h-7 rounded-lg object-cover flex-shrink-0"/>
            <span className="font-black text-white text-sm">Mat Master Roll</span>
          </div>
        </div>

        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Drawer */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-72 bg-gray-900 border-r border-gray-800 flex flex-col
            transition-transform duration-300 ease-in-out
            ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {navContent}
        </aside>
      </div>
    </>
  );
}
