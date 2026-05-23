import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './lib/auth';
import LoginPage from './pages/LoginPage';
import ProfessorLayout from './pages/professor/ProfessorLayout';
import StudentLayout from './pages/student/StudentLayout';
import CheckInPage from './pages/CheckInPage';

function PrivateRoute({ children, role }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'profesor' ? '/profesor' : '/alumno'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profesor/*" element={
          <PrivateRoute role="profesor"><ProfessorLayout /></PrivateRoute>
        } />
        <Route path="/alumno/*" element={
          <PrivateRoute role="alumno"><StudentLayout /></PrivateRoute>
        } />
        <Route path="/check-in" element={<CheckInPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
