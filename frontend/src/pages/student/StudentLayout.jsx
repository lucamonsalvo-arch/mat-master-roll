import { Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, User, CreditCard } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';
import DashboardPage  from './DashboardPage';
import SchedulesPage  from './SchedulesPage';
import ProfilePage    from './ProfilePage';
import PaymentPage    from './PaymentPage';

const LINKS = [
  { to: '/alumno/dashboard', icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/alumno/horarios',  icon: CalendarDays,    label: 'Mis Horarios'   },
  { to: '/alumno/perfil',    icon: User,            label: 'Mi Perfil'      },
  { to: '/alumno/pago',      icon: CreditCard,      label: 'Mensualidad'    },
];

const TATAMI = `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='1' y='1' width='38' height='18' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='1' y='21' width='38' height='18' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='41' y='1' width='18' height='38' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='61' y='1' width='18' height='38' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='1' y='41' width='18' height='38' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='21' y='41' width='18' height='38' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='41' y='41' width='38' height='18' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='41' y='61' width='38' height='18' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3C/svg%3E")`;

export default function StudentLayout() {
  return (
    <div className="flex min-h-screen bg-gray-950 relative">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: TATAMI, backgroundSize: '80px 80px', backgroundRepeat: 'repeat' }}/>
      <Sidebar links={LINKS}/>
      <main className="flex-1 overflow-auto relative z-10">
        <Routes>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="horarios"  element={<SchedulesPage />} />
          <Route path="perfil"    element={<ProfilePage />}   />
          <Route path="pago"      element={<PaymentPage />}   />
          <Route path="*"         element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
