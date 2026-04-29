import { Navigate } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalStateContext';

export const ProtectedRoute = ({ children }) => {
  const { user } = useGlobalState();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export const AdminRoute = ({ children }) => {
  const { user } = useGlobalState();
  if (!user || user.app_role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

export const ParentRoute = ({ children }) => {
  const { user } = useGlobalState();
  if (!user || user.app_role !== 'parent') return <Navigate to="/dashboard" replace />;
  return children;
};

export const TeacherRoute = ({ children }) => {
  const { user } = useGlobalState();
  if (!user || user.app_role !== 'teacher') return <Navigate to="/dashboard" replace />;
  return children;
};

export const TherapistRoute = ({ children }) => {
  const { user } = useGlobalState();
  if (!user || user.app_role !== 'therapist') return <Navigate to="/dashboard" replace />;
  return children;
};

export const RoleRoute = ({ allowedRoles, children }) => {
  const { user } = useGlobalState();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.app_role)) return <Navigate to="/dashboard" replace />;
  return children;
};