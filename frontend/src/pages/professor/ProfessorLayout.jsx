import { Routes, Route, Navigate } from 'react-router-dom';
import { Users, CalendarDays, LayoutGrid, DollarSign, ShieldCheck } from 'lucide-react';
import Sidebar from '../../components/shared/Sidebar';
import StudentsPage from './StudentsPage';
import ClassesPage from './ClassesPage';
import SchedulesPage from './SchedulesPage';
import FinancesPage from './FinancesPage';
import AccessPage from './AccessPage';

const LINKS = [
  { to: '/profesor/alumnos',   icon: Users,        label: 'Alumnos'  },
  { to: '/profesor/clases',    icon: LayoutGrid,   label: 'Clases'   },
  { to: '/profesor/horarios',  icon: CalendarDays, label: 'Horarios' },
  { to: '/profesor/finanzas',  icon: DollarSign,   label: 'Finanzas' },
  { to: '/profesor/accesos',   icon: ShieldCheck,  label: 'Accesos'  },
];

export default function ProfessorLayout() {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar links={LINKS} />
      <main className="flex-1 overflow-auto">
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
