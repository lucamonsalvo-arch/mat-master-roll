import { Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, User, CreditCard } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';
import DashboardPage  from './DashboardPage';
import SchedulesPage  from './SchedulesPage';
import ProfilePage    from './ProfilePage';
import PaymentPage    from './PaymentPage';

const LINKS = [
  { to: '/alumno/dashboard', icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/alumno/horarios',  icon: CalendarDays,    label: 'Meus Horários'  },
  { to: '/alumno/perfil',    icon: User,            label: 'Meu Perfil'     },
  { to: '/alumno/pago',      icon: CreditCard,      label: 'Mensalidade'    },
];

export default function StudentLayout() {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar links={LINKS}/>
      <main className="flex-1 overflow-auto">
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
