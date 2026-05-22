import { Routes, Route, Navigate } from 'react-router-dom';
import { Users, CalendarDays, LayoutGrid, DollarSign, ShieldCheck } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';
import StudentsPage from './StudentsPage';
import ClassesPage from './ClassesPage';
import SchedulesPage from './SchedulesPage';
import FinancesPage from './FinancesPage';
import AccessPage from './AccessPage';

const LINKS = [
  { to: '/profesor/alumnos',   icon: Users,        label: 'Atletas'   },
  { to: '/profesor/clases',    icon: LayoutGrid,   label: 'Clases'    },
  { to: '/profesor/horarios',  icon: CalendarDays, label: 'Horarios'  },
  { to: '/profesor/finanzas',  icon: DollarSign,   label: 'Finanzas'  },
  { to: '/profesor/accesos',   icon: ShieldCheck,  label: 'Accesos'   },
];

const TATAMI = `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='1' y='1' width='38' height='18' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='1' y='21' width='38' height='18' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='41' y='1' width='18' height='38' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='61' y='1' width='18' height='38' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='1' y='41' width='18' height='38' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='21' y='41' width='18' height='38' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='41' y='41' width='38' height='18' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3Crect x='41' y='61' width='38' height='18' fill='none' stroke='%23ffffff' stroke-width='0.9'/%3E%3C/svg%3E")`;

export default function ProfessorLayout() {
  return (
    <div className="flex min-h-screen bg-gray-950 relative">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: TATAMI, backgroundSize: '80px 80px', backgroundRepeat: 'repeat' }}/>
      <Sidebar links={LINKS} />
      <main className="flex-1 overflow-auto relative z-10">
        <Routes>
          <Route path="alumnos"  element={<StudentsPage />} />
          <Route path="clases"   element={<ClassesPage />} />
          <Route path="horarios" element={<SchedulesPage />} />
          <Route path="finanzas" element={<FinancesPage />} />
          <Route path="accesos"  element={<AccessPage />} />
          <Route path="*"        element={<Navigate to="alumnos" replace />} />
        </Routes>
      </main>
    </div>
  );
}
