import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ScheduleCalendar from './pages/ScheduleCalendar/ScheduleCalendar';
import Directory from './pages/Directory';
import ProfilePage from './pages/ProfilePage';
import Rooms from './pages/Rooms';
import Login from './pages/Login';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Settings from './pages/Settings';
import ParentDashboard from './pages/parent/ParentDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TherapistDashboard from './pages/therapist/TherapistDashboard';
import UserManagement from './pages/admin/UserManagement';
import SessionNotes from './pages/therapist/SessionNotes';
import { ProtectedRoute, SuperAdminRoute, RoleRoute, ParentRoute, TeacherRoute, TherapistRoute } from './components/RouteGuards';
import { useGlobalState } from './context/GlobalStateContext';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import clsx from 'clsx';


function App() {
  const { darkMode, loading, toast, notify } = useGlobalState();

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
      <div className="fixed inset-0 bg-ps-bg flex flex-col items-center justify-center z-[9999] p-4 text-center">
        <div className="w-16 h-16 border-4 border-ps-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-ps-ink-2 font-medium">Initializing PoliSync...</p>
        {showSkipButton && (
          <button
            type="button"
            onClick={() => setSkipLoading(true)}
            className="mt-6 text-xs font-semibold text-ps-primary hover:underline px-3.5 py-2 rounded-lg border border-ps-border bg-ps-surface shadow-xs transition-colors"
          >
            Taking longer than expected? Tap to continue
          </button>
        )}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin/users" element={<SuperAdminRoute><UserManagement /></SuperAdminRoute>} />
          <Route path="therapist/notes" element={<TherapistRoute><SessionNotes /></TherapistRoute>} />
          <Route path="schedule" element={<RoleRoute allowedRoles={['admin']}><ScheduleCalendar /></RoleRoute>} />
          <Route path="directory" element={<RoleRoute allowedRoles={['admin']}><Directory /></RoleRoute>} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="rooms" element={<RoleRoute allowedRoles={['admin']}><Rooms /></RoleRoute>} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={clsx(
              "fixed bottom-6 right-6 z-[10000] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-sm border",
              toast.type === 'error' && "bg-ps-danger/10 border-ps-danger/20 text-ps-danger",
              toast.type === 'success' && "bg-ps-success/10 border-ps-success/20 text-ps-success",
              toast.type === 'info' && "bg-ps-accent-soft border-ps-accent/20 text-ps-accent"
            )}
          >
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            {toast.type === 'info' && <Info size={20} />}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => notify(null)}
              className="ml-2 p-1 hover:bg-ps-bg rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </Router>
    </MotionConfig>
  );
}

export default App;