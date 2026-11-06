import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ScheduleCalendar from './pages/ScheduleCalendar/ScheduleCalendar';
import Directory from './pages/Directory';
import ProfilePage from './pages/ProfilePage';
import Rooms from './pages/Rooms/Rooms';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Settings from './pages/Settings';
import ParentDashboard from './pages/parent/ParentDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TherapistDashboard from './pages/therapist/TherapistDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuditPage from './pages/admin/AuditPage';
import ConfigPage from './pages/admin/ConfigPage';
import HealthPage from './pages/admin/HealthPage';
import ReportsPage from './pages/admin/ReportsPage';
import AiProviderPage from './pages/admin/AiProviderPage';
import PlannerPage from './pages/admin/PlannerPage';
import AssistantPage from './pages/assistant/AssistantPage';
import SessionNotes from './pages/therapist/SessionNotes';
import { ProtectedRoute, SuperAdminRoute, RoleRoute, ParentRoute, TeacherRoute, TherapistRoute } from './components/RouteGuards';
import { useGlobalState } from './context/GlobalStateContext';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';


// One toast chrome for every role and page: portaled on <body>, so it carries
// its own scope class. Status is carried by `data-tone` (itWorkspace.css).
function ToastViewport() {
  const { toast, notify } = useGlobalState();

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          data-tone={toast.type}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className="fixed bottom-6 right-6 z-[10000] flex items-center gap-3 px-5 py-4 itx-scope itx-toast"
        >
          {toast.type === 'error' && <AlertCircle size={20} />}
          {toast.type === 'success' && <CheckCircle2 size={20} />}
          {toast.type === 'info' && <Info size={20} />}
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => notify(null)}
            aria-label="Dismiss notification"
            className="ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center text-[var(--ink-muted)] transition-colors hover:text-[var(--ink-primary)]"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function App() {
  const { darkMode, loading } = useGlobalState();

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const [skipLoading, setSkipLoading] = React.useState(false);
  const [showSkipButton, setShowSkipButton] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSkipButton(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading && !skipLoading) {
    return (
      <div className="itx-scope fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-ps-bg p-4 text-center">
        <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-ps-accent border-t-transparent" />
        <p className="text-ps-ink-2">Initializing PoliSync...</p>
        {showSkipButton && (
          <>
            <p className="mt-6 text-[12px] text-ps-ink-2">Taking longer than expected?</p>
            <button
              type="button"
              onClick={() => setSkipLoading(true)}
              className="sa-btn mt-3"
            >
              Continue
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/:role" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin/users" element={<SuperAdminRoute><UserManagement /></SuperAdminRoute>} />
          <Route path="admin/audit" element={<SuperAdminRoute><AuditPage /></SuperAdminRoute>} />
          <Route path="admin/config" element={<SuperAdminRoute><ConfigPage /></SuperAdminRoute>} />
          <Route path="admin/health" element={<SuperAdminRoute><HealthPage /></SuperAdminRoute>} />
          <Route path="admin/reports" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ReportsPage /></RoleRoute>} />
          <Route path="admin/ai" element={<SuperAdminRoute><AiProviderPage /></SuperAdminRoute>} />
          <Route path="assistant" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><AssistantPage /></RoleRoute>} />
          <Route path="therapist/notes" element={<TherapistRoute><SessionNotes /></TherapistRoute>} />
          <Route path="schedule" element={<RoleRoute allowedRoles={['admin']}><ScheduleCalendar /></RoleRoute>} />
          <Route path="planner" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><PlannerPage /></RoleRoute>} />
          <Route path="directory" element={<RoleRoute allowedRoles={['admin']}><Directory /></RoleRoute>} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="rooms" element={<RoleRoute allowedRoles={['admin']}><Rooms /></RoleRoute>} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <ToastViewport />
      </Router>
    </MotionConfig>
  );
}

export default App;
